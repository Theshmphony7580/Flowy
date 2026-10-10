import { z } from "zod";
import { EntityRefSchema } from "./snapshot.ts";
import { ProvenanceSchema } from "./brief.ts";
import { LIMITS } from "./limits.ts";

export const EvidenceRefSchema = z
  .object({
    kind: z.enum(["node", "edge", "brief", "decision", "message"]),
    id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
  })
  .strict();
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const DecisionStatusSchema = z.enum(["accepted", "rejected", "deferred"]);
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;

export const DecisionSchema = z
  .object({
    decisionId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    statement: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
    status: DecisionStatusSchema,
    provenance: ProvenanceSchema,
    relatedEntityRefs: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST).default([]),
    sourceVersion: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    turnId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    supersededBy: z.string().min(1).max(LIMITS.MAX_ID_LENGTH).optional(),
  })
  .strict();
export type Decision = z.infer<typeof DecisionSchema>;
