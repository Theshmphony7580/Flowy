import { z } from "zod";
import { EntityRefSchema } from "./snapshot.ts";
import { ProvenanceSchema } from "./brief.ts";

export const EvidenceRefSchema = z.object({
  kind: z.enum(["node", "edge", "brief", "decision", "message"]),
  id: z.string().min(1),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const DecisionStatusSchema = z.enum(["accepted", "rejected", "deferred"]);
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;

export const DecisionSchema = z.object({
  decisionId: z.string().min(1),
  statement: z.string().min(1),
  status: DecisionStatusSchema,
  provenance: ProvenanceSchema,
  relatedEntityRefs: z.array(EntityRefSchema).default([]),
  sourceVersion: z.string().min(1),
  turnId: z.string().min(1),
  supersededBy: z.string().optional(),
});
export type Decision = z.infer<typeof DecisionSchema>;
