function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Podium Assistant')
    .addItem('Open sidebar', 'openSidebar')
    .addSeparator()
    .addItem('Set up workbook', 'setupWorkbook')
    .addToUi();
}

function openSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('Podium Assistant');
  SpreadsheetApp.getUi().showSidebar(html);
}
