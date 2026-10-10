import { z } from "zod";
import {
  ArchitectureEdgeSchema,
  ArchitectureNodeSchema,
  EntityRefSchema,
  SnapshotRefSchema,
} from "./snapshot.ts";
import { OperationSchema } from "./operations.ts";
import { LIMITS } from "./limits.ts";

export const ProposalPreconditionsSchema = z
  .object({
    semanticVersion: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    layoutVersion: z.string().min(1).max(LIMITS.MAX_ID_LENGTH).optional(),
  })
  .strict();
export type ProposalPreconditions = z.infer<typeof ProposalPreconditionsSchema>;

export const ProposalPreviewSchema = z
  .object({
    addedNodes: z.array(ArchitectureNodeSchema).max(LIMITS.MAX_PREVIEW_NODES).default([]),
    removedNodeIds: z.array(z.string().max(LIMITS.MAX_ID_LENGTH)).max(LIMITS.MAX_PREVIEW_NODES).default([]),
    addedEdges: z.array(ArchitectureEdgeSchema).max(LIMITS.MAX_PREVIEW_EDGES).default([]),
    removedEdgeIds: z.array(z.string().max(LIMITS.MAX_ID_LENGTH)).max(LIMITS.MAX_PREVIEW_EDGES).default([]),
    modifiedNodeIds: z.array(z.string().max(LIMITS.MAX_ID_LENGTH)).max(LIMITS.MAX_PREVIEW_NODES).default([]),
    modifiedEdgeIds: z.array(z.string().max(LIMITS.MAX_ID_LENGTH)).max(LIMITS.MAX_PREVIEW_EDGES).default([]),
  })
  .strict();
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

export const ProposalSchema = z
  .object({
    proposalId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    version: z.number().int().positive(),
    digest: z.string().length(64), // SHA-256 hex exactly 64 chars
    sourceSnapshotRef: SnapshotRefSchema,
    operations: z.array(OperationSchema).max(LIMITS.MAX_OPERATIONS_PER_PROPOSAL),
    preconditions: ProposalPreconditionsSchema,
    affectedEntityRefs: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST),
    preview: ProposalPreviewSchema,
    status: ProposalStatusSchema.default("drafted"),
  })
  .strict();
export type Proposal = z.infer<typeof ProposalSchema>;
