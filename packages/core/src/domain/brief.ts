import { z } from "zod";
import { LIMITS } from "./limits.ts";

export const ProvenanceSchema = z.enum(["user", "graph", "imported", "inference"]);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const ClaimStatusSchema = z.enum(["tentative", "confirmed"]);
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

export function createClaimSchema<T extends z.ZodTypeAny, S extends z.ZodTypeAny>(
  valueSchema: T,
  statusSchema: S
) {
  return z
    .object({
      value: valueSchema,
      source: ProvenanceSchema,
      status: statusSchema,
    })
    .strict();
}

export const ProjectStageSchema = z.enum([
  "exploring",
  "prototype",
  "production_planning",
  "reviewing",
]);
export type ProjectStage = z.infer<typeof ProjectStageSchema>;

// Scale Estimate
export const ConfirmedScaleEstimateSchema = z
  .object({
    measure: z.string().min(1).max(LIMITS.MAX_LABEL_LENGTH),
    value: z.union([z.string().max(LIMITS.MAX_LABEL_LENGTH), z.number().finite()]),
    unit: z.string().min(1).max(LIMITS.MAX_LABEL_LENGTH),
    source: ProvenanceSchema,
    status: z.literal("confirmed"),
  })
  .strict();
export type ConfirmedScaleEstimate = z.infer<typeof ConfirmedScaleEstimateSchema>;

export const DraftScaleEstimateSchema = z
  .object({
    measure: z.string().min(1).max(LIMITS.MAX_LABEL_LENGTH),
    value: z.union([z.string().max(LIMITS.MAX_LABEL_LENGTH), z.number().finite()]),
    unit: z.string().min(1).max(LIMITS.MAX_LABEL_LENGTH),
    source: ProvenanceSchema,
    status: ClaimStatusSchema,
  })
  .strict();
export type DraftScaleEstimate = z.infer<typeof DraftScaleEstimateSchema>;

// Claim Schemas with bounded string values
const TextClaimValueSchema = z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH);

export const ConfirmedTextClaimSchema = createClaimSchema(
  TextClaimValueSchema,
  z.literal("confirmed")
);
export type ConfirmedTextClaim = z.infer<typeof ConfirmedTextClaimSchema>;

export const DraftTextClaimSchema = createClaimSchema(
  TextClaimValueSchema,
  ClaimStatusSchema
);
export type DraftTextClaim = z.infer<typeof DraftTextClaimSchema>;

export const ConfirmedStageClaimSchema = createClaimSchema(
  ProjectStageSchema,
  z.literal("confirmed")
);
export type ConfirmedStageClaim = z.infer<typeof ConfirmedStageClaimSchema>;

export const DraftStageClaimSchema = createClaimSchema(
  ProjectStageSchema,
  ClaimStatusSchema
);
export type DraftStageClaim = z.infer<typeof DraftStageClaimSchema>;

// ConfirmedBriefSchema: ONLY confirmed claims allowed
export const ConfirmedBriefSchema = z
  .object({
    version: z.string().min(1).max(LIMITS.MAX_ID_LENGTH),
    confirmedBy: z.string().min(1).max(LIMITS.MAX_ID_LENGTH).optional(),
    confirmedAt: z.string().datetime().optional(),
    purpose: ConfirmedTextClaimSchema,
    intendedUsers: ConfirmedTextClaimSchema.optional(),
    keyFlows: z.array(ConfirmedTextClaimSchema).max(LIMITS.MAX_BRIEF_CLAIM_ITEMS).default([]),
    inScope: z.array(ConfirmedTextClaimSchema).max(LIMITS.MAX_BRIEF_CLAIM_ITEMS).default([]),
    outOfScope: z.array(ConfirmedTextClaimSchema).max(LIMITS.MAX_BRIEF_CLAIM_ITEMS).default([]),
    stage: ConfirmedStageClaimSchema.optional(),
    scale: z.record(z.string().max(LIMITS.MAX_LABEL_LENGTH), ConfirmedScaleEstimateSchema).default({}),
    constraints: z.array(ConfirmedTextClaimSchema).max(LIMITS.MAX_BRIEF_CLAIM_ITEMS).default([]),
    unknowns: z.array(z.string().max(LIMITS.MAX_TEXT_LENGTH)).max(LIMITS.MAX_UNRESOLVED_QUESTIONS).default([]),
  })
  .strict();
export type ConfirmedBrief = z.infer<typeof ConfirmedBriefSchema>;

// BriefDraftSchema: Tentative or confirmed claims allowed, all fields optional
export const BriefDraftSchema = z
  .object({
    purpose: DraftTextClaimSchema.optional(),
    intendedUsers: DraftTextClaimSchema.optional(),
    keyFlows: z.array(DraftTextClaimSchema).max(LIMITS.MAX_BRIEF_CLAIM_ITEMS).optional(),
    inScope: z.array(DraftTextClaimSchema).max(LIMITS.MAX_BRIEF_CLAIM_ITEMS).optional(),
    outOfScope: z.array(DraftTextClaimSchema).max(LIMITS.MAX_BRIEF_CLAIM_ITEMS).optional(),
    stage: DraftStageClaimSchema.optional(),
    scale: z.record(z.string().max(LIMITS.MAX_LABEL_LENGTH), DraftScaleEstimateSchema).optional(),
    constraints: z.array(DraftTextClaimSchema).max(LIMITS.MAX_BRIEF_CLAIM_ITEMS).optional(),
    unknowns: z.array(z.string().max(LIMITS.MAX_TEXT_LENGTH)).max(LIMITS.MAX_UNRESOLVED_QUESTIONS).optional(),
  })
  .strict();
export type BriefDraft = z.infer<typeof BriefDraftSchema>;
