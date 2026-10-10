import { z } from "zod";
import { EntityRefSchema, SnapshotRefSchema } from "./snapshot.ts";
import { RoomSnapshotSchema } from "./room-snapshot.ts";
import { BriefDraftSchema } from "./brief.ts";
import { DecisionSchema, EvidenceRefSchema } from "./decisions.ts";
import { ProposalSchema } from "./proposal.ts";
import { checkJsonByteBudget, LIMITS } from "./limits.ts";

export const MessageSchema = z
  .object({
    id: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    role: z.enum(["user", "assistant"]),
    text: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
    createdAt: z.string().datetime(),
    entityRefs: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST).default([]),
  })
  .strict();
export type Message = z.infer<typeof MessageSchema>;

export const TriggerSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("room_opened"),
    })
    .strict(),
  z
    .object({
      type: z.literal("semantic_change"),
      entityRefs: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST),
    })
    .strict(),
  z
    .object({
      type: z.literal("user_message"),
      messageId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      text: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
      entityRefs: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST).default([]),
    })
    .strict(),
  z
    .object({
      type: z.literal("question_answer"),
      questionId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      responseId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      text: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
    })
    .strict(),
  z
    .object({
      type: z.literal("proposal_response"),
      proposalId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      version: z.number().int().positive(),
      responseId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      action: z.enum(["approve", "reject", "defer", "revisit"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("host_outcome"),
      proposalId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      version: z.number().int().positive(),
      result: z.enum(["applied", "conflict", "denied", "failed", "unknown"]),
      resultingSnapshotRef: SnapshotRefSchema.optional(),
    })
    .strict(),
]);
export type Trigger = z.infer<typeof TriggerSchema>;

export const AnalyzeRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    room: z
      .object({
        roomId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
      })
      .strict(),
    trigger: TriggerSchema,
    snapshot: RoomSnapshotSchema,
    recentMessages: z.array(MessageSchema).max(LIMITS.MAX_RECENT_MESSAGES).default([]),
    decisions: z.array(DecisionSchema).max(LIMITS.MAX_DECISIONS_COUNT).default([]),
    focus: z.array(EntityRefSchema).max(LIMITS.MAX_REFS_LIST).default([]),
  })
  .strict()
  .refine(
    (req) => checkJsonByteBudget(req).valid,
    {
      message: `AnalyzeRequest exceeds aggregate JSON byte budget of ${LIMITS.MAX_AGGREGATE_JSON_BYTES} bytes`,
    }
  );
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AgentDecisionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("silent"),
      reason: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
    })
    .strict(),
  z
    .object({
      kind: z.literal("ask"),
      text: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
      evidence: z.array(EvidenceRefSchema).max(LIMITS.MAX_REFS_LIST).default([]),
      briefDraft: BriefDraftSchema.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("answer"),
      text: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
      evidence: z.array(EvidenceRefSchema).max(LIMITS.MAX_REFS_LIST).default([]),
      limitations: z.array(z.string().max(LIMITS.MAX_TEXT_LENGTH)).max(LIMITS.MAX_TRADEOFFS_OR_LIMITATIONS).default([]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("propose"),
      title: z.string().min(1).max(LIMITS.MAX_LABEL_LENGTH),
      explanation: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
      tradeoffs: z.array(z.string().max(LIMITS.MAX_TEXT_LENGTH)).max(LIMITS.MAX_TRADEOFFS_OR_LIMITATIONS).default([]),
      evidence: z.array(EvidenceRefSchema).max(LIMITS.MAX_REFS_LIST).default([]),
      proposal: ProposalSchema,
    })
    .strict(),
]);
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

export const AnalyzeResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    turnId: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    sourceSnapshotRef: SnapshotRefSchema,
    decision: AgentDecisionSchema,
  })
  .strict()
  .refine(
    (res) => checkJsonByteBudget(res).valid,
    {
      message: `AnalyzeResponse exceeds aggregate JSON byte budget of ${LIMITS.MAX_AGGREGATE_JSON_BYTES} bytes`,
    }
  );
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
