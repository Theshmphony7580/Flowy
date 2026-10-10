import { z } from "zod";
import {
  ArchitectureEdgeSchema,
  ArchitectureNodeSchema,
  CoverageSchema,
  SnapshotRefSchema,
} from "./snapshot.ts";
import { ConfirmedBriefSchema } from "./brief.ts";
import { DecisionSchema } from "./decisions.ts";

export const RoomSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  roomId: z.string().min(1),
  ref: SnapshotRefSchema,
  observedAt: z.string().datetime(),
  nodes: z.array(ArchitectureNodeSchema),
  edges: z.array(ArchitectureEdgeSchema),
  brief: ConfirmedBriefSchema.nullable(),
  coverage: CoverageSchema,
  decisions: z.array(DecisionSchema).default([]),
  unresolvedQuestions: z.array(z.string()).default([]),
});
export type RoomSnapshot = z.infer<typeof RoomSnapshotSchema>;
