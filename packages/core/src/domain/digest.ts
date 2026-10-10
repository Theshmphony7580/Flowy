import { createHash } from "node:crypto";
import type { Operation } from "./operations.ts";
import type { ProposalPreconditions } from "./proposal.ts";
import type { SnapshotRef } from "./snapshot.ts";

export function canonicalJsonStringify(val: unknown): string {
  if (typeof val === "number") {
    if (!Number.isFinite(val)) {
      throw new Error("Non-finite numbers cannot be serialized in proposal digest");
    }
    return JSON.stringify(val);
  }

  if (typeof val === "string" || typeof val === "boolean") {
    return JSON.stringify(val);
  }

  if (val === null) {
    return "null";
  }

  if (val === undefined) {
    throw new Error("Undefined values cannot be serialized in arrays or root values");
  }

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      if (val[i] === undefined) {
        throw new Error(`Array entry at index ${i} is undefined`);
      }
    }
    return "[" + val.map((item) => canonicalJsonStringify(item)).join(",") + "]";
  }

  if (typeof val === "object") {
    const record = val as Record<string, unknown>;
    // Omit keys with undefined values, then sort remaining keys
    const sortedKeys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();

    const entries = sortedKeys.map(
      (key) => `${JSON.stringify(key)}:${canonicalJsonStringify(record[key])}`
    );
    return "{" + entries.join(",") + "}";
  }

  throw new Error(`Unsupported value type for digest: ${typeof val}`);
}

export type DigestPayload = {
  schemaVersion: 1;
  sourceSnapshotRef: SnapshotRef;
  preconditions: ProposalPreconditions;
  operations: Operation[];
};

export function computeProposalDigest(payload: DigestPayload): string {
  const canonicalJson = canonicalJsonStringify(payload);
  return createHash("sha256").update(canonicalJson).digest("hex");
}
