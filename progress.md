# Progress Log: Flowy Core

<!-- 
  WHAT: Chronological session log of actions, testing, and context checks.
  WHY: Answers "What have I done?" in the 5-Question Reboot Test.
-->

## Session: 2026-10-10

### Phase 1: Setup & Project Scaffolding
- **Status:** complete
- **Started:** 2026-10-10 16:34
- **Completed:** 2026-10-10 16:55
- Actions taken:
  - Reviewed project documentation: `docs/core-design.md`, `docs/v1-implementation-spec.md`, `docs/tech-stack.md`.
  - Configured workspace root `package.json` with Bun workspaces (`packages/*`, `tools/*`) and `zod` dependency.
  - Initialized `packages/core/package.json` and `packages/core/tsconfig.json`.

### Phase 2: Milestone C0 — Contracts & Pure Validation
- **Status:** in_progress
- **Started:** 2026-10-10 16:55
- Actions taken:
  - Implemented pure domain contracts in `packages/core/src/domain/`:
    - `snapshot.ts`: Node/Edge schemas, WorldLayout, Coverage, SnapshotRef
    - `brief.ts`: ConfirmedBrief, BriefDraft, ScaleEstimate, Provenance
    - `decisions.ts`: Decision, EvidenceRef
    - `room-snapshot.ts`: RoomSnapshot schema with schemaVersion: 1
    - `operations.ts`: Typed operations union (`add_node`, `update_node`, `move_node`, `remove_node`, `add_edge`, `update_edge`, `remove_edge`)
    - `proposal.ts`: Proposal schema, preconditions, preview representation
    - `events.ts`: CoreEvent union
    - `wire.ts`: AnalyzeRequest and AnalyzeResponse contracts
    - `digest.ts`: Deterministic canonical SHA-256 proposal digest utility
    - `validator.ts`: Pure graph validation and operation batch simulation
  - Applied all 8 review fixes from `fixes.md`:
    - Fix 1: Removed invalid `RoomSnapshot` import in `validator.ts`.
    - Fix 2: Set `rootDir: "."` in `packages/core/tsconfig.json`.
    - Fix 3: Implemented JSON-transport-stable canonical digest in `digest.ts` (omits undefined, sorts keys, preserves array order and null).
    - Fix 4: Rejected empty string `boundaryId` in `operations.ts` and `validator.ts`.
    - Fix 5: Added `.strict()` across operations, nested payloads, and added non-empty update refinements.
    - Fix 6: Added initial graph validation in `simulateOperations` before map construction.
    - Fix 7: Created `limits.ts` with bounded input/property schemas and 1 MiB UTF-8 JSON byte budget checks.
    - Fix 8: Implemented `Claim` model in `brief.ts` preserving provenance and confirmation status.
  - Rewrote test suite in `packages/core/test/domain.test.ts` with comprehensive regression tests for all 8 fixes.
  - Updated `README.md` to accurately describe implemented C0 core foundation.
- Files created/modified:
  - `packages/core/package.json`
  - `packages/core/tsconfig.json`
  - `packages/core/src/domain/limits.ts` (created)
  - `packages/core/src/domain/snapshot.ts`
  - `packages/core/src/domain/brief.ts`
  - `packages/core/src/domain/decisions.ts`
  - `packages/core/src/domain/room-snapshot.ts`
  - `packages/core/src/domain/operations.ts`
  - `packages/core/src/domain/proposal.ts`
  - `packages/core/src/domain/events.ts`
  - `packages/core/src/domain/wire.ts`
  - `packages/core/src/domain/digest.ts`
  - `packages/core/src/domain/validator.ts`
  - `packages/core/src/domain/index.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/domain.test.ts`
  - `fixes.md`
  - `README.md`



## Test Results
| Test | Input | Expected | Actual | Status |
|---|---|---|---|---|
| Bun runtime check | `bun --version` | `1.3.11` | `1.3.11` | ✓ |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|---|---|---|---|
| 2026-10-10 15:42 | `MODULE_NOT_FOUND` on plugin telemetry hook | 1 | Cleaned malformed quote characters in plugin JSON manifest |

## 5-Question Reboot Check
| Question | Answer |
|---|---|
| Where am I? | Phase 1: Setup & Project Scaffolding |
| Where am I going? | Phase 2: Milestone C0 — Contracts & Pure Validation |
| What's the goal? | Build the pure TypeScript agent core (`packages/core`) and replay engine (`tools/replay`) for Flowy |
| What have I learned? | See `findings.md` (the core is an advisor, not an executor; host applies edits) |
| What have I done? | Configured planning-with-files, verified Bun runtime, planned C0–C4 milestones |

---
*Update after completing each phase or encountering errors*
