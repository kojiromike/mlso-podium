const TAB_NAMES = ['Seasons', 'Programs', 'Concerts', 'Rehearsals', 'Venues', 'Pieces', 'People'];

const TOOLS = [
  {
    name: 'read_workbook',
    description:
      'Read all data tabs of the current workbook. Returns each tab ' +
      '(Seasons, Programs, Concerts, Rehearsals, Venues, Pieces, People) ' +
      'as an array of row objects keyed by column name.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'search_daniels',
    description:
      'Search Daniels Orchestral Music Online for works by composer ' +
      'name and/or work title. Returns matching works with their Daniels ' +
      'Work IDs and movement lists. Call this before proposing a Pieces ' +
      'row so you can populate daniels_id and instrumentation from the ' +
      'canonical source. At least one of composer or work is required; ' +
      'partial matches are supported.',
    input_schema: {
      type: 'object',
      properties: {
        composer: { type: 'string', description: 'Composer name or partial name.' },
        work: { type: 'string', description: 'Work title or partial title.' },
      },
    },
  },
  {
    name: 'read_daniels',
    description:
      'Fetch the full Daniels record for a single Work ID, including ' +
      'instrumentation formula, duration, composer details, ensemble ' +
      'breakdown, and movement list. Use after search_daniels narrows ' +
      'to one work.',
    input_schema: {
      type: 'object',
      properties: {
        work_id: { type: 'string', description: 'Daniels Work ID from search_daniels.' },
      },
      required: ['work_id'],
    },
  },
  {
    name: 'propose_writes',
    description:
      'Propose a batch of inserts/updates/deletes to the workbook. Hard ' +
      'validators run; if they pass, the user sees a diff in the sidebar ' +
      'and approves. If they fail, the tool returns the errors so you can ' +
      'fix the proposal and try again. Bundle related changes in one call ' +
      '(e.g., a season + its three programs). Use only the columns defined ' +
      'in the schema; unknown fields are rejected. PKs are required on ' +
      'insert and must be unique. FKs must point at existing or earlier-in-' +
      'this-batch rows.',
    input_schema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              op: { type: 'string', enum: ['insert', 'update', 'delete'] },
              tab: { type: 'string', enum: TAB_NAMES },
              row: {
                type: 'object',
                description:
                  'For insert: the full row keyed by column name (PK required). ' +
                  'For update: only the columns to change. Omit for delete.',
              },
              pk: {
                type: 'string',
                description: 'Required for update and delete; identifies the row.',
              },
            },
            required: ['op', 'tab'],
          },
        },
      },
      required: ['operations'],
    },
  },
];

function runTool_(name, input) {
  if (name === 'read_workbook') return readWorkbook_();
  if (name === 'search_daniels') return searchDaniels_(input);
  if (name === 'read_daniels') return readDaniels_(input);
  if (name === 'propose_writes') return proposeWrites_(input);
  throw new Error('Unknown tool: ' + name);
}

function readWorkbook_() {
  const ss = SpreadsheetApp.getActive();
  const tz = Session.getScriptTimeZone();
  const out = {};
  Object.keys(SCHEMA).forEach(function (tabName) {
    const sheet = ss.getSheetByName(tabName);
    const cols = SCHEMA[tabName];
    if (!sheet || sheet.getLastRow() < 2) {
      out[tabName] = [];
      return;
    }
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols.length).getValues();
    out[tabName] = values
      .filter(function (row) {
        return row.some(function (c) { return c !== '' && c !== null; });
      })
      .map(function (row) {
        const obj = {};
        cols.forEach(function (col, i) {
          obj[col] = formatCell_(row[i], col, tz);
        });
        return obj;
      });
  });
  return JSON.stringify(out);
}

function formatCell_(value, colName, tz) {
  if (value === '' || value === null || value === undefined) return null;
  if (value instanceof Date) {
    const isTime = colName.indexOf('time') !== -1 || colName === 'downbeat';
    return Utilities.formatDate(value, tz, isTime ? 'HH:mm' : 'yyyy-MM-dd');
  }
  return value;
}
