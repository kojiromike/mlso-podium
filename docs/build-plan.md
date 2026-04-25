# Build plan

This is the working spec for the v0 build. As phases complete, check
them off in this file and commit. The next session resumes from the
first unchecked phase.

## Success criteria for v0

You can sit down with the dev workbook and chat your way through entering
the **fall 2026 program** (5 known pieces) end-to-end:

- Pieces appear in the `Pieces` tab with Daniels' IDs and instrumentation
  populated where Daniels' has them.
- Concerts and rehearsals are entered with venues from the `Venues` tab.
- Hard validators catch malformed proposals before they reach the diff.
- Propose-then-confirm flow feels usable, not annoying.

If the friction points after that exercise are tolerable, v0 is done.

## Scope

### In v0

- **Tabs:** `Seasons`, `Programs`, `Concerts`, `Rehearsals`, `Venues`,
  `Pieces`, `People`. (See `schema.md` for columns.)
- **Tools:** `read_workbook`, `search_daniels`, `read_daniels`,
  `propose_writes`, `apply_writes`.
- **Validation:** hard rules only.
- **System prompt:** v0 version per `system-prompt.md`.
- **Sidebar chat UI:** message history, propose/diff display,
  approve/reject buttons.

### Deferred to v0.1+

See `schema.md` for column-level details.

- Tabs: `Library`, `Repertoire_Ideas`, `Instruments`, `PieceSoloists`.
- Tool: `read_performance_history`.
- Soft validators (runtime budget, dedup, history conflict, etc.).
- Self-check before proposing (model predicts hard-validator failures
  and clarifies instead of sending).
- Per-change cherry-pick approval.

## Phases

Effort estimates are rough. They're for sequencing, not deadlines.

- [ ] **Phase 1 — Workbook skeleton.** Create dev workbook. Add tabs
      and columns per `schema.md`. Add data validation dropdowns from a
      hidden `Lookups` tab for enum fields. Hand-enter known venues
      (VFMS, BMPC, KI) and any people you already know. *(1–2 hrs)*

- [ ] **Phase 2 — Apps Script project bound to workbook.** Bind a new
      Apps Script project to the dev workbook. Set up `clasp` so this
      repo's `src/` syncs to it. Add a hello-world sidebar (custom menu
      → opens HTML sidebar that just renders text). Confirm `clasp push`
      cycle works. *(2 hrs)*

- [ ] **Phase 3 — Anthropic API round-trip.** From Apps Script, call
      Anthropic API with no tools and the v0 system prompt. Display
      response in the sidebar. Store API key in `PropertiesService`.
      *(2 hrs)*

- [ ] **Phase 4 — Tool-use loop with `read_workbook` only.** Implement
      the tool-use loop. AI can read the whole workbook and answer
      questions about it. No writes yet. Use prompt caching for the
      workbook context. *(3 hrs)*

- [ ] **Phase 5 — `propose_writes` + `apply_writes` with hard
      validators.** Implement the write proposal flow: AI calls
      `propose_writes`, validators run, diff renders in sidebar,
      approve/reject buttons trigger `apply_writes` or feedback to AI.
      *(4–6 hrs)*

- [ ] **Phase 6 — Daniels' integration.** Implement `search_daniels`
      and `read_daniels` tools using the credentials in
      `PropertiesService`. Verify the assistant uses them when proposing
      pieces. *(2–3 hrs)*

- [ ] **Phase 7 — Real-use shakedown.** Sit down with the dev workbook
      and enter the fall 2026 program by chatting. Note friction
      points. File them as v0.1 backlog items. Tune system prompt as
      needed. *(ongoing; this is the success-criteria check)*

## Architecture risks to watch

- **Apps Script 6-minute execution limit.** A multi-turn tool-use
  conversation with slow Daniels' calls could approach this. Mitigate
  by making each user turn statelessly issue at most one model call,
  letting the sidebar drive the loop.
- **No native streaming in `UrlFetchApp`.** Chat will feel less
  interactive than streaming chat UIs. Acceptable for v0.
- **Fallback if either bites hard:** move the LLM-calling layer to a
  small external service (Cloud Run / Vercel). Reintroduces hosting
  cost. Don't pre-build; hold in reserve.

## Deployment shape (v0)

- Two workbooks: `MLSO Podium — Dev` (sandbox) and
  `MLSO Podium — 2026-27` (real).
- Each has its own bound Apps Script. `clasp` switches via
  `.clasp.json`. Push to dev first, then prod after validation.
- Three secrets in `PropertiesService` (per workbook):
  `ANTHROPIC_API_KEY`, `DANIELS_USER_ID`, `DANIELS_TOKEN`.
- No CI/CD, no automated tests. Manual validation in dev.

## v0.1 backlog (rough order)

1. `Repertoire_Ideas` tab + tool support — needed before winter
   program ideation begins.
2. `read_performance_history` — needed alongside ideation.
3. Soft validators — runtime budget, dedup, history conflict.
4. `Library` tab — for Library committee handoff.
5. `Instruments` tab + `People.instrument_id` upgrade.
6. `PieceSoloists` join tab — when first multi-soloist piece arrives.
7. Self-check before proposing.

## When to re-evaluate the architecture

Trigger a design review (don't just iterate) if:
- Apps Script execution limits start blocking real flows.
- A second chair / committee starts using the assistant via chat
  (currently single-user).
- Workbook size approaches Sheets' practical limits (won't happen
  on this data volume; documented for completeness).
- API costs become non-trivial (unlikely at this scale; check
  monthly during v0).
