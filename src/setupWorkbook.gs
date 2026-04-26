// Workbook bootstrap: creates the v0 tabs, sets headers, seeds the
// known venues, and trims default empty rows that bloat the sheet.
// Idempotent — safe to re-run.
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

const SEED_VENUES = [
  ['vfms', 'Valley Forge Middle School', '105 W Walker Rd, Wayne, PA 19087', ''],
  ['bmpc', 'Bryn Mawr Presbyterian Church', '625 Montgomery Ave, Bryn Mawr, PA 19010', ''],
  ['ki', 'Reform Congregation Keneseth Israel', '8339 Old York Rd, Elkins Park, PA 19027', ''],
];

function setupWorkbook() {
  const ss = SpreadsheetApp.getActive();
  ensureDataTabs_(ss);
  applyValidationsToExistingRows_(ss);
  seedVenues_(ss);
  removeDefaultSheet_(ss);
  removeLegacyLookupsSheet_(ss);
  SpreadsheetApp.getActive().toast('Workbook setup complete.', 'Podium', 5);
}

function ensureDataTabs_(ss) {
  Object.keys(SCHEMA).forEach(function (tabName) {
    const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
    const cols = SCHEMA[tabName];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
}

function applyValidationsToExistingRows_(ss) {
  Object.keys(SCHEMA).forEach(function (tabName) {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    for (let r = 2; r <= lastRow; r++) {
      applyRowValidations_(sheet, tabName, r);
    }
  });
}

function applyRowValidations_(sheet, tabName, rowNum) {
  const cols = SCHEMA[tabName];
  const enums = ENUM_FIELDS[tabName] || {};
  Object.keys(enums).forEach(function (field) {
    const ci = cols.indexOf(field);
    if (ci === -1) return;
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(enums[field], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(rowNum, ci + 1).setDataValidation(rule);
  });
  BOOL_COLS.forEach(function (field) {
    const ci = cols.indexOf(field);
    if (ci === -1) return;
    sheet.getRange(rowNum, ci + 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  });
}

function seedVenues_(ss) {
  const venues = ss.getSheetByName('Venues');
  const lastRow = venues.getLastRow();
  const existingIds = new Set();
  if (lastRow > 1) {
    venues.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function (r) {
      if (r[0]) existingIds.add(String(r[0]));
    });
  }
  const toAdd = SEED_VENUES.filter(function (v) { return !existingIds.has(v[0]); });
  if (toAdd.length) {
    venues.getRange(lastRow + 1, 1, toAdd.length, toAdd[0].length).setValues(toAdd);
  }
}

function removeDefaultSheet_(ss) {
  const sheet = ss.getSheetByName('Sheet1');
  if (sheet && ss.getSheets().length > 1) ss.deleteSheet(sheet);
}

// Earlier setup created a hidden Lookups sheet for range-based validation.
// We've moved to inline value lists, so the sheet is no longer needed.
function removeLegacyLookupsSheet_(ss) {
  const sheet = ss.getSheetByName('Lookups');
  if (sheet && ss.getSheets().length > 1) ss.deleteSheet(sheet);
}
