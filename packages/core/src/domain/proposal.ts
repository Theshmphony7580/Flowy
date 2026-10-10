import { z } from "zod";
import {
  ArchitectureEdgeSchema,
  ArchitectureNodeSchema,
  EntityRefSchema,
  SnapshotRefSchema,
} from "./snapshot.ts";
import { OperationSchema } from "./operations.ts";
import { EvidenceRefSchema } from "./decisions.ts";

export const ProposalPreconditionsSchema = z.object({
  semanticVersion: z.string().min(1),
  layoutVersion: z.string().optional(),
});
export type ProposalPreconditions = z.infer<typeof ProposalPreconditionsSchema>;

export const ProposalPreviewSchema = z.object({
  addedNodes: z.array(ArchitectureNodeSchema).default([]),
  removedNodeIds: z.array(z.string()).default([]),
  addedEdges: z.array(ArchitectureEdgeSchema).default([]),
  removedEdgeIds: z.array(z.string()).default([]),
  modifiedNodeIds: z.array(z.string()).default([]),
  modifiedEdgeIds: z.array(z.string()).default([]),
});
export type ProposalPreview = z.infer<typeof ProposalPreviewSchema>;

export const ProposalStatusSchema = z.enum([
  "drafted",
  "returned_to_host",
  "awaiting_host_outcome",
  "applied",
  "conflict",
  "denied",
  "failed",
  "unknown",
  "rejected",
  "deferred",
  "expired",
  "superseded",
]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalSchema = z.object({
  proposalId: z.string().min(1),
  version: z.number().int().positive(),
  digest: z.string().min(64), // SHA-256 hex
  sourceSnapshotRef: SnapshotRefSchema,
  operations: z.array(OperationSchema),
  preconditions: ProposalPreconditionsSchema,
  affectedEntityRefs: z.array(EntityRefSchema),
  preview: ProposalPreviewSchema,
  status: ProposalStatusSchema.default("drafted"),
});
export type Proposal = z.infer<typeof ProposalSchema>;
