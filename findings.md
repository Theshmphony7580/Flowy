# Findings & Decisions: Flowy Project

<!-- 
  WHAT: Persistent external memory for discoveries, architectural decisions, and constraints.
  WHY: Context windows are volatile; disk is persistent.
-->

## Requirements

### Core Product Objectives
- An Excalidraw-style collaborative system architecture canvas with a visible, always-available AI architecture buddy.
- Target audience: Intermediate developers designing systems while learning architectural tradeoffs.
- Interaction loop: Observe -> Orient -> Decide -> Ask / Answer / Propose -> Receive Host Outcome -> Retain Decision.
- Developer stays in 100% control: Proposals are inert until the user approves them in the main app.
- Unknown scale/throughput stays unknown; never fabricate traffic numbers or push complex infrastructure (Kafka, K8s) needlessly.

### Phase 1 (Core Engine) Constraints (per `docs/core-design.md`)
- Single local TypeScript package (`packages/core`) + replay runner (`tools/replay`).
- **No** database (PostgreSQL), **no** network transport (HTTP/SSE), **no** Docker, **no** Liveblocks in this phase.
- **No** live LLM provider required for C0–C4; deterministic fixture-based fake model.
- **No** direct canvas mutations in `packages/core`; the main web app owns the canvas and reports outcomes (`host_outcome`).
- Pure functional core: `advance(state, input, dependencies) -> { state, effects }`.
- Deterministic proposal digest: SHA-256 over exact operations, preconditions, and source snapshot reference.

## Research Findings
- **Bun Environment**: Bun 1.3.11 is installed on the host with native TypeScript execution and built-in `bun test`.
- **Wire Contract**: `AnalyzeRequest` and `AnalyzeResponse` provide a protocol-neutral interface suitable for later HTTP, MCP (`analyze_design`), or direct in-process connector integration.
- **Graph Invariants**:
  - Stable opaque IDs for nodes and edges.
  - Endpoints of all edges must exist in the node set.
  - No cyclic boundary containment.
  - Finite world coordinates (no viewport pixels).
  - Removing a node requires explicit removal of all incident edges.
- **Event Classification**:
  - Awareness path: pointer movements, pan/zoom, selection changes -> Dropped from core or treated as ephemeral focus hints (0 model calls).
  - Reasoning path: semantic graph changes, user chat messages, question answers, proposal responses, host outcomes.

## Technical Decisions
| Decision | Rationale |
|---|---|
| Phase 1 Focus (`packages/core`) | De-risks the domain logic and reasoning state machine without infrastructure complexity |
| Bun 1.3.11 Runtime | Zero-build TS execution, high-performance testing, fast developer feedback |
| Zod Contracts with `schemaVersion: 1` | Strict runtime type validation and inferred TypeScript types |
| Functional Reducer (`advance`) | Simplifies testing, replay, and time-travel debugging |
| Strict Separation of Advisor vs Executor | The core advises; the host app executes. Prevents distributed transaction issues between harness and canvas |
| User Command Execution Rule | User executes all project shell commands (installs, tests, runs); agent handles all code and file authoring |
| Zero AI Slop Standard | Exact, complete, mathematically and architecturally sound code strictly according to specifications |

## Issues Encountered
| Issue | Resolution |
|---|---|
| Plugin hook failure (`PreToolUse` error in `googlecloudtools.datacloud_telemetry`) | Cleaned extra escaped quotes in the plugin's JSON configuration so Node resolves the path cleanly |

## Resources
- [`docs/core-design.md`](file:///f:/Flowy/docs/core-design.md) - Primary design specification for Phase 1
- [`docs/v1-implementation-spec.md`](file:///f:/Flowy/docs/v1-implementation-spec.md) - Broader harness and future integration specification
- [`docs/tech-stack.md`](file:///f:/Flowy/docs/tech-stack.md) - Technology rationale and package mapping
