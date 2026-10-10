# Flowy C0 fixes and implementation instructions

Date: 10 October 2026.

Status: instructions prepared; none of the fixes below have been applied or verified by running the project.

This document records all eight findings from the code review. The numbering matches the review so each fix can be tracked separately. Each section explains the current failure, the required change, why it resolves the failure, and the checks needed before closing the item.

The implementation broadly follows [the current core design](docs/core-design.md). C0 is the foundation for contracts and pure validation. C1 through C4 are still pending as recorded in [the task plan](task_plan.md); their absence is not a defect in this C0 slice.

Keep these fixes inside the local core and its tests. The host application continues to own approval and real canvas changes. Simulation must operate on copies. Authentication, HTTP, database integration, Liveblocks, and live model calls remain outside this phase.

## Fix checklist

| ID | Priority | Required change | Status |
| --- | --- | --- | --- |
| 1 | Must fix | Remove the invalid, unused `RoomSnapshot` import | Applied |
| 2 | Must fix | Include tests within the package's configured `rootDir` | Applied |
| 3 | Must fix | Make proposal hashing stable across JSON transport | Applied |
| 4 | Must fix | Reject empty boundary IDs in updates and validation | Applied |
| 5 | Must fix | Reject unsupported command fields and empty updates | Applied |
| 6 | Must fix | Validate the initial graph before simulation creates maps | Applied |
| 7 | Should fix before C0 completion | Add explicit input and property limits | Applied |
| 8 | Should fix before C0 completion | Preserve provenance and confirmation for brief claims | Applied |

Implement fixes 1 and 2 first. Then implement fixes 4, 5, and 6 together because they affect command validation. Implement fix 8 before completing fix 7 so the final claim structure also receives limits. Finish fix 3 and its tests against the finalized schemas. Keep the existing key-order digest test throughout.

## 1. Remove the invalid type import

**File:** `packages/core/src/domain/validator.ts`, current line 1.

### What is wrong

The file imports `RoomSnapshot` from `./snapshot.ts`. That module does not export `RoomSnapshot`; its definition is in `room-snapshot.ts`. The imported type is not used anywhere in the validator.

TypeScript checks whether a type import exists even when the import is erased at runtime. Bun can execute TypeScript without performing the same type check, so a successful Bun test run would not establish that this import is correct.

### Required change

Replace the first import with:

```ts
import type { ArchitectureEdge, ArchitectureNode } from "./snapshot.ts";
```

Do not move or re-export `RoomSnapshot` to make an unused import work. If the validator needs that type in a future change, import it from its actual defining module then.

### Why this resolves it

The validator imports only the types it uses, and both exist in the referenced module. This removes the missing-export compiler error without changing graph behavior.

### Verification and completion

- Both root and core-package type checks must report no missing `RoomSnapshot` export.
- No new runtime unit test is needed for deleting an unused import; compiler validation is the relevant check.

## 2. Correct the core package's source directory

**File:** `packages/core/tsconfig.json`, current lines 4 and 7.

### What is wrong

The configuration sets `rootDir` to `./src`, while `include` selects both `src/**/*` and `test/**/*`. The test file is outside the declared source root, which causes a package compiler diagnostic about a file outside `rootDir`.

### Required change

Use this package configuration:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "./dist"
  },
  "include": ["src/**/*", "test/**/*"]
}
```

Keep the inherited `noEmit: true` setting. This phase runs TypeScript directly and does not need a new build configuration.

### Why this resolves it

The package directory contains both source and tests. Setting it as the root lets TypeScript check the whole package consistently.

### Verification and completion

- Run the core-package type check after applying fix 1.
- Confirm it checks `test/domain.test.ts` without a source-root diagnostic.
- No runtime unit test is needed for this configuration change.

## 3. Make proposal digests survive JSON transport

**Files:** `packages/core/src/domain/digest.ts`, `packages/core/test/domain.test.ts`.

### What is wrong

The current canonical serializer sorts object keys but does not remove keys whose values are `undefined`. For example, an optional precondition can be constructed as:

```ts
{ semanticVersion: "sem_v1", layoutVersion: undefined }
```

Its current canonical text contains `"layoutVersion":undefined`, which is not valid JSON. A JSON round trip removes that property. Hashing the original and the transmitted payload therefore produces different digests even though they represent the same wire data.

This is possible with the current inferred types and optional schemas. Optional fields do not guarantee that the key is absent.

### Required changes

1. Define the digest's canonical representation as the JSON-compatible representation of the validated payload.
2. For objects, omit properties whose value is `undefined`, then sort the remaining keys recursively.
3. Preserve array order. Operation order is meaningful and must never be sorted.
4. Preserve `null`; it can represent an intentional change, such as clearing a boundary. It must not be treated as omission.
5. Hash the same fields as today: `schemaVersion`, `sourceSnapshotRef`, `preconditions`, and `operations`.
6. Reject unsupported values such as non-finite numbers rather than accidentally converting them into `null`. Use validated JSON data at the digest boundary. Operation arrays must not contain undefined entries; reject them rather than dropping them.
7. Keep SHA-256 and lowercase hexadecimal output. No new hashing dependency is needed.

For the valid object payload used here, a small implementation can first normalize it through JSON serialization/deserialization, then recursively sort keys. Ensure invalid values are rejected before that normalization, because JSON serialization otherwise changes non-finite numbers to `null`. Alternatively, teach the existing serializer to omit undefined object fields directly and reject unsupported values. Choose one consistent approach.

Hash the parsed, normalized operations that will actually be returned to the host. Do not hash raw input and subsequently apply defaults or strip fields from the transmitted operations. Hashing does not authorize or execute a proposal.

### Why this resolves it

The sender and receiver hash the same JSON data even when an in-memory object explicitly contains an optional undefined property. Recursive key sorting keeps key insertion order irrelevant, while preserving array order keeps distinct command sequences distinguishable.

### Required regression tests

- Explicit `layoutVersion: undefined` and an omitted `layoutVersion` produce the same digest.
- Undefined optional fields nested in operations also behave like omitted fields.
- For a valid payload, its digest equals the digest after `JSON.parse(JSON.stringify(payload))`.
- Reversing object key insertion order still leaves the digest unchanged.
- Changing an operation, its order, a precondition, or a source version changes the digest.
- Replacing an omitted nullable update field with `null` changes the digest.
- Invalid non-finite values are rejected by validation before hashing.

**Done when:** valid proposals retain their digest across a JSON round trip, and meaningful payload changes alter it.

## 4. Reject empty boundary IDs

**Files:** `packages/core/src/domain/operations.ts`, `packages/core/src/domain/validator.ts`, `packages/core/test/domain.test.ts`.

### What is wrong

The node schema requires a nonempty `boundaryId`, but the update schema permits any string. An update with `boundaryId: ""` passes parsing. Simulation stores it, and `validateGraph` skips it because `if (node.boundaryId)` treats an empty string as absent.

The simulator can therefore report success with a node that fails the canonical node schema.

### Required changes

1. Change the update field to:

   ```ts
   boundaryId: z.string().min(1).nullable().optional(),
   ```

2. Retain these meanings:
   - Omitted or undefined: leave the boundary unchanged.
   - `null`: clear the boundary.
   - Nonempty string: reference an existing node whose kind is `boundary`.
3. In `validateGraph`, distinguish an absent boundary from an empty boundary. Check `node.boundaryId !== undefined` and report an empty string as invalid rather than skipping it.
4. Keep the existing missing-boundary, wrong-kind, and containment-cycle checks.

### Why this resolves it

Command parsing agrees with the canonical node schema. The graph validator also catches the malformed value when a typed graph is constructed directly without parsing.

### Required regression tests

- The operation schema rejects `boundaryId: ""`.
- Direct graph validation rejects a node with `boundaryId: ""`.
- A valid boundary assignment succeeds.
- A reference to a missing boundary or a service node fails.
- Clearing with `null` succeeds and produces a node with no boundary assignment.
- The resulting node after a valid update passes `ArchitectureNodeSchema`.
- Existing cycle tests continue to pass.

**Done when:** successful boundary updates always produce schema-valid nodes and retain the existing containment checks.

## 5. Reject unsupported fields and empty updates

**Files:** `packages/core/src/domain/operations.ts`, command payload schemas in `snapshot.ts`, and `packages/core/test/domain.test.ts`.

### What is wrong

Zod object schemas strip unknown keys by default. The current update schema accepts:

```ts
{
  type: "update_node",
  id: "node_order_service",
  changes: { responsibility: "Send email" }
}
```

Parsing removes `responsibility` and returns `changes: {}`. Simulation reports success although the intended update never happens. A typo alongside a valid field is also silently discarded.

### Required changes

1. Add `.strict()` to `SupportedNodeChangesSchema` and `SupportedEdgeChangesSchema`.
2. Add `.strict()` to every object member of `OperationSchema`.
3. Make nested command payload objects strict too: node, edge, and world layout schemas. A strict outer operation does not automatically make its nested objects strict.
4. Reject an update with no defined supported changes. Test field values, not just the number of object keys, because `{ label: undefined }` still contains a key but requests no change.
5. Reject a properties-only update with `properties: {}`. Existing simulation merges properties, so that update changes nothing. Do not silently redefine it as clearing all properties.
6. Preserve valid changes such as `boundaryId: null` or clearing a description with an empty string. These have defined values and can be meaningful.
7. Keep the `properties` record open to explicitly supported property names within the bounds established by fix 7. Strictness applies to the command structure, not a blanket ban on domain properties.

With Zod 3, keep discriminated-union members as object schemas. Put the empty-update refinement on the nested change schemas; wrapping each union member in a refinement can interfere with constructing the discriminated union.

### Why this resolves it

Unsupported fields cause a validation failure instead of being converted into an apparently valid command. Empty updates are rejected before proposal simulation.

An update that repeats the current label may still be allowed: determining whether a valid value equals the existing value is a different concern from rejecting an empty command.

### Required regression tests

- Unsupported-only and mixed supported/unsupported change objects are rejected.
- Unknown fields on an operation and inside node, edge, or layout payloads are rejected.
- `{}`, `{ label: undefined }`, and properties-only `{ properties: {} }` updates are rejected.
- Valid node and edge updates still pass.
- `boundaryId: null` and supported empty-string clearing operations remain valid.

**Done when:** malformed command data produces a validation error rather than a successful no-op.

## 6. Validate the starting graph before building maps

**Files:** `packages/core/src/domain/validator.ts`, `packages/core/test/domain.test.ts`.

### What is wrong

`simulateOperations` constructs maps from the initial nodes and edges before validating them. Maps retain only one value per key. Two nodes or edges with the same ID collapse into a single entity before final graph validation can detect the duplicate.

The current snapshot schema validates entity shapes, but it does not enforce unique IDs. Calling simulation with a duplicate-filled graph can therefore return success with data silently lost, even with an empty operation list.

### Required changes

At the beginning of `simulateOperations`, before creating either map, add:

```ts
const initialValidation = validateGraph(initial);
if (!initialValidation.valid) {
  return { success: false, errors: initialValidation.errors };
}
```

Keep the final graph validation too. The first check validates the starting state; the final check validates the effects of the candidate commands.

Continue rejecting the entire operation batch when any operation fails. Return no resulting graph on failure. Keep all modifications on copied entities so input arrays and objects remain unchanged.

At future input boundaries, validate shape and graph meaning as separate steps: parsing `RoomSnapshotSchema` alone is not proof of graph validity. No new service or adapter is needed to fix the current simulator.

### Why this resolves it

Duplicates are detected while all original entities are still present. Invalid starting graphs are rejected rather than being implicitly repaired by map construction or by a later command.

### Required regression tests

- Duplicate initial node IDs fail, including with zero operations.
- Duplicate initial edge IDs fail, including with zero operations.
- An initial dangling edge, invalid boundary, or non-finite layout fails.
- A valid graph and valid operation batch still succeed.
- Input entities remain unchanged on both success and failure.
- A batch with a valid first command and invalid later command exposes no partial result.

**Done when:** invalid initial graphs cannot be accepted through map overwrites, and valid simulations remain atomic and pure.

## 7. Add bounded inputs and properties

**Files:** domain schemas in `snapshot.ts`, `room-snapshot.ts`, `operations.ts`, `proposal.ts`, `events.ts`, `wire.ts`, `brief.ts`, and `decisions.ts`; corresponding tests.

### What is wrong

The design requires bounded properties and rejection of oversized input. Current arrays, IDs, text fields, and property records mostly have minimum constraints but no upper bounds. Very large local fixtures are accepted and sent into validation.

This is a local-core requirement. It does not depend on building an HTTP server or deploying multiple workers.

### Required changes

1. Define shared numeric limits in one small domain module, such as `limits.ts`. Keep the same limits wherever a schema is reused.
2. Add `.max(...)` to bounded strings and arrays.
3. Create one shared properties schema for nodes, edges, and their updates. Bound key count, key length, and string-value length; require finite numeric values.
4. Bound all collections, including coverage references, focus references, evidence, messages, decisions, unresolved questions, brief claim lists, operations, and preview arrays.
5. Validate the merged property record after an update. An initial record and an update can each be within the limit but exceed it when merged. Validate simulated result entities with the canonical schemas as well as checking graph invariants.
6. Reject oversize input with an error; do not truncate text, remove entities, or silently shorten operation batches.
7. Define an aggregate JSON byte budget for requests and returned proposal/response data. Validate it with a bounded traversal that can stop when the budget is exceeded, or another small helper with explicit JSON-value handling. Count UTF-8 encoded JSON bytes, not JavaScript string length. This prevents individually valid fields from combining into an oversized payload.

### Proposed initial limits

The following values are implementation recommendations for C0. The existing plan requires limits but does not specify these numbers. Record the chosen values in the design notes; do not present them as measured production capacity.

| Data | Proposed maximum |
| --- | --- |
| ID or version string | 256 characters |
| Node/edge label or protocol | 512 characters |
| Description, message, answer, explanation, or claim text | 8,192 characters |
| Property key | 128 characters |
| Property string value | 4,096 characters |
| Properties per node or edge, including merged updates | 64 keys |
| Nodes per snapshot | 1,000 |
| Edges per snapshot | 4,000 |
| Operations per proposal | 100 |
| Recent messages | 50 |
| Decisions or unresolved questions | 100 each |
| Items in a brief claim list | 100 per list |
| Coverage references | 5,000 |
| Focus, event, or evidence references | 100 per list |
| Preview node collections | 1,000 per collection |
| Preview edge collections | 4,000 per collection |
| Tradeoff or limitation strings | 100 per list |
| Aggregate request or response JSON | 1 MiB of UTF-8 encoded JSON |

The aggregate limit takes precedence: a snapshot can be rejected below its entity-count limit if its text and properties already exceed the byte budget. Preview content also counts toward the response budget.

Apply lower bounds only where semantically required. An empty graph, a partial draft, an empty evidence list, or unknown scale must remain valid. Keep blank text allowed for supported clearing operations.

### Why this resolves it

The schemas establish a finite input contract and reject oversized fixtures before expensive graph simulation. Validating merged results prevents updates from bypassing property limits. The byte budget covers combinations that individual field limits cannot prevent.

### Required regression tests

- For each shared string/array limit, the boundary value passes and one over it fails.
- Excess property count, key length, or string length fails.
- Non-finite property numbers fail.
- A merged property update exceeding the limit fails without changing the original graph.
- An aggregate payload over the byte budget fails even when its individual fields pass.
- Byte-budget tests include non-ASCII text so UTF-8 counting is verified.
- Empty snapshots, incomplete drafts, and unknown scale still pass.

**Done when:** limits are enforced consistently at input and simulated-result boundaries, with clear rejection errors and no silent truncation.

## 8. Preserve the source of each brief claim

**Files:** `packages/core/src/domain/brief.ts`, affected fixtures in `packages/core/test/domain.test.ts`, and the brief contract description in `docs/core-design.md`.

### What is wrong

The design says each brief claim identifies whether it came from the user, graph, imported material, or an inference. Currently only scale estimates have a source. Purpose, intended users, flows, scope, and constraints are plain strings; stage is a plain enum with a default.

For example, `constraints: ["Simple infrastructure"]` does not record whether the user required it or the agent inferred it. Once stored, those situations are indistinguishable. Later context building cannot recover information that the contract discarded.

### Required changes

Use a small shared claim representation. A suitable shape is:

```ts
type Claim<T> = {
  value: T;
  source: "user" | "graph" | "imported" | "inference";
  status: "tentative" | "confirmed";
};
```

1. Implement this as Zod schemas that infer their TypeScript types; avoid maintaining a second independent type definition.
2. Use claims for purpose, intended users, each flow, each in-scope/out-of-scope item, stage, and each constraint.
3. Give each scale estimate an explicit confirmation status while preserving its measure, value, unit, and source.
4. `BriefDraftSchema` may contain tentative claims. New inferred claims remain tentative until an explicit caller-reported user confirmation promotes them.
5. `ConfirmedBriefSchema` accepts confirmed claims only. A draft must not become confirmed merely because it can be parsed into another schema. Actual promotion remains lifecycle work for C2.
6. Preserve the original source during confirmation. If a user confirms an agent inference, its source remains `inference` and its status becomes `confirmed`.
7. Remove the automatic `exploring` stage default if no source supports it. Let unknown optional information remain absent; do not invent a sourced claim to fill a field.
8. Keep open questions/unknowns explicit and separate from confirmed requirements. Unknown scale remains absent or explicitly unknown; never fill it with zero.
9. Update all existing fixture claims with truthful metadata. Where the fixture explicitly represents accepted user requirements, use `source: "user"` and `status: "confirmed"`. Do not guess metadata for external historical data.
10. Apply the claim and list limits from fix 7, and document the revised schema before building C1 consumers.

Example of a confirmed constraint:

```ts
{
  value: "Simple infrastructure",
  source: "user",
  status: "confirmed"
}
```

This is a recommended concrete schema refinement for the existing plan. It is not a requirement to build a provenance database, confirmation UI, or source lookup service in C0.

### Why this resolves it

Every requirement carries its origin and confirmation state across parsing and serialization. The later context engine can distinguish accepted requirements from tentative suggestions instead of treating every stored string as a fact.

### Required regression tests

- A brief draft can hold a tentative inferred constraint.
- The confirmed brief schema rejects that same tentative claim.
- A confirmed user requirement passes.
- Missing or invalid claim provenance fails.
- An explicitly confirmed inference retains `source: "inference"` after serialization.
- Partial drafts and missing scale remain valid without invented values or stage defaults.
- Update the existing snapshot/request fixture tests to use the revised brief shape.

**Done when:** all supported brief claims retain provenance and confirmation state, and draft information cannot silently become a confirmed requirement.

## Final verification and handoff

All project execution commands remain user-run under the rule recorded in `task_plan.md`. The agent can implement files and tests, but must hand off these commands rather than executing them.

From `F:\Flowy`, run:

```powershell
bun test
bunx tsc --noEmit
bunx tsc --noEmit -p packages/core/tsconfig.json
```

These checks serve different purposes: Bun tests verify behavior, the root compiler checks the workspace, and the package compiler checks its own configuration. A passing test run alone does not prove type correctness.

After implementation and successful user-run checks:

- Mark individual fixes complete only when their regression checks pass.
- Record command results and any remaining failures in `progress.md`.
- Update `task_plan.md` so its current phase matches C0's actual state.
- Update the README sentence claiming there is no application code yet to describe the implemented core foundation accurately.
- Mark C0 complete only when all eight fixes and relevant checks pass. C1 through C4 remain separate pending milestones.

The reviewed architecture boundary remains unchanged: the core returns advice and inert proposals; the host applies approved changes and reports their outcome.
