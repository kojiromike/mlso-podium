const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_MAX_TOKENS = 2048;
const TOOL_LOOP_LIMIT = 8;

// Server endpoint called by the sidebar. Returns:
//   { reply, history, proposal? }
// where proposal, if present, is a pending validated batch awaiting
// user approval. The client passes history back unchanged on the next
// call so the model sees the full block-aware conversation including
// any tool exchanges.
function sendMessage(history) {
  return runChat_(history.slice());
}

// Sidebar Approve handler. Applies the proposal, then sends a synthetic
// user message so the model can react and offer next steps.
function approveProposal(proposal, history) {
  const result = applyProposal(proposal);
  const note = 'User approved proposal ' + proposal.id + '. ' +
    result.applied + ' operations applied (' + result.summary + ').';
  const msgs = history.slice();
  msgs.push({ role: 'user', content: note });
  return runChat_(msgs);
}

// Sidebar Reject handler. Drops the proposal and tells the model.
function rejectProposal(proposal, reason, history) {
  const note = 'User rejected proposal ' + proposal.id +
    (reason ? '. Reason: ' + reason : '. No reason given.');
  const msgs = history.slice();
  msgs.push({ role: 'user', content: note });
  return runChat_(msgs);
}

function runChat_(messages) {
  stripCacheControl_(messages);
  let pendingProposal = null;
  for (let i = 0; i < TOOL_LOOP_LIMIT; i++) {
    const data = callAnthropic_(messages);
    const blocks = data.content || [];
    messages.push({ role: 'assistant', content: blocks });
    if (data.stop_reason !== 'tool_use') {
      return { reply: extractText_(data), history: messages, proposal: pendingProposal };
    }
    const toolUses = blocks.filter(function (b) { return b.type === 'tool_use'; });
    stripCacheControl_(messages);
    const toolResults = toolUses.map(function (b, idx) {
      const r = runToolSafely_(b);
      if (r.proposal) pendingProposal = r.proposal;
      const block = { type: 'tool_result', tool_use_id: b.id, content: r.text };
      if (r.isError) block.is_error = true;
      if (idx === toolUses.length - 1) {
        block.cache_control = { type: 'ephemeral' };
      }
      return block;
    });
    messages.push({ role: 'user', content: toolResults });
  }
  throw new Error('Tool loop exceeded ' + TOOL_LOOP_LIMIT + ' iterations.');
}

// Anthropic allows max 4 cache_control blocks per request. We mark the
// system prompt and one tool_result per turn, so we strip stale markers
// from the message history before adding a new one to stay under the cap.
function stripCacheControl_(messages) {
  messages.forEach(function (m) {
    if (!Array.isArray(m.content)) return;
    m.content.forEach(function (b) {
      if (b && b.cache_control) delete b.cache_control;
    });
  });
}

function runToolSafely_(block) {
  try {
    const out = runTool_(block.name, block.input);
    if (typeof out === 'string') return { text: out };
    return {
      text: out.text,
      proposal: out.proposal || null,
      isError: !!out.isError,
    };
  } catch (e) {
    return { text: String((e && e.message) || e), isError: true };
  }
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
