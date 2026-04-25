// Workbook bootstrap: creates the v0 tabs, headers, dropdowns, and seed
// venue rows defined in docs/schema.md. Idempotent — safe to re-run.
// Invoke from the Apps Script editor: Run → setupWorkbook.

const SCHEMA = {
  Seasons: ['season_id', 'label', 'notes'],
  Programs: ['program_id', 'season_id', 'slot', 'is_regular_season', 'theme', 'notes'],
  Concerts: ['concert_id', 'program_id', 'date', 'venue_id', 'call_time', 'downbeat', 'notes'],
  Rehearsals: ['rehearsal_id', 'program_id', 'date', 'venue_id', 'start_time', 'end_time', 'notes'],
  Venues: ['venue_id', 'name', 'address', 'notes'],
  Pieces: [
    'piece_id', 'program_id', 'slot_order', 'status', 'composer', 'title', 'movement',
    'runtime_min', 'daniels_id', 'daniels_match_confidence', 'instrumentation_summary',
    'instrumentation_source', 'soloist_id', 'placeholder_notes', 'notes',
  ],
  People: ['person_id', 'name', 'instrument', 'notes'],
};

const LOOKUPS = {
  'Pieces.status': ['tentative', 'confirmed', 'placeholder'],
  'Pieces.daniels_match_confidence': ['exact', 'fuzzy', 'manual', 'none'],
  'Pieces.instrumentation_source': ['daniels', 'manual', 'score', 'none'],
};

const SEED_VENUES = [
  ['vfms', 'Valley Forge Middle School', '105 W Walker Rd, Wayne, PA 19087', ''],
  ['bmpc', 'Bryn Mawr Presbyterian Church', '625 Montgomery Ave, Bryn Mawr, PA 19010', ''],
  ['ki', 'Reform Congregation Keneseth Israel', '8339 Old York Rd, Elkins Park, PA 19027', ''],
];

function setupWorkbook() {
  const ss = SpreadsheetApp.getActive();
  const lookups = ensureLookupsSheet_(ss);
  ensureDataTabs_(ss);
  applyValidations_(ss, lookups);
  seedVenues_(ss);
  removeDefaultSheet_(ss);
  SpreadsheetApp.getActive().toast('Workbook setup complete.', 'Podium', 5);
}

function ensureLookupsSheet_(ss) {
  const sheet = ss.getSheetByName('Lookups') || ss.insertSheet('Lookups');
  const keys = Object.keys(LOOKUPS);
  sheet.clear();
  sheet.getRange(1, 1, 1, keys.length).setValues([keys]).setFontWeight('bold');
  keys.forEach((key, i) => {
    const vals = LOOKUPS[key];
    sheet.getRange(2, i + 1, vals.length, 1).setValues(vals.map((v) => [v]));
  });
  sheet.hideSheet();
  return sheet;
}

function ensureDataTabs_(ss) {
  Object.keys(SCHEMA).forEach((tabName) => {
    const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
    const cols = SCHEMA[tabName];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
}

function applyValidations_(ss, lookups) {
  applyEnumValidation_(ss, lookups, 'Pieces', 'status', 'Pieces.status');
  applyEnumValidation_(ss, lookups, 'Pieces', 'daniels_match_confidence', 'Pieces.daniels_match_confidence');
  applyEnumValidation_(ss, lookups, 'Pieces', 'instrumentation_source', 'Pieces.instrumentation_source');

  const programs = ss.getSheetByName('Programs');
  const boolCol = SCHEMA.Programs.indexOf('is_regular_season') + 1;
  const boolRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  programs.getRange(2, boolCol, programs.getMaxRows() - 1, 1).setDataValidation(boolRule);
}

function applyEnumValidation_(ss, lookups, sheetName, colName, lookupKey) {
  const sheet = ss.getSheetByName(sheetName);
  const colIdx = SCHEMA[sheetName].indexOf(colName) + 1;
  const lookupCol = Object.keys(LOOKUPS).indexOf(lookupKey) + 1;
  const values = LOOKUPS[lookupKey];
  const range = lookups.getRange(2, lookupCol, values.length, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(range, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, colIdx, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
}

function seedVenues_(ss) {
  const venues = ss.getSheetByName('Venues');
  const lastRow = venues.getLastRow();
  const existingIds = new Set();
  if (lastRow > 1) {
    venues.getRange(2, 1, lastRow - 1, 1).getValues().forEach((r) => {
      if (r[0]) existingIds.add(String(r[0]));
    });
  }
  const toAdd = SEED_VENUES.filter((v) => !existingIds.has(v[0]));
  if (toAdd.length) {
    venues.getRange(lastRow + 1, 1, toAdd.length, toAdd[0].length).setValues(toAdd);
  }
}

function removeDefaultSheet_(ss) {
  const sheet = ss.getSheetByName('Sheet1');
  if (sheet && ss.getSheets().length > 1) ss.deleteSheet(sheet);
}
