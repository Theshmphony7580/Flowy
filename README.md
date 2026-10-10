# Flowy

Flowy is an Excalidraw-style collaborative system-design canvas with an always-available AI architecture partner. It helps intermediate developers build systems while learning to reason about architectural choices.

## Project context

The developer maps a system on a shared canvas. An agent follows meaningful changes, keeps track of the developer's goals and decisions, asks useful questions, and proposes improvements. It feels like a curious architecture colleague sitting beside the developer.

In the finished experience the agent is visible on the shared canvas, with its own cursor, focus, and activity. The main web app renders that presence, shows proposal previews, collects approval, and applies approved edits. The harness returns grounded questions, answers, and typed proposal data to the main app; it does not own or edit the canvas.

## Confirmed direction

- Use Liveblocks for the collaborative canvas integration.
- Keep the shared-canvas buddy experience central; agent presence and cursor rendering belong to the main web app.
- Build the agent harness separately from the canvas UI.
- Develop locally without Docker initially; defer containerization until later.
- On joining, understand the current canvas and clarify what the developer is building, why, its scope, and expected scale. Confirm a short design brief before giving requirement-dependent advice.
- Follow the live state and meaningful user actions, rather than requiring a fresh description of the diagram in every message.
- Ask contextual questions and reason about omissions, risks, and improvements.
- Return proposed changes to the main web app; it obtains approval and applies them.
- Start with text conversation and proposal cards.
- Initially serve intermediate developers who are building systems and learning. The broader audience and product positioning remain open.

## Proposed technical direction

Use a structured architecture graph plus explicit goals and constraints as the agent's working context. The harness receives a bounded snapshot and meaningful event from the main web app, decides whether/how to respond, and returns a typed answer or proposal. The main app owns approval and execution through Liveblocks.

The main app coordinates cursor, highlights, text, and real edits as one visible action. It sends relevant focus/context to the harness and interprets the harness response. Excalidraw is the experience reference; the canvas library has not been selected.

Always available means the buddy can join whenever the developer works and recover prior context. Idle rooms do not require continuous model calls.

Build the harness as a separate product, with a stable versioned request/response contract. Keep its core independent of Liveblocks and the connector/MCP transport so it can be developed and evaluated using recorded events before integration.

These are design recommendations and implemented core foundation contracts (`packages/core`). The pure domain models, graph validation, and proposal digest slice are implemented and tested locally.

## Design and build plan

**Current design focus: the [core-only implementation design](docs/core-design.md).** It defines a standalone agent harness with a versioned request/response boundary to the main web app. The first local slice uses recorded inputs and a fake model. The main app owns Liveblocks, canvas state, presence, identity, approvals, and applying edits. Authentication, service transport, persistence, and a real model are later steps.

The [earlier broad implementation draft](docs/v1-implementation-spec.md) preserves prior planning details, including assumptions that changed when we clarified that the main app owns all canvas behavior. It is background until reconciled with the core design.

The [earlier harness specification and candid review](docs/harness-spec.md) preserves the reasoning behind the design. Where earlier documents differ, follow the core design for the current phase.

The [broader agent design](docs/agent-harness-design.md) records earlier product-flow ideas. Its canvas-execution ownership predates the current boundary: the main app now owns Liveblocks, approval, and mutations.

The [technology stack discussion](docs/tech-stack.md) records the rationale for TypeScript/Node.js, Fastify, AI SDK Core, Zod, PostgreSQL, Drizzle, pg-boss, versioned skills, and evaluation tooling. The v1 specification sets implementation defaults; dependencies are not installed.

Context established on 10 October 2026.
