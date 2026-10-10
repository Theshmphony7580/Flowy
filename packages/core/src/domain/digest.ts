import { createHash } from "node:crypto";
import type { Operation } from "./operations.ts";
import type { ProposalPreconditions } from "./proposal.ts";
import type { SnapshotRef } from "./snapshot.ts";

function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalStringify(item)).join(",") + "]";
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`
  );
  return "{" + entries.join(",") + "}";
}

export type DigestPayload = {
  schemaVersion: 1;
  sourceSnapshotRef: SnapshotRef;
  preconditions: ProposalPreconditions;
  operations: Operation[];
};

export function computeProposalDigest(payload: DigestPayload): string {
  const canonicalJson = canonicalStringify(payload);
  return createHash("sha256").update(canonicalJson).digest("hex");
}
