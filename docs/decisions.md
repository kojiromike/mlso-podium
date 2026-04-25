# Design decisions

Short-form rationale for the choices that shaped this project. The
purpose of this log is to prevent re-litigation: if you find yourself
about to undo one of these, read the rationale first.

Format: **Decision** — **Why** — **What we considered instead.**

---

## Storage: Google Sheets in personal Workspace, transferable to MLSO later

**Why:** Library and Staffing committees both consume and contribute
data; MLSO already lives on Google Drive. Sheets is the lowest-friction
shared surface for non-technical contributors. Personal Workspace for
v0 because the chair is comfortable there; transfer to MLSO Workspace
later by changing Drive ownership.

**Considered:** Flat files in this repo (great reversibility, terrible
sharing). SQLite + web app (best UX, hosting cost the chair doesn't
want to own past their 2-year term). Google Sheets in MLSO Workspace
from day one (defer until comfortable; ownership transfer is one click).

## One workbook per season

**Why:** Smaller blast radius, simpler handoff, history lives in a
separate read-only sheet anyway. Volume per season is small enough that
splitting adds no scaling pain.

**Considered:** One workbook forever (would help cross-season ideation,
but the existing performance history sheet already serves that need).

## Sidebar chat, not menu-driven CRUD

**Why:** The user wants conversational interaction with a well-informed
agent, not buttons. Sheet is durable state; chat is the interface.
Side-by-side fits how they want to plan.

**Considered:** Apps Script custom menus with structured forms. Cleaner
in the short term but doesn't address "answer questions about the data."

## Propose-then-confirm writes (atomic)

**Why:** Cost-bearing data (rentals, eventually staffing) makes silent
writes too risky. Sheets undo across Apps Script writes is unreliable.
Atomic apply (whole proposal or nothing) keeps the model honest about
bundling related changes.

**Considered:** Auto-apply with undo (rejected: undo unreliable).
Per-change cherry-pick approval (deferred: more UI work, marginal value
at v0).

## Validate proposals before display

**Why:** Catch model mistakes before the user sees them. Cheap to
implement, high signal-to-noise ratio.

**Considered:** Validate only on apply (would surface model errors as
"approve → fail" rather than "fix and re-propose," worse UX).

## Anthropic Sonnet, with provider code isolated

**Why:** Sonnet's tool use + prompt caching fits long-stable-context
workloads. Chair already pays for Claude. Provider isolation in one
file means a future chair can swap providers in a day.

**Considered:** Multi-provider abstraction from day one (rejected as
premature; the abstraction is the cost, not the swap).

## Per-season workbook + read-only history sheet reference

**Why:** Performance history already exists as a separate sheet
maintained over decades. Don't duplicate; read-only consume.

**Considered:** Importing history into each season workbook (data
duplication, sync burden, conflicting normalization conventions).

## Daniels' lookups don't fabricate

**Why:** Wrong instrumentation cascades into staffing decisions. Better
to leave blank and force a manual / score-based fill than to guess.

## Schema describes shape, not policy

**Why:** "Three programs per season at three venues" is policy. Baking
it into enums (fixed `slot`, fixed `Venues.kind`) forces data to lie
when reality varies (special concerts, new venues, dual-use spaces).
Open text + structured filters (`is_regular_season`) + system prompt
guidance covers the common case without breaking the uncommon one.

## Pieces row per program, not per work

**Why:** A piece played in two seasons has different cost, soloist,
context. Per-program rows reflect that. Daniels' is the canonical
catalog of works; we don't re-implement it.

## Single `soloist_id` on Pieces in v0; PieceSoloists join in v0.1

**Why:** Multi-soloist pieces (Brahms Double, Bach Two-Violin) are
real but rare. v0 ships single FK; upgrade when first multi-soloist
case arrives. Defer adds clarity to the v0 build.

**Considered:** PieceSoloists from day one (correct but adds a tab,
validation rules, and UI complexity for a 5%-of-pieces case).

## `People.instrument` free text in v0; `Instruments` tab in v0.1

**Why:** Same logic — defer the controlled vocabulary until the AI
needs structured matching for ideation. v0 doesn't do ideation.

## No `Library` or `Repertoire_Ideas` tabs in v0

**Why:** v0 proves the chat-driven workflow on the most-known data
(fall 2026 repertoire). Library handoff and ideation come after the
core loop is validated.

## Movement field free text; blank means "all in order"

**Why:** 75% of pieces play all movements. Forcing structure on the
common case is friction; free text on the uncommon case ("I, II, IV
(skip III)") is fine. Blank is meaningful, not missing.

## Dropped `Venues.kind`

**Why:** A venue can be both rehearsal and concert space (VFMS is
both). The tab a referencing row lives in (`Concerts` vs
`Rehearsals`) already implies use. Kind on the venue row would lie
in the dual-use case.

## Acquisition enum without `borrowed`

**Why:** A borrowed piece is materially the same as a $0 rental for
planning purposes. Lender goes in `notes`. Fewer enum values means
fewer "which one applies?" decisions.

## No `OtherExpenses` tab

**Why:** Out of scope. Podium plans concerts; tuners, trucks, and
recording costs are Staffing's or Production's problem. Adding a
catch-all tab would invite scope creep.
