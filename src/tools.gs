const TOOLS = [
  {
    name: 'read_workbook',
    description:
      'Read all data tabs of the current workbook. Returns each tab ' +
      '(Seasons, Programs, Concerts, Rehearsals, Venues, Pieces, People) ' +
      'as an array of row objects keyed by column name.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

function runTool_(name, input) {
  if (name === 'read_workbook') return readWorkbook_();
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
