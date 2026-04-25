const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_MAX_TOKENS = 1024;
const TOOL_LOOP_LIMIT = 8;

// Server endpoint called by the sidebar. Returns { reply, history } so
// the client can store the full block-aware history (assistant turns
// and tool-result turns may be content-block arrays, not strings) and
// replay it on the next user turn.
function sendMessage(history) {
  let messages = history.slice();
  for (let i = 0; i < TOOL_LOOP_LIMIT; i++) {
    const data = callAnthropic_(messages);
    const blocks = data.content || [];
    messages.push({ role: 'assistant', content: blocks });
    if (data.stop_reason !== 'tool_use') {
      return { reply: extractText_(data), history: messages };
    }
    const toolUses = blocks.filter(function (b) { return b.type === 'tool_use'; });
    const toolResults = toolUses.map(function (b, idx) {
      let content;
      let isError = false;
      try {
        content = runTool_(b.name, b.input);
      } catch (e) {
        content = String((e && e.message) || e);
        isError = true;
      }
      const block = {
        type: 'tool_result',
        tool_use_id: b.id,
        content: content,
      };
      if (isError) block.is_error = true;
      if (idx === toolUses.length - 1) {
        block.cache_control = { type: 'ephemeral' };
      }
      return block;
    });
    messages.push({ role: 'user', content: toolResults });
  }
  throw new Error('Tool loop exceeded ' + TOOL_LOOP_LIMIT + ' iterations.');
}

function callAnthropic_(messages) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it under Project Settings → Script Properties.');
  }
  const payload = {
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    tools: TOOLS,
    messages: messages,
  };
  const response = UrlFetchApp.fetch(ANTHROPIC_API_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code !== 200) {
    throw new Error('Anthropic API error ' + code + ': ' + body);
  }
  return JSON.parse(body);
}

function extractText_(data) {
  const blocks = (data && data.content) || [];
  return blocks
    .filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; })
    .join('\n')
    .trim();
}
