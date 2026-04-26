// Daniels' Orchestral Music Online API client.
// Spec: https://api.daniels-orchestral.com/doc/domo.json
// Auth: userId + token are passed as request HEADERS, not query params.

const DANIELS_BASE_URL = 'https://api.daniels-orchestral.com/v4';

function searchDaniels_(input) {
  const composer = input && input.composer;
  const work = input && input.work;
  if (!composer && !work) {
    return { text: 'Provide at least one of composer or work.', isError: true };
  }
  const headers = danielsAuthHeaders_();
  if (composer) headers.composer = composer;
  if (work) headers.work = work;
  return danielsRequest_('/search', headers, 'search');
}

function readDaniels_(input) {
  const workId = input && input.work_id;
  if (!workId) {
    return { text: 'work_id is required.', isError: true };
  }
  const headers = danielsAuthHeaders_();
  headers.work = String(workId);
  return danielsRequest_('/fetch', headers, 'fetch');
}

function danielsRequest_(path, headers, label) {
  const response = UrlFetchApp.fetch(DANIELS_BASE_URL + path, {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true,
  });
  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code !== 200) {
    return { text: 'Daniels ' + label + ' failed (' + code + '): ' + body, isError: true };
  }
  return body;
}

// Run from the Apps Script editor (Run → testDaniels) to see the raw
// auth headers, response code, and body. Helpful when search returns
// empty and you can't tell whether it's auth, query, or coverage.
function testDaniels() {
  const props = PropertiesService.getScriptProperties();
  const userId = props.getProperty('DANIELS_USER_ID');
  const token = props.getProperty('DANIELS_TOKEN');
  Logger.log('userId len ' + (userId ? userId.length : 0) + ', token len ' + (token ? token.length : 0));

  const cases = [
    { label: 'baseline composer=Bruch', headers: { userId: userId, token: token, composer: 'Bruch' } },
    { label: 'composer=Bruch, Max', headers: { userId: userId, token: token, composer: 'Bruch, Max' } },
    { label: 'composer=Mozart', headers: { userId: userId, token: token, composer: 'Mozart' } },
    { label: 'work=Symphony', headers: { userId: userId, token: token, work: 'Symphony' } },
    { label: 'BAD token (control)', headers: { userId: userId, token: 'definitely-wrong', composer: 'Bruch' } },
    { label: 'lowercase userid/token', headers: { userid: userId, token: token, composer: 'Bruch' } },
    { label: 'fetch work_id=1', path: '/fetch', headers: { userId: userId, token: token, work: '1' } },
  ];

  cases.forEach(function (c) {
    const path = c.path || '/search';
    const response = UrlFetchApp.fetch(DANIELS_BASE_URL + path, {
      method: 'get',
      headers: c.headers,
      muteHttpExceptions: true,
    });
    const body = response.getContentText();
    Logger.log(c.label + ' → ' + response.getResponseCode() +
      ' | type=' + response.getHeaders()['Content-Type'] +
      ' | bodyLen=' + body.length +
      ' | body[0..200]=' + body.slice(0, 200));
  });
}

function danielsAuthHeaders_() {
  const props = PropertiesService.getScriptProperties();
  const userId = props.getProperty('DANIELS_USER_ID');
  const token = props.getProperty('DANIELS_TOKEN');
  if (!userId || !token) {
    throw new Error('DANIELS_USER_ID / DANIELS_TOKEN not set in Script Properties.');
  }
  return { userId: userId, token: token };
}
