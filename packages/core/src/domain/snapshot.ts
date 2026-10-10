import { z } from "zod";
import { LIMITS, PropertiesSchema } from "./limits.ts";

export const EntityRefSchema = z
  .object({
    kind: z.enum(["node", "edge"]),
    id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
  })
  .strict();
export type EntityRef = z.infer<typeof EntityRefSchema>;

export const SnapshotRefSchema = z
  .object({
    semanticVersion: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    layoutVersion: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
  })
  .strict();
export type SnapshotRef = z.infer<typeof SnapshotRefSchema>;

export const WorldLayoutSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
  })
  .strict();
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

export const ArchitectureNodeSchema = z
  .object({
    id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    kind: NodeKindSchema,
    label: z.string().min(1).max(LIMITS.MAX_LABEL_LENGTH),
    description: z.string().max(LIMITS.MAX_TEXT_LENGTH).optional(),
    boundaryId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH).optional(),
    properties: PropertiesSchema.default({}),
    layout: WorldLayoutSchema,
  })
  .strict();
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

export const ArchitectureEdgeSchema = z
  .object({
    id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    from: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    to: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    kind: EdgeKindSchema,
    label: z.string().max(LIMITS.MAX_LABEL_LENGTH).optional(),
    protocol: z.string().max(LIMITS.MAX_LABEL_LENGTH).optional(),
    mode: EdgeModeSchema.default("unknown"),
    properties: PropertiesSchema.default({}),
  })
  .strict();
export type ArchitectureEdge = z.infer<typeof ArchitectureEdgeSchema>;

export const CoverageSchema = z
  .object({
    scope: z.enum(["whole_room", "region"]),
    complete: z.boolean(),
    synchronized: z.boolean(),
    included: z.array(EntityRefSchema).max(LIMITS.MAX_COVERAGE_REFS),
    omittedEntityCount: z.number().int().nonnegative().optional(),
    limitations: z.array(z.string().max(LIMITS.MAX_TEXT_LENGTH)).max(LIMITS.MAX_TRADEOFFS_OR_LIMITATIONS).default([]),
  })
  .strict();
export type Coverage = z.infer<typeof CoverageSchema>;
