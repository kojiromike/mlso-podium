# MLSO Podium — working notes for Claude Code

This repo builds an AI assistant for the Main Line Symphony Orchestra
(MLSO) Podium committee. The assistant lives as a Google Sheets sidebar
chat that helps plan upcoming concert programs.

## Where to start

If you're picking up work on this repo, read in this order:

1. `docs/build-plan.md` — phased v0 plan with checkboxes. Resume from
   the first unchecked phase.
2. `docs/schema.md` — tabs, columns, validation rules.
3. `docs/system-prompt.md` — the assistant's system prompt (the
   artifact, not just docs).
4. `docs/decisions.md` — rationale for design choices. **Read before
   reversing any of them.**

## Working norms

- **Update `docs/build-plan.md` as you complete phases.** Check the
  box, commit, push. Next session resumes cleanly.
- **`docs/schema.md` is the contract.** Validate any tool input/output
  against it before changing code. If the schema needs to change,
  update the doc in the same PR.
- **`docs/system-prompt.md` is shipped, not just documentation.** The
  Apps Script reads it (or a generated constant from it). Treat changes
  like code changes.
- **Code lives in `src/`** and syncs to Apps Script via `clasp`. After
  any code change: `clasp push`. There is no other deploy step.
- **Secrets never go in source.** `ANTHROPIC_API_KEY`,
  `DANIELS_USER_ID`, `DANIELS_TOKEN` live in `PropertiesService`. The
  README documents what to set; values stay out of git.
- **Two workbooks, dev and prod.** Push to dev first, validate
  manually, then push to prod. Don't skip dev.
- **No tests are expected at v0.** Apps Script's testing story is
  poor. Validate by using the assistant on real planning tasks.
- **Don't add scope.** v0 is intentionally narrow (see
  `build-plan.md`). Library, ideation, and history features are v0.1+.

## Decisions that are settled — don't re-open without asking

These are documented in `docs/decisions.md` with rationale:

- Google Sheets, not flat files or a custom DB.
- One workbook per season.
- Sidebar chat, not menu-driven CRUD.
- Propose-then-confirm writes (atomic).
- Anthropic Sonnet, with provider code isolated.
- Single `soloist_id` on Pieces in v0; `PieceSoloists` join in v0.1.
- No `Library` or `Repertoire_Ideas` tabs in v0.

If you find yourself wanting to change one of these, read the rationale
first and discuss with the user before acting.

## Project context

The user (chair of the Podium committee) holds the role for two years
and wants the project to be transferable to a successor. Design choices
favor low ongoing cost, simple handoff, and low coupling to the chair's
personal accounts. See `docs/decisions.md` for how each choice reflects
that.
