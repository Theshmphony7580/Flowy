import { z } from "zod";
import { EntityRefSchema, SnapshotRefSchema } from "./snapshot.ts";
import { RoomSnapshotSchema } from "./room-snapshot.ts";

export const CoreEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("room.opened"),
    snapshot: RoomSnapshotSchema,
  }),
  z.object({
    type: z.literal("graph.semantic_changed"),
    entityRefs: z.array(EntityRefSchema),
    snapshotRef: SnapshotRefSchema,
  }),
  z.object({
    type: z.literal("graph.layout_changed"),
    entityRefs: z.array(EntityRefSchema),
    snapshotRef: SnapshotRefSchema,
  }),
  z.object({
    type: z.literal("focus.changed"),
    entityRefs: z.array(EntityRefSchema),
  }),
  z.object({
    type: z.literal("brief.changed"),
    snapshotRef: SnapshotRefSchema,
  }),
  z.object({
    type: z.literal("user.message"),
    messageId: z.string().min(1),
    text: z.string().min(1),
    entityRefs: z.array(EntityRefSchema).default([]),
  }),
  z.object({
    type: z.literal("question.answered"),
    questionId: z.string().min(1),
    responseId: z.string().min(1),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("proposal.response_recorded"),
    proposalId: z.string().min(1),
    version: z.number().int().positive(),
    responseId: z.string().min(1),
    action: z.enum(["approve", "reject", "defer", "revisit"]),
  }),
  z.object({
    type: z.literal("proposal.outcome_reported"),
    proposalId: z.string().min(1),
    version: z.number().int().positive(),
    result: z.enum(["applied", "conflict", "denied", "failed", "unknown"]),
    resultingSnapshotRef: SnapshotRefSchema.optional(),
    explanation: z.string().optional(),
  }),
]);
export type CoreEvent = z.infer<typeof CoreEventSchema>;
