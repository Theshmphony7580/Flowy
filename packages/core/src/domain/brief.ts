import { z } from "zod";

export const ProvenanceSchema = z.enum(["user", "graph", "imported", "inference"]);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const ScaleEstimateSchema = z.object({
  measure: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  unit: z.string().min(1),
  source: ProvenanceSchema,
});
export type ScaleEstimate = z.infer<typeof ScaleEstimateSchema>;

export const ProjectStageSchema = z.enum([
  "exploring",
  "prototype",
  "production_planning",
  "reviewing",
]);
export type ProjectStage = z.infer<typeof ProjectStageSchema>;

export const ConfirmedBriefSchema = z.object({
  version: z.string().min(1),
  confirmedBy: z.string().optional(),
  confirmedAt: z.string().optional(),
  purpose: z.string().min(1),
  intendedUsers: z.string().default(""),
  keyFlows: z.array(z.string()).default([]),
  inScope: z.array(z.string()).default([]),
  outOfScope: z.array(z.string()).default([]),
  stage: ProjectStageSchema.default("exploring"),
  scale: z.record(ScaleEstimateSchema).default({}),
  constraints: z.array(z.string()).default([]),
  unknowns: z.array(z.string()).default([]),
});
export type ConfirmedBrief = z.infer<typeof ConfirmedBriefSchema>;

export const BriefDraftSchema = z.object({
  purpose: z.string().optional(),
  intendedUsers: z.string().optional(),
  keyFlows: z.array(z.string()).optional(),
  inScope: z.array(z.string()).optional(),
  outOfScope: z.array(z.string()).optional(),
  stage: ProjectStageSchema.optional(),
  scale: z.record(ScaleEstimateSchema).optional(),
  constraints: z.array(z.string()).optional(),
  unknowns: z.array(z.string()).optional(),
});
export type BriefDraft = z.infer<typeof BriefDraftSchema>;
