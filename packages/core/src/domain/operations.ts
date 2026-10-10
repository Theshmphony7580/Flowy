import { z } from "zod";
import {
  ArchitectureEdgeSchema,
  ArchitectureNodeSchema,
  EdgeKindSchema,
  EdgeModeSchema,
  NodeKindSchema,
  WorldLayoutSchema,
} from "./snapshot.ts";

export const SupportedNodeChangesSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  kind: NodeKindSchema.optional(),
  boundaryId: z.string().nullable().optional(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type SupportedNodeChanges = z.infer<typeof SupportedNodeChangesSchema>;

export const SupportedEdgeChangesSchema = z.object({
  label: z.string().optional(),
  kind: EdgeKindSchema.optional(),
  protocol: z.string().optional(),
  mode: EdgeModeSchema.optional(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type SupportedEdgeChanges = z.infer<typeof SupportedEdgeChangesSchema>;

export const OperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add_node"),
    node: ArchitectureNodeSchema,
  }),
  z.object({
    type: z.literal("update_node"),
    id: z.string().min(1),
    changes: SupportedNodeChangesSchema,
  }),
  z.object({
    type: z.literal("move_node"),
    id: z.string().min(1),
    layout: WorldLayoutSchema,
  }),
  z.object({
    type: z.literal("remove_node"),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("add_edge"),
    edge: ArchitectureEdgeSchema,
  }),
  z.object({
    type: z.literal("update_edge"),
    id: z.string().min(1),
    changes: SupportedEdgeChangesSchema,
  }),
  z.object({
    type: z.literal("remove_edge"),
    id: z.string().min(1),
  }),
]);
export type Operation = z.infer<typeof OperationSchema>;
