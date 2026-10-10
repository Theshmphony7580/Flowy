# Task Plan: Flowy Core Implementation (Phase 1: C0–C4)

<!-- 
  WHAT: Roadmap for building Flowy's pure agent core and replay engine.
  WHY: Preserves working memory on disk across extended development sessions.
-->

## Goal
Build the pure TypeScript agent core (`packages/core`) and deterministic replay engine (`tools/replay`) for Flowy, providing intelligent, safe, and verifiable architecture advice on system design graphs without external database, network, or UI dependencies.

## Current Phase
Phase 1: Setup & Project Scaffolding

## Phases

### Phase 1: Setup & Project Scaffolding
- [x] Review project documentation (`docs/core-design.md`, `docs/v1-implementation-spec.md`, `docs/tech-stack.md`)
- [x] Initialize workspace structure (`packages/core`, `package.json`, `tsconfig.json`)
- [x] Add Zod dependency and workspace scripts
- **Status:** complete

### Phase 2: Milestone C0 — Contracts & Pure Validation
- [x] Define canonical schemas in `packages/core/src/domain/`:
  - `GraphSnapshot`, `ArchitectureNode`, `ArchitectureEdge`, `Coverage`, `ConfirmedBrief`
  - `CoreEvent` union
  - `AnalyzeRequest` and `AnalyzeResponse` wire contracts
  - `Operation` typed command union (`add_node`, `update_node`, `move_node`, etc.)
  - `Proposal` schema with preconditions and metadata
- [x] Implement pure graph validator (`validateGraph`) with boundary cycle detection and incident edge checks
- [x] Implement deterministic SHA-256 proposal digest utility (`computeProposalDigest`)
- [x] Add unit test suite in `packages/core/test/domain.test.ts`
- **Status:** in_progress (awaiting test run by user)


### Phase 3: Milestone C1 — Observation & Context Engine
- [ ] Implement snapshot diffing in `packages/core/src/observation/` (semantic vs layout separation)
- [ ] Implement event reduction & noise filter (dropping pointer frames, pan/zoom)
- [ ] Implement `ContextBundle` builder in `packages/core/src/context/`
- [ ] Implement 1-hop graph neighborhood retrieval and partial coverage metadata
- [ ] Add tests verifying pointer/layout changes produce 0 reasoning runs
- **Status:** pending

### Phase 4: Milestone C2 — Decisions & Lifecycle
- [ ] Implement trigger policy in `packages/core/src/policy/` (1s debounce for semantic edits, immediate for user messages/answers)
- [ ] Implement pure state machine `advance(state, input, dependencies)` in `packages/core/src/lifecycle/`
- [ ] Implement fake model adapter and fixture loader in `packages/core/src/reasoning/`
- [ ] Add tests for onboarding flow (empty room asks question; returning room reuses brief)
- **Status:** pending

### Phase 5: Milestone C3 — Proposals & Host Feedback Intake
- [ ] Implement proposal compilation and preview representation in `packages/core/src/proposals/`
- [ ] Implement outbound response assembler in `packages/core/src/response/`
- [ ] Implement host feedback intake: `proposal.response_recorded` and `proposal.outcome_reported` (`applied`, `conflict`, `denied`, `unknown`)
- [ ] Implement truthful follow-up response generation
- [ ] Add tests for stale snapshot detection and conflict handling
- **Status:** pending

### Phase 6: Milestone C4 — Replay Demo & Review
- [ ] Build scenario runner in `tools/replay/`:
  - Onboarding scenario (empty canvas -> orientation question -> answered -> brief reflected)
  - Order-to-email scenario (synchronous flow -> question -> tradeoff -> proposal -> preview -> host reported applied)
  - Conflict scenario (proposal pending -> canvas edited -> conflict reported)
  - Rejected / Deferred scenario (suppression of identical suggestions)
- [ ] Create CLI command `bun run demo` / `bun run replay`
- [ ] Verify all 14 core acceptance checks from `docs/core-design.md`
- **Status:** pending

## Key Questions
1. **Runtime & Package Manager**: The project was initialized with `bun` (v1.3.11). Should we use Bun's native workspace and test runner (`bun test`), or stick strictly to `pnpm` + `vitest`?
   * *Resolution*: Bun is fast, supports TypeScript and ESM natively, and has built-in testing (`bun test`). We can configure workspaces cleanly in `package.json` with Bun.
2. **Authority Boundary**: Does `packages/core` execute canvas changes?
   * *Resolution*: Absolute **NO** (per `core-design.md`). The core only emits proposals; the host web application executes mutations and reports back outcomes (`host_outcome`).
3. **Model Integration**: Are live model calls required for C0–C4?
   * *Resolution*: **NO**. C0–C4 uses deterministic fixture-backed model adapters.

## Decisions Made
| Decision | Rationale |
|---|---|
| Pure Core First (C0–C4) | Isolate domain logic and safety guarantees from network, database, and auth complexity |
| Bun Runtime | User initialized with Bun 1.3.11; fast native TS and testing without compilation overhead |
| Zod for Schema Contracts | Enforces strict runtime validation and infers TS types with schemaVersion: 1 |
| Pure Reducer `advance()` | Pure functional state updates make replay and testing 100% deterministic |
| Zero Direct Mutations | The core is strictly an advisor; the main web app owns the canvas and execution |

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| Plugin hook failure (`MODULE_NOT_FOUND` on `telemetry_hook_bundle.js`) | 1 | Stripped malformed escaped quotes (`\"C:\...`) in the plugin JSON manifest |

## User Constraints & Rules
1. **Execution Restriction**: All project execution commands (`bun install`, `bun test`, `bun run ...`, process runs) MUST be executed by the USER. The agent writes/edits code and files via tool calls and hands off exact commands to the user to run.
2. **Zero AI Slop**: Strict, production-ready, typed TypeScript code only. No dummy placeholders (`// TODO`), no generic fluff, no bloated unused abstractions. Follow `docs/core-design.md` to the letter.

## Notes
- Keep implementation small and modular; avoid over-abstracting.
- Re-read `task_plan.md` before making architectural decisions.
- Maintain test coverage across all domain contracts.
- Hand all execution commands to the user explicitly.
