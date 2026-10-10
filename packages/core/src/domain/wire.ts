import { z } from "zod";
import { EntityRefSchema, SnapshotRefSchema } from "./snapshot.ts";
import { RoomSnapshotSchema } from "./room-snapshot.ts";
import { BriefDraftSchema } from "./brief.ts";
import { DecisionSchema, EvidenceRefSchema } from "./decisions.ts";
import { ProposalSchema } from "./proposal.ts";

export const MessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1),
  createdAt: z.string().datetime(),
  entityRefs: z.array(EntityRefSchema).default([]),
});
export type Message = z.infer<typeof MessageSchema>;

export const TriggerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("room_opened"),
  }),
  z.object({
    type: z.literal("semantic_change"),
    entityRefs: z.array(EntityRefSchema),
  }),
  z.object({
    type: z.literal("user_message"),
    messageId: z.string().min(1),
    text: z.string().min(1),
    entityRefs: z.array(EntityRefSchema).default([]),
  }),
  z.object({
    type: z.literal("question_answer"),
    questionId: z.string().min(1),
    responseId: z.string().min(1),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("proposal_response"),
    proposalId: z.string().min(1),
    version: z.number().int().positive(),
    responseId: z.string().min(1),
    action: z.enum(["approve", "reject", "defer", "revisit"]),
  }),
  z.object({
    type: z.literal("host_outcome"),
    proposalId: z.string().min(1),
    version: z.number().int().positive(),
    result: z.enum(["applied", "conflict", "denied", "failed", "unknown"]),
    resultingSnapshotRef: SnapshotRefSchema.optional(),
  }),
]);
export type Trigger = z.infer<typeof TriggerSchema>;

export const AnalyzeRequestSchema = z.object({
  schemaVersion: z.literal(1),
  requestId: z.string().min(1),
  room: z.object({
    roomId: z.string().min(1),
  }),
  trigger: TriggerSchema,
  snapshot: RoomSnapshotSchema,
  recentMessages: z.array(MessageSchema).default([]),
  decisions: z.array(DecisionSchema).default([]),
  focus: z.array(EntityRefSchema).default([]),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AgentDecisionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("silent"),
    reason: z.string().min(1),
  }),
  z.object({
    kind: z.literal("ask"),
    text: z.string().min(1),
    evidence: z.array(EvidenceRefSchema).default([]),
    briefDraft: BriefDraftSchema.optional(),
  }),
  z.object({
    kind: z.literal("answer"),
    text: z.string().min(1),
    evidence: z.array(EvidenceRefSchema).default([]),
    limitations: z.array(z.string()).default([]),
  }),
  z.object({
    kind: z.literal("propose"),
    title: z.string().min(1),
    explanation: z.string().min(1),
    tradeoffs: z.array(z.string()).default([]),
    evidence: z.array(EvidenceRefSchema).default([]),
    proposal: ProposalSchema,
  }),
]);
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

export const AnalyzeResponseSchema = z.object({
  schemaVersion: z.literal(1),
  requestId: z.string().min(1),
  turnId: z.string().min(1),
  sourceSnapshotRef: SnapshotRefSchema,
  decision: AgentDecisionSchema,
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
