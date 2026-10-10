import { z } from "zod";
import { EntityRefSchema, SnapshotRefSchema } from "./snapshot.ts";
import { RoomSnapshotSchema } from "./room-snapshot.ts";
import { LIMITS } from "./limits.ts";

export const CoreEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("room.opened"),
      snapshot: RoomSnapshotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("graph.semantic_changed"),
      entityRefs: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST),
      snapshotRef: SnapshotRefSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("graph.layout_changed"),
      entityRefs: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST),
      snapshotRef: SnapshotRefSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("focus.changed"),
      entityRefs: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST),
    })
    .strict(),
  z
    .object({
      type: z.literal("brief.changed"),
      snapshotRef: SnapshotRefSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("user.message"),
      messageId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      text: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
      entityRefs: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST).default([]),
    })
    .strict(),
  z
    .object({
      type: z.literal("question.answered"),
      questionId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      responseId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      text: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
    })
    .strict(),
  z
    .object({
      type: z.literal("proposal.response_recorded"),
      proposalId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      version: z.number().int().positive(),
      responseId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      action: z.enum(["approve", "reject", "defer", "revisit"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("proposal.outcome_reported"),
      proposalId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      version: z.number().int().positive(),
      result: z.enum(["applied", "conflict", "denied", "failed", "unknown"]),
      resultingSnapshotRef: SnapshotRefSchema.optional(),
      explanation: z.string().max(LIMITS.MAX_TEXT_LENGTH).optional(),
    })
    .strict(),
]);
export type CoreEvent = z.infer<typeof CoreEventSchema>;
