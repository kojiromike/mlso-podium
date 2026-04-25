# MLSO Podium Assistant

An AI assistant for the Main Line Symphony Orchestra (MLSO) Podium
committee. Lives as a chat sidebar inside a Google Sheets workbook.
Helps plan upcoming concert programs by proposing structured edits and
answering questions about the workbook contents.

## What it does

- **Conversational planning.** Chat to enter pieces, concerts,
  rehearsals, and venues into a structured workbook. The AI proposes
  changes; you approve before they apply.
- **Daniels' lookups.** Pulls instrumentation and runtime metadata
  from Daniels' Orchestral Music Online for standard repertoire.
- **Question answering.** Reads the workbook to answer questions like
  "what's the total runtime of the fall program?" or "which pieces
  still need instrumentation?"

## Status

v0 in progress. See `docs/build-plan.md`.

## Architecture

- **Storage:** Google Sheets workbook. The sheet is the durable state.
- **Compute:** Google Apps Script bound to the workbook. No external
  hosting.
- **Model:** Anthropic Claude (Sonnet) via the Anthropic API.
- **Reference data:** Daniels' Orchestral Music API
  (https://api.daniels-orchestral.com).

See `docs/decisions.md` for why these choices.

## Setup

### Prerequisites

- Node.js (for `clasp`)
- A Google account with access to a Google Sheets workbook
- An Anthropic API key
- Daniels' Orchestral Music API credentials (`userId` + `token`)

### One-time install

1. Install `clasp` and authenticate:
   ```bash
   npm install -g @google/clasp
   clasp login
   ```

2. Create the dev workbook in Google Drive: `MLSO Podium — Dev`.
   Inside the sheet: **Extensions → Apps Script** to create a bound
   script project. Copy the script ID from the project settings.

3. In this repo, create `.clasp.json` from the example and paste in
   the script ID:
   ```bash
   cp .clasp.json.example .clasp.json
   # edit .clasp.json — set "scriptId" to the dev project's ID
   ```

4. Push code to Apps Script:
   ```bash
   npm run push
   ```
   (Regenerates `src/systemPrompt.gs` from `docs/system-prompt.md`,
   then runs `clasp push -f`.)

5. Set secrets in the Apps Script project: **Project Settings →
   Script Properties**. Add three properties:
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `DANIELS_USER_ID` — Daniels' API user ID
   - `DANIELS_TOKEN` — Daniels' API token

6. Reload the workbook. A custom menu **Podium Assistant** appears.
   Click it to open the sidebar.

### Promoting to a production workbook

Repeat the workbook + script-project setup for `MLSO Podium —
2026-27` (or whatever season you're planning). Maintain a separate
`.clasp.json` (e.g., `.clasp.prod.json`) and switch with
`clasp setting scriptId <prod-id>` before pushing. Set the same three
script properties in the prod project.

## Working in the repo

- Code lives in `src/`. After edits: `npm run push`.
- Design docs live in `docs/`. Read them before changing code.
- Secrets never go in source.

## Handoff to a future chair

The Apps Script is **container-bound** to the workbook, so transferring
ownership of the workbook in Google Drive transfers the script with
it. Steps:

1. In Google Drive, transfer ownership of the workbook(s) to the
   incoming chair.
2. Share this repo (transfer or fork).
3. Incoming chair re-sets the three Script Properties under their own
   API credentials.

That's the whole handoff. No data migration required.

## Documentation

- `docs/build-plan.md` — phased build plan with checkboxes
- `docs/schema.md` — workbook schema and validation rules
- `docs/system-prompt.md` — the assistant's system prompt (versioned
  artifact)
- `docs/decisions.md` — rationale for design choices
- `CLAUDE.md` — working notes for Claude Code sessions
