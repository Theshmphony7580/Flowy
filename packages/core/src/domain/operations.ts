import { z } from "zod";
import {
  ArchitectureEdgeSchema,
  ArchitectureNodeSchema,
  EdgeKindSchema,
  EdgeModeSchema,
  NodeKindSchema,
  WorldLayoutSchema,
} from "./snapshot.ts";
import { LIMITS, PropertiesSchema } from "./limits.ts";

export const SupportedNodeChangesSchema = z
  .object({
    label: z.string().min(1).max(LIMITS.MAX_LABEL_LENGTH).optional(),
    description: z.string().max(LIMITS.MAX_TEXT_LENGTH).optional(),
    kind: NodeKindSchema.optional(),
    boundaryId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH).nullable().optional(),
    properties: PropertiesSchema.optional(),
  })
  .strict()
  .refine(
    (changes) => {
      const definedKeys = Object.entries(changes).filter(([_, v]) => v !== undefined);
      if (definedKeys.length === 0) {
        return false;
      }
      if (definedKeys.length === 1 && definedKeys[0]![0] === "properties") {
        return Object.keys(changes.properties ?? {}).length > 0;
      }
      return true;
    },
    {
      message: "Node update must contain at least one defined change; empty updates and empty properties are rejected",
    }
  );
export type SupportedNodeChanges = z.infer<typeof SupportedNodeChangesSchema>;

export const SupportedEdgeChangesSchema = z
  .object({
    label: z.string().max(LIMITS.MAX_LABEL_LENGTH).optional(),
    kind: EdgeKindSchema.optional(),
    protocol: z.string().max(LIMITS.MAX_LABEL_LENGTH).optional(),
    mode: EdgeModeSchema.optional(),
    properties: PropertiesSchema.optional(),
  })
  .strict()
  .refine(
    (changes) => {
      const definedKeys = Object.entries(changes).filter(([_, v]) => v !== undefined);
      if (definedKeys.length === 0) {
        return false;
      }
      if (definedKeys.length === 1 && definedKeys[0]![0] === "properties") {
        return Object.keys(changes.properties ?? {}).length > 0;
      }
      return true;
    },
    {
      message: "Edge update must contain at least one defined change; empty updates and empty properties are rejected",
    }
  );
export type SupportedEdgeChanges = z.infer<typeof SupportedEdgeChangesSchema>;

export const OperationSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("add_node"),
      node: ArchitectureNodeSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("update_node"),
      id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      changes: SupportedNodeChangesSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("move_node"),
      id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      layout: WorldLayoutSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("remove_node"),
      id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    })
    .strict(),
  z
    .object({
      type: z.literal("add_edge"),
      edge: ArchitectureEdgeSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("update_edge"),
      id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      changes: SupportedEdgeChangesSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("remove_edge"),
      id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    })
    .strict(),
]);
export type Operation = z.infer<typeof OperationSchema>;
