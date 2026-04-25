#!/usr/bin/env node
// Extracts the fenced code block from docs/system-prompt.md and writes
// it as a JS string constant to src/systemPrompt.gs. The .md file is
// the source of truth; the .gs file is a build artifact.

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'docs', 'system-prompt.md');
const dst = path.join(root, 'src', 'systemPrompt.gs');

const md = fs.readFileSync(src, 'utf8');
const match = md.match(/^```\s*\n([\s\S]*?)\n```/m);
if (!match) {
  console.error('No fenced code block found in', src);
  process.exit(1);
}

const prompt = match[1];
const escaped = prompt.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const out = `// GENERATED FROM docs/system-prompt.md — do not edit by hand.
// Run \`npm run sync-prompt\` to regenerate.

const SYSTEM_PROMPT = \`${escaped}\`;
`;

fs.writeFileSync(dst, out);
console.log('Wrote', path.relative(root, dst));
