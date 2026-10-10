import { z } from "zod";
import {
  ArchitectureEdgeSchema,
  ArchitectureNodeSchema,
  CoverageSchema,
  SnapshotRefSchema,
} from "./snapshot.ts";
import { ConfirmedBriefSchema } from "./brief.ts";
import { DecisionSchema } from "./decisions.ts";
import { checkJsonByteBudget, LIMITS } from "./limits.ts";

export const RoomSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    roomId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    ref: SnapshotRefSchema,
    observedAt: z.string().datetime(),
    nodes: z.array(ArchitectureNodeSchema).max(LIMITS.MAX_NODES_PER_SNAPSHOT),
    edges: z.array(ArchitectureEdgeSchema).max(LIMITS.MAX_EDGES_PER_SNAPSHOT),
    brief: ConfirmedBriefSchema.nullable(),
    coverage: CoverageSchema,
    decisions: z.array(DecisionSchema).max(LIMITS.MAX_DECISIONS_COUNT).default([]),
    unresolvedQuestions: z
      .array(z.string().max(LIMITS.MAX_TEXT_LENGTH))
      .max(LIMITS.MAX_UNRESOLVED_QUESTIONS)
      .default([]),
  })
  .strict()
  .refine(
    (snap) => checkJsonByteBudget(snap).valid,
    {
      message: `RoomSnapshot exceeds aggregate JSON byte budget of ${LIMITS.MAX_AGGREGATE_JSON_BYTES} bytes`,
    }
  );
export type RoomSnapshot = z.infer<typeof RoomSnapshotSchema>;
