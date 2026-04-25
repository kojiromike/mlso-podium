// Hard-validator metadata. Soft validators are deferred to v0.1 per
// docs/schema.md.

const REQUIRED_FIELDS = {
  Seasons: ['season_id', 'label'],
  Programs: ['program_id', 'season_id', 'slot', 'is_regular_season'],
  Concerts: ['concert_id', 'program_id'],
  Rehearsals: ['rehearsal_id', 'program_id'],
  Venues: ['venue_id', 'name'],
  Pieces: ['piece_id', 'program_id', 'status', 'composer', 'title'],
  People: ['person_id', 'name'],
};

const PK_COL = {
  Seasons: 'season_id',
  Programs: 'program_id',
  Concerts: 'concert_id',
  Rehearsals: 'rehearsal_id',
  Venues: 'venue_id',
  Pieces: 'piece_id',
  People: 'person_id',
};

const FK_REFS = {
  Programs: { season_id: 'Seasons' },
  Concerts: { program_id: 'Programs', venue_id: 'Venues' },
  Rehearsals: { program_id: 'Programs', venue_id: 'Venues' },
  Pieces: { program_id: 'Programs', soloist_id: 'People' },
};

const ENUM_FIELDS = {
  Pieces: {
    status: ['tentative', 'confirmed', 'placeholder'],
    daniels_match_confidence: ['exact', 'fuzzy', 'manual', 'none'],
    instrumentation_source: ['daniels', 'manual', 'score', 'none'],
  },
};

const DATE_COLS = ['date'];
const TIME_COLS = ['call_time', 'downbeat', 'start_time', 'end_time'];
const NUMBER_COLS = ['slot_order', 'runtime_min'];
const BOOL_COLS = ['is_regular_season'];

// Apply parents before children so FKs resolve mid-batch.
const APPLY_TAB_ORDER = ['Seasons', 'Venues', 'People', 'Programs', 'Concerts', 'Rehearsals', 'Pieces'];

function proposeWrites_(input) {
  const ops = (input && input.operations) || [];
  if (!Array.isArray(ops) || ops.length === 0) {
    return { text: 'operations must be a non-empty array', isError: true };
  }
  const errors = validateOperations_(ops);
  if (errors.length > 0) {
    return {
      text: 'Validation failed:\n' + errors.map(function (e) { return '- ' + e; }).join('\n'),
      isError: true,
    };
  }
  const proposal = {
    id: Utilities.getUuid(),
    operations: ops,
    summary: summarizeOps_(ops),
  };
  return {
    text: 'Proposal validated (' + proposal.summary + '). Awaiting user approval in the sidebar.',
    proposal: proposal,
  };
}

function validateOperations_(ops) {
  const errors = [];
  const ss = SpreadsheetApp.getActive();
  const pkByTab = loadExistingPks_(ss);

  ops.forEach(function (op, i) {
    const prefix = 'op[' + i + '] ';
    if (!op || !op.tab || !op.op) {
      errors.push(prefix + 'missing op or tab');
      return;
    }
    if (op.tab === 'Lookups') {
      errors.push(prefix + 'cannot edit Lookups (reference data)');
      return;
    }
    if (!SCHEMA[op.tab]) {
      errors.push(prefix + 'unknown tab: ' + op.tab);
      return;
    }
    const pkCol = PK_COL[op.tab];
    if (op.op === 'insert') {
      validateInsert_(prefix, op, pkCol, pkByTab, errors);
      const pk = (op.row || {})[pkCol];
      if (pk) pkByTab[op.tab].add(String(pk));
    } else if (op.op === 'update') {
      validateUpdate_(prefix, op, pkCol, pkByTab, errors);
    } else if (op.op === 'delete') {
      validateDelete_(prefix, op, pkCol, pkByTab, ss, errors);
      if (op.pk) pkByTab[op.tab].delete(String(op.pk));
    } else {
      errors.push(prefix + 'unknown op: ' + op.op);
    }
  });
  return errors;
}

function loadExistingPks_(ss) {
  const result = {};
  Object.keys(SCHEMA).forEach(function (tab) {
    result[tab] = new Set();
    const sheet = ss.getSheetByName(tab);
    if (!sheet || sheet.getLastRow() < 2) return;
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(function (r) {
      if (r[0]) result[tab].add(String(r[0]));
    });
  });
  return result;
}

function validateInsert_(prefix, op, pkCol, pkByTab, errors) {
  const row = op.row || {};
  const pk = row[pkCol];
  if (!pk) errors.push(prefix + 'missing PK ' + pkCol);
  else if (pkByTab[op.tab].has(String(pk))) {
    errors.push(prefix + 'duplicate ' + pkCol + ': ' + pk);
  }
  (REQUIRED_FIELDS[op.tab] || []).forEach(function (f) {
    if (row[f] === undefined || row[f] === null || row[f] === '') {
      errors.push(prefix + 'missing required field: ' + f);
    }
  });
  validateFields_(prefix, op.tab, row, pkByTab, errors);
}

function validateUpdate_(prefix, op, pkCol, pkByTab, errors) {
  if (!op.pk) {
    errors.push(prefix + 'missing pk');
    return;
  }
  if (!pkByTab[op.tab].has(String(op.pk))) {
    errors.push(prefix + pkCol + ' not found: ' + op.pk);
  }
  validateFields_(prefix, op.tab, op.row || {}, pkByTab, errors);
}

function validateDelete_(prefix, op, pkCol, pkByTab, ss, errors) {
  if (!op.pk) {
    errors.push(prefix + 'missing pk');
    return;
  }
  if (!pkByTab[op.tab].has(String(op.pk))) {
    errors.push(prefix + pkCol + ' not found: ' + op.pk);
    return;
  }
  const deps = findDependents_(op.tab, op.pk, ss);
  if (deps.length > 0) {
    errors.push(prefix + 'has ' + deps.length + ' dependent rows: ' +
      deps.map(function (d) { return d.tab + '.' + d.pk; }).join(', '));
  }
}

function validateFields_(prefix, tab, row, pkByTab, errors) {
  const cols = SCHEMA[tab];
  Object.keys(row).forEach(function (k) {
    if (cols.indexOf(k) === -1) {
      errors.push(prefix + 'unknown field: ' + tab + '.' + k);
    }
  });
  const enums = ENUM_FIELDS[tab] || {};
  Object.keys(enums).forEach(function (f) {
    const v = row[f];
    if (v != null && v !== '' && enums[f].indexOf(v) === -1) {
      errors.push(prefix + f + ' must be one of: ' + enums[f].join(', '));
    }
  });
  const fks = FK_REFS[tab] || {};
  Object.keys(fks).forEach(function (f) {
    const v = row[f];
    if (v == null || v === '') return;
    if (!pkByTab[fks[f]].has(String(v))) {
      errors.push(prefix + 'FK ' + f + ' -> ' + fks[f] + ' not found: ' + v);
    }
  });
  Object.keys(row).forEach(function (k) {
    const v = row[k];
    if (v == null || v === '') return;
    if (DATE_COLS.indexOf(k) !== -1 && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) {
      errors.push(prefix + k + ' must be YYYY-MM-DD');
    } else if (TIME_COLS.indexOf(k) !== -1 && !/^\d{2}:\d{2}$/.test(String(v))) {
      errors.push(prefix + k + ' must be HH:MM');
    } else if (NUMBER_COLS.indexOf(k) !== -1 && typeof v !== 'number' && isNaN(Number(v))) {
      errors.push(prefix + k + ' must be a number');
    } else if (BOOL_COLS.indexOf(k) !== -1 && typeof v !== 'boolean') {
      errors.push(prefix + k + ' must be true or false');
    }
  });
}

function findDependents_(tab, pk, ss) {
  const result = [];
  Object.keys(FK_REFS).forEach(function (childTab) {
    const fks = FK_REFS[childTab];
    Object.keys(fks).forEach(function (fkCol) {
      if (fks[fkCol] !== tab) return;
      const sheet = ss.getSheetByName(childTab);
      if (!sheet || sheet.getLastRow() < 2) return;
      const cols = SCHEMA[childTab];
      const fkIdx = cols.indexOf(fkCol);
      const pkIdx = cols.indexOf(PK_COL[childTab]);
      const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols.length).getValues();
      values.forEach(function (r) {
        if (String(r[fkIdx]) === String(pk)) {
          result.push({ tab: childTab, pk: r[pkIdx] });
        }
      });
    });
  });
  return result;
}

function summarizeOps_(ops) {
  const counts = {};
  ops.forEach(function (o) {
    const key = o.op + ' ' + o.tab;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).map(function (k) {
    return counts[k] + ' ' + k;
  }).join(', ');
}

// Server endpoint called by the sidebar Approve button.
function applyProposal(proposal) {
  const errors = validateOperations_(proposal.operations);
  if (errors.length > 0) {
    throw new Error('Re-validation failed at apply time: ' + errors.join('; '));
  }
  const ops = proposal.operations.slice().sort(function (a, b) {
    if (a.op === 'delete' && b.op !== 'delete') return 1;
    if (b.op === 'delete' && a.op !== 'delete') return -1;
    const pa = APPLY_TAB_ORDER.indexOf(a.tab);
    const pb = APPLY_TAB_ORDER.indexOf(b.tab);
    if (a.op === 'delete') return pb - pa;
    return pa - pb;
  });
  const ss = SpreadsheetApp.getActive();
  ops.forEach(function (op) {
    if (op.op === 'insert') applyInsert_(ss, op);
    else if (op.op === 'update') applyUpdate_(ss, op);
    else if (op.op === 'delete') applyDelete_(ss, op);
  });
  SpreadsheetApp.flush();
  return { applied: ops.length, summary: proposal.summary };
}

function applyInsert_(ss, op) {
  const sheet = ss.getSheetByName(op.tab);
  const cols = SCHEMA[op.tab];
  const row = cols.map(function (c) {
    const v = op.row[c];
    return v == null ? '' : v;
  });
  sheet.appendRow(row);
}

function applyUpdate_(ss, op) {
  const sheet = ss.getSheetByName(op.tab);
  const cols = SCHEMA[op.tab];
  const pkIdx = cols.indexOf(PK_COL[op.tab]);
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 1, lastRow - 1, cols.length).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][pkIdx]) === String(op.pk)) {
      const rowNum = i + 2;
      Object.keys(op.row || {}).forEach(function (k) {
        const ci = cols.indexOf(k);
        if (ci === -1) return;
        const v = op.row[k];
        sheet.getRange(rowNum, ci + 1).setValue(v == null ? '' : v);
      });
      return;
    }
  }
  throw new Error('Row not found for update: ' + op.tab + '.' + op.pk);
}

function applyDelete_(ss, op) {
  const sheet = ss.getSheetByName(op.tab);
  const cols = SCHEMA[op.tab];
  const pkIdx = cols.indexOf(PK_COL[op.tab]);
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 1, lastRow - 1, cols.length).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][pkIdx]) === String(op.pk)) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
  throw new Error('Row not found for delete: ' + op.tab + '.' + op.pk);
}
