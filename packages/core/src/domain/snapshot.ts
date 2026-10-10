import { z } from "zod";

export const EntityRefSchema = z.object({
  kind: z.enum(["node", "edge"]),
  id: z.string().min(1),
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

export const SnapshotRefSchema = z.object({
  semanticVersion: z.string().min(1),
  layoutVersion: z.string().min(1),
});
export type SnapshotRef = z.infer<typeof SnapshotRefSchema>;

export const WorldLayoutSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
export type WorldLayout = z.infer<typeof WorldLayoutSchema>;

export const NodeKindSchema = z.enum([
  "client",
  "service",
  "database",
  "queue",
  "cache",
  "external",
  "boundary",
  "unknown",
  "custom",
]);
export type NodeKind = z.infer<typeof NodeKindSchema>;

export const ArchitectureNodeSchema = z.object({
  id: z.string().min(1),
  kind: NodeKindSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  boundaryId: z.string().min(1).optional(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  layout: WorldLayoutSchema,
});
export type ArchitectureNode = z.infer<typeof ArchitectureNodeSchema>;

export const EdgeKindSchema = z.enum([
  "request",
  "publish",
  "consume",
  "read",
  "write",
  "unknown",
]);
export type EdgeKind = z.infer<typeof EdgeKindSchema>;

export const EdgeModeSchema = z.enum(["sync", "async", "unknown"]);
export type EdgeMode = z.infer<typeof EdgeModeSchema>;

export const ArchitectureEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: EdgeKindSchema,
  label: z.string().optional(),
  protocol: z.string().optional(),
  mode: EdgeModeSchema.default("unknown"),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});
export type ArchitectureEdge = z.infer<typeof ArchitectureEdgeSchema>;

export const CoverageSchema = z.object({
  scope: z.enum(["whole_room", "region"]),
  complete: z.boolean(),
  synchronized: z.boolean(),
  included: z.array(EntityRefSchema),
  omittedEntityCount: z.number().int().nonnegative().optional(),
  limitations: z.array(z.string()).default([]),
});
export type Coverage = z.infer<typeof CoverageSchema>;
