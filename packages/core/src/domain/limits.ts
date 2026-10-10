import { z } from "zod";

export const LIMITS = {
  MAX_ID_LENGTH: 256,
  MAX_LABEL_LENGTH: 512,
  MAX_TEXT_LENGTH: 8192,
  MAX_PROPERTY_KEY_LENGTH: 128,
  MAX_PROPERTY_STRING_LENGTH: 4096,
  MAX_PROPERTIES_COUNT: 64,
  MAX_NODES_PER_SNAPSHOT: 1000,
  MAX_EDGES_PER_SNAPSHOT: 4000,
  MAX_OPERATIONS_PER_PROPOSAL: 100,
  MAX_RECENT_MESSAGES: 50,
  MAX_DECISIONS_COUNT: 100,
  MAX_UNRESOLVED_QUESTIONS: 100,
  MAX_BRIEF_CLAIM_ITEMS: 100,
  MAX_COVERAGE_REFS: 5000,
  MAX_REFS_LIST: 100,
  MAX_PREVIEW_NODES: 1000,
  MAX_PREVIEW_EDGES: 4000,
  MAX_TRADEOFFS_OR_LIMITATIONS: 100,
  MAX_AGGREGATE_JSON_BYTES: 1024 * 1024, // 1 MiB UTF-8
} as const;

export const PropertyValueSchema = z.union([
  z.string().max(LIMITS.MAX_PROPERTY_STRING_LENGTH),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
export type PropertyValue = z.infer<typeof PropertyValueSchema>;

export const PropertiesSchema = z
  .record(
    z.string().min(1).max(LIMITS.MAX_PROPERTY_KEY_LENGTH),
    PropertyValueSchema
  )
  .refine(
    (record) => Object.keys(record).length <= LIMITS.MAX_PROPERTIES_COUNT,
    {
      message: `Properties record cannot exceed ${LIMITS.MAX_PROPERTIES_COUNT} keys`,
    }
  );
export type Properties = z.infer<typeof PropertiesSchema>;

/**
 * Calculates UTF-8 byte length of a JSON-serializable value and verifies it is within budget.
 */
export function checkJsonByteBudget(
  value: unknown,
  maxBytes: number = LIMITS.MAX_AGGREGATE_JSON_BYTES
): { valid: boolean; bytes: number } {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) {
      return { valid: true, bytes: 0 };
    }
    const bytes = new TextEncoder().encode(json).length;
    return {
      valid: bytes <= maxBytes,
      bytes,
    };
  } catch {
    return { valid: false, bytes: Infinity };
  }
}
