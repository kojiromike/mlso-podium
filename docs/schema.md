# Schema

The MLSO Podium assistant operates over a Google Sheets workbook with the
tabs and columns described below. The workbook is the durable state; the
chat sidebar is the interface.

**Scope notes:**
- v0 ships the tabs marked **[v0]**.
- Tabs marked **[deferred]** are designed but not built initially. See
  `build-plan.md` for sequencing and `decisions.md` for rationale.

## Conventions

- All `*_id` columns are strings. Local UUIDs unless they reference an
  external system (e.g., `daniels_id` is Daniels' integer Work ID, stored
  as text for consistency).
- All non-key columns are nullable unless marked **required**.
- Enum columns have a fixed allowed set; values outside the set are a
  hard validation failure.
- Free-text columns have no validation beyond type.
- Dates: ISO 8601 (`YYYY-MM-DD`). Times: 24-hour (`HH:MM`).
- Money: stored as numbers in USD; format is presentation-only.

---

## Seasons **[v0]**

One row per orchestral season. Mostly metadata.

| col | type | notes |
|---|---|---|
| `season_id` | text PK | e.g., `2026-27` |
| `label` | text required | "2026–2027 Season" |
| `notes` | text | |

## Programs **[v0]**

One row per program (fall/winter/spring within a season, or special).

| col | type | notes |
|---|---|---|
| `program_id` | text PK | e.g., `2026-27-fall` |
| `season_id` | FK → Seasons, required | |
| `slot` | text required | typically `fall` / `winter` / `spring`; free text for specials (`gala`, `runout`) |
| `is_regular_season` | bool required | true for fall/winter/spring subscription; false for specials |
| `theme` | text | optional program theme/title |
| `notes` | text | |

## Concerts **[v0]**

One row per concert performance. Typically two per program.

| col | type | notes |
|---|---|---|
| `concert_id` | text PK | e.g., `2026-27-fall-1` |
| `program_id` | FK → Programs, required | |
| `date` | date | |
| `venue_id` | FK → Venues | |
| `call_time` | time | |
| `downbeat` | time | |
| `notes` | text | |

## Rehearsals **[v0]**

One row per rehearsal.

| col | type | notes |
|---|---|---|
| `rehearsal_id` | text PK | |
| `program_id` | FK → Programs, required | |
| `date` | date | |
| `venue_id` | FK → Venues | |
| `start_time` | time | |
| `end_time` | time | |
| `notes` | text | sectional? full? |

## Venues **[v0]**

Reference data. Open — new venues can be added.

| col | type | notes |
|---|---|---|
| `venue_id` | text PK | e.g., `vfms`, `bmpc`, `ki` |
| `name` | text required | "Valley Forge Middle School" |
| `address` | text | |
| `notes` | text | parking, load-in quirks |

(No `kind` field — the tab a row references already implies use.)

## Pieces **[v0]**

The core tab. One row per piece *on a program*. Same piece played in two
seasons gets two rows.

| col | type | notes |
|---|---|---|
| `piece_id` | text PK | local UUID, always present |
| `program_id` | FK → Programs, required | |
| `slot_order` | int | order on the program |
| `status` | enum required | `tentative` / `confirmed` / `placeholder` |
| `composer` | text required | |
| `title` | text required | |
| `movement` | text | free text; **blank means "all movements in order"**; populate only for excerpts (e.g., "I, II, IV (skip III)") |
| `runtime_min` | number | |
| `daniels_id` | text | Daniels' Work ID, nullable |
| `daniels_match_confidence` | enum | `exact` / `fuzzy` / `manual` / `none` |
| `instrumentation_summary` | text | from Daniels' or manual |
| `instrumentation_source` | enum | `daniels` / `manual` / `score` / `none` |
| `soloist_id` | FK → People | nullable; **single soloist for v0** (multi-soloist pieces use PieceSoloists in v0.1+) |
| `placeholder_notes` | text | for Dietz/TBD pieces, e.g., "concerto movement, instrument TBD" |
| `notes` | text | |

## People **[v0]**

Soloists, conductors, concertmasters, named players. Reference.

| col | type | notes |
|---|---|---|
| `person_id` | text PK | |
| `name` | text required | |
| `instrument` | text | **free text in v0** (upgrades to FK → Instruments in v0.1+) |
| `notes` | text | |

## Library **[deferred to v0.1]**

Music acquisition. One row per piece per program.

| col | type | notes |
|---|---|---|
| `library_id` | text PK | |
| `piece_id` | FK → Pieces, required | |
| `acquisition` | enum required | `rental` / `owned` / `public_domain` / `purchase` / `commission` / `other` |
| `vendor` | text | publisher / rental house / lender |
| `quoted_cost` | money | |
| `actual_cost` | money | |
| `status` | enum | `needed` / `quoted` / `secured` |
| `quote_date` | date | |
| `notes` | text | for borrowed pieces, name the lender here |

## Repertoire_Ideas **[deferred to v0.1]**

Lightweight scratch space for pieces being considered.

| col | type | notes |
|---|---|---|
| `idea_id` | text PK | |
| `composer` | text | for commissions, partial values like "TBD - Curtis student" allowed |
| `title` | text | |
| `movement` | text | |
| `runtime_min` | number | |
| `daniels_id` | text | |
| `instrumentation_summary` | text | |
| `suggested_for_program_id` | FK → Programs | soft hint, not a placement |
| `theme_fit` | text | |
| `pros` | text | |
| `cons` | text | |
| `last_performed` | text | denormalized cache from history sheet |
| `kind` | enum | `existing_work` / `commission` / `arrangement_commission` |
| `commission_status` | text | progress with composer if `kind=commission*` |
| `status` | enum | `proposed` / `shortlisted` / `rejected` / `promoted` |
| `notes` | text | source of suggestion (AI / user / board / etc.) goes here |

When an idea is **promoted**, the AI proposes a `Pieces` insert and marks
the idea row `status=promoted`. The idea row stays as a record (don't
delete — useful for "why did we pick this?").

## Instruments **[deferred to v0.1]**

Reference vocabulary for solo instruments.

| col | type | notes |
|---|---|---|
| `instrument_id` | text PK | `violin`, `viola`, `bb_clarinet` |
| `name` | text required | "Violin", "B♭ Clarinet" |
| `family` | enum | `strings` / `woodwinds` / `brass` / `percussion` / `keyboard` / `voice` / `other` |
| `notes` | text | |

When this tab arrives, `People.instrument` becomes
`People.instrument_id` (FK) — "primary / known-for instrument," not
necessarily what they're playing tonight.

## PieceSoloists **[deferred to v0.1]**

Join tab for pieces with one or more soloists. Replaces
`Pieces.soloist_id`.

| col | type | notes |
|---|---|---|
| `piece_soloist_id` | text PK | |
| `piece_id` | FK → Pieces, required | |
| `person_id` | FK → People, required | |
| `instrument_id` | FK → Instruments, required | what they're playing in this piece |
| `display_order` | int | for ordered formatting |

Even single-soloist pieces use this tab once it exists. Source of truth
for "what's John Doe playing tonight" — distinct from `People.instrument_id`.

---

## Validation rules

Two layers: **hard** rules block the proposal before the user sees it;
**soft** rules surface as warnings the user can override.

### Hard rules (v0)

- Required fields present.
- Foreign keys resolve to existing rows.
- Enum values from the allowed set.
- Types correct (numbers parse, dates parse, IDs are strings).
- PKs unique on insert.
- Updates target an existing row.
- Deletes don't orphan dependents.
- AI does not edit `Lookups` (reference data) without explicit user instruction.

### Soft rules (v0.1+)

- **Runtime budget**: program's confirmed + tentative total > 75 min.
- **Dedup risk**: new venue/person/composer fuzzy-matches existing
  (Levenshtein-based threshold). Always offer "use existing" alternative.
- **History conflict**: piece performed in last 5 seasons per history sheet.
- **Daniels' confidence low**: `daniels_match_confidence=fuzzy` or `none`.
- **Confirmed without instrumentation**: `Pieces.status=confirmed` but
  `instrumentation_summary` blank.
- **Concert without venue or date.**
- **Program with no concerts.**
- **Date / season mismatch**: e.g., fall program with a concert in March.
- **Two concerts same day.**
- **Soloist instrument mismatch**: `People.instrument` doesn't fit the piece.
- **Commission without `commission_status`**.

Validators live in `validators.gs` (one function per rule), each
returning `{level, message, fields_affected}`.
