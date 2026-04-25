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
