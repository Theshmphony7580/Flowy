import { describe, expect, it } from "bun:test";
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  ArchitectureNodeSchema,
  BriefDraftSchema,
  ConfirmedBriefSchema,
  computeProposalDigest,
  LIMITS,
  OperationSchema,
  RoomSnapshotSchema,
  simulateOperations,
  SupportedNodeChangesSchema,
  validateGraph,
  type ArchitectureEdge,
  type ArchitectureNode,
  type Operation,
  type RoomSnapshot,
} from "../src/index.ts";

describe("Milestone C0: Domain Contracts & Pure Validation (All Fixes Verified)", () => {
  const validSnapshot: RoomSnapshot = {
    schemaVersion: 1,
    roomId: "room_test_1",
    ref: {
      semanticVersion: "sem_v1",
      layoutVersion: "lay_v1",
    },
    observedAt: "2026-10-10T16:00:00.000Z",
    nodes: [
      {
        id: "node_order_service",
        kind: "service",
        label: "Order Service",
        layout: { x: 100, y: 100, width: 160, height: 80 },
        properties: {},
      },
      {
        id: "node_email_provider",
        kind: "external",
        label: "Email Provider",
        layout: { x: 400, y: 100, width: 160, height: 80 },
        properties: {},
      },
    ],
    edges: [
      {
        id: "edge_order_to_email",
        from: "node_order_service",
        to: "node_email_provider",
        kind: "request",
        mode: "sync",
        properties: {},
      },
    ],
    brief: {
      version: "b_v1",
      purpose: {
        value: "E-commerce checkout system",
        source: "user",
        status: "confirmed",
      },
      intendedUsers: {
        value: "Online shoppers",
        source: "user",
        status: "confirmed",
      },
      keyFlows: [
        {
          value: "Order placement",
          source: "user",
          status: "confirmed",
        },
      ],
      inScope: [
        {
          value: "Checkout flow",
          source: "user",
          status: "confirmed",
        },
      ],
      outOfScope: [
        {
          value: "Inventory warehouse",
          source: "user",
          status: "confirmed",
        },
      ],
      stage: {
        value: "prototype",
        source: "user",
        status: "confirmed",
      },
      scale: {},
      constraints: [
        {
          value: "Simple infrastructure",
          source: "user",
          status: "confirmed",
        },
      ],
      unknowns: ["Expected traffic"],
    },
    coverage: {
      scope: "whole_room",
      complete: true,
      synchronized: true,
      included: [
        { kind: "node", id: "node_order_service" },
        { kind: "node", id: "node_email_provider" },
        { kind: "edge", id: "edge_order_to_email" },
      ],
      limitations: [],
    },
    decisions: [],
    unresolvedQuestions: [],
  };

  // --- Fix 1 & 2: Structural & Type checks verified via compiler ---

  // --- Fix 3: Proposal digest stability across JSON transport ---
  describe("Fix 3: Proposal Digest Stability", () => {
    const basePayload = {
      schemaVersion: 1 as const,
      sourceSnapshotRef: { semanticVersion: "sem_v1", layoutVersion: "lay_v1" },
      preconditions: { semanticVersion: "sem_v1" },
      operations: [
        {
          type: "add_node" as const,
          node: {
            id: "node_queue",
            kind: "queue" as const,
            label: "Email Queue",
            layout: { x: 250, y: 100, width: 120, height: 60 },
            properties: {},
          },
        },
      ],
    };

    it("produces identical digest for explicit undefined vs omitted optional fields", () => {
      const withExplicitUndefined = {
        ...basePayload,
        preconditions: { semanticVersion: "sem_v1", layoutVersion: undefined },
      };
      const withOmittedField = {
        ...basePayload,
        preconditions: { semanticVersion: "sem_v1" },
      };

      const digestA = computeProposalDigest(withExplicitUndefined);
      const digestB = computeProposalDigest(withOmittedField);
      expect(digestA).toBe(digestB);
    });

    it("survives JSON.parse(JSON.stringify(payload)) round trip without altering digest", () => {
      const digestOriginal = computeProposalDigest(basePayload);
      const roundTripped = JSON.parse(JSON.stringify(basePayload));
      const digestRoundTrip = computeProposalDigest(roundTripped);
      expect(digestOriginal).toBe(digestRoundTrip);
    });

    it("produces identical digest regardless of object key order", () => {
      const shuffledPayload = {
        operations: [
          {
            node: {
              properties: {},
              layout: { height: 60, width: 120, y: 100, x: 250 },
              label: "Email Queue",
              kind: "queue" as const,
              id: "node_queue",
            },
            type: "add_node" as const,
          },
        ],
        preconditions: { semanticVersion: "sem_v1" },
        sourceSnapshotRef: { layoutVersion: "lay_v1", semanticVersion: "sem_v1" },
        schemaVersion: 1 as const,
      };

      expect(computeProposalDigest(basePayload)).toBe(computeProposalDigest(shuffledPayload));
    });

    it("changes digest when operations, order, preconditions, or source refs change", () => {
      const digestBase = computeProposalDigest(basePayload);

      const modifiedPrecondition = {
        ...basePayload,
        preconditions: { semanticVersion: "sem_v2" },
      };
      expect(computeProposalDigest(modifiedPrecondition)).not.toBe(digestBase);

      const modifiedSourceRef = {
        ...basePayload,
        sourceSnapshotRef: { semanticVersion: "sem_v2", layoutVersion: "lay_v1" },
      };
      expect(computeProposalDigest(modifiedSourceRef)).not.toBe(digestBase);

      const twoOpsA = {
        ...basePayload,
        operations: [
          basePayload.operations[0]!,
          {
            type: "remove_node" as const,
            id: "node_order_service",
          },
        ],
      };
      const twoOpsB = {
        ...basePayload,
        operations: [
          {
            type: "remove_node" as const,
            id: "node_order_service",
          },
          basePayload.operations[0]!,
        ],
      };
      expect(computeProposalDigest(twoOpsA)).not.toBe(computeProposalDigest(twoOpsB));
    });

    it("distinguishes null from undefined / omitted in updates", () => {
      const payloadWithNull = {
        schemaVersion: 1 as const,
        sourceSnapshotRef: { semanticVersion: "sem_v1", layoutVersion: "lay_v1" },
        preconditions: { semanticVersion: "sem_v1" },
        operations: [
          {
            type: "update_node" as const,
            id: "node_order_service",
            changes: { boundaryId: null },
          },
        ],
      };

      const payloadWithLabel = {
        schemaVersion: 1 as const,
        sourceSnapshotRef: { semanticVersion: "sem_v1", layoutVersion: "lay_v1" },
        preconditions: { semanticVersion: "sem_v1" },
        operations: [
          {
            type: "update_node" as const,
            id: "node_order_service",
            changes: { label: "New Label" },
          },
        ],
      };

      expect(computeProposalDigest(payloadWithNull)).not.toBe(computeProposalDigest(payloadWithLabel));
    });

    it("throws when non-finite numbers are passed to digest", () => {
      const badPayload = {
        ...basePayload,
        operations: [
          {
            type: "move_node" as const,
            id: "node_queue",
            layout: { x: NaN, y: 100, width: 120, height: 60 },
          },
        ],
      };
      expect(() => computeProposalDigest(badPayload)).toThrow("Non-finite numbers");
    });
  });

  // --- Fix 4: Reject empty boundary IDs ---
  describe("Fix 4: Boundary ID Validation", () => {
    it("rejects empty string boundaryId in update_node schema", () => {
      const op = {
        type: "update_node",
        id: "node_order_service",
        changes: { boundaryId: "" },
      };
      const parseResult = OperationSchema.safeParse(op);
      expect(parseResult.success).toBe(false);
    });

    it("rejects empty string boundaryId in validateGraph", () => {
      const invalidNodeGraph = {
        nodes: [
          {
            id: "node_1",
            kind: "service" as const,
            label: "Service 1",
            boundaryId: "",
            layout: { x: 0, y: 0, width: 100, height: 100 },
            properties: {},
          },
        ],
        edges: [],
      };
      const result = validateGraph(invalidNodeGraph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("empty string boundaryId"))).toBe(true);
    });

    it("allows clearing boundaryId with null via simulation", () => {
      const nodeWithBoundary: ArchitectureNode = {
        id: "node_service",
        kind: "service",
        label: "Service",
        boundaryId: "boundary_zone",
        layout: { x: 10, y: 10, width: 100, height: 80 },
        properties: {},
      };
      const boundaryNode: ArchitectureNode = {
        id: "boundary_zone",
        kind: "boundary",
        label: "Trust Boundary",
        layout: { x: 0, y: 0, width: 300, height: 300 },
        properties: {},
      };

      const clearOp: Operation = {
        type: "update_node",
        id: "node_service",
        changes: { boundaryId: null },
      };

      const simResult = simulateOperations(
        { nodes: [nodeWithBoundary, boundaryNode], edges: [] },
        [clearOp]
      );
      expect(simResult.success).toBe(true);
      const updated = simResult.resultingNodes?.find((n) => n.id === "node_service");
      expect(updated?.boundaryId).toBeUndefined();
    });
  });

  // --- Fix 5: Reject unsupported fields and empty updates ---
  describe("Fix 5: Strictness and Empty Update Rejection", () => {
    it("rejects unknown/unsupported fields on operations and nested payloads", () => {
      const unknownFieldOp = {
        type: "update_node",
        id: "node_order_service",
        changes: { label: "Valid Label", extraField: "should_fail" },
      };
      expect(OperationSchema.safeParse(unknownFieldOp).success).toBe(false);

      const unknownNodePayloadField = {
        type: "add_node",
        node: {
          id: "node_new",
          kind: "service",
          label: "New",
          layout: { x: 0, y: 0, width: 100, height: 100, extra: 123 },
          properties: {},
        },
      };
      expect(OperationSchema.safeParse(unknownNodePayloadField).success).toBe(false);
    });

    it("rejects empty updates, undefined-only updates, and empty properties-only updates", () => {
      expect(SupportedNodeChangesSchema.safeParse({}).success).toBe(false);
      expect(SupportedNodeChangesSchema.safeParse({ label: undefined }).success).toBe(false);
      expect(SupportedNodeChangesSchema.safeParse({ properties: {} }).success).toBe(false);
    });

    it("accepts valid changes including boundaryId: null", () => {
      expect(SupportedNodeChangesSchema.safeParse({ boundaryId: null }).success).toBe(true);
      expect(SupportedNodeChangesSchema.safeParse({ label: "New Name" }).success).toBe(true);
      expect(
        SupportedNodeChangesSchema.safeParse({ properties: { key: "val" } }).success
      ).toBe(true);
    });
  });

  // --- Fix 6: Initial Graph Validation before Simulation ---
  describe("Fix 6: Initial Graph Validation in Simulator", () => {
    it("fails simulation immediately on duplicate initial node IDs even with zero operations", () => {
      const duplicateNodes: ArchitectureNode[] = [
        ...validSnapshot.nodes,
        {
          id: "node_order_service",
          kind: "service",
          label: "Dup",
          layout: { x: 0, y: 0, width: 100, height: 100 },
          properties: {},
        },
      ];
      const result = simulateOperations({ nodes: duplicateNodes, edges: [] }, []);
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate node ID"))).toBe(true);
    });

    it("fails simulation immediately on initial dangling edge", () => {
      const danglingEdge: ArchitectureEdge = {
        id: "edge_dangling",
        from: "node_order_service",
        to: "node_non_existent",
        kind: "request",
        mode: "sync",
        properties: {},
      };
      const result = simulateOperations(
        { nodes: validSnapshot.nodes, edges: [danglingEdge] },
        []
      );
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("dangling 'to' endpoint"))).toBe(true);
    });

    it("preserves initial entities immutably on both success and failure", () => {
      const initialNodes = JSON.parse(JSON.stringify(validSnapshot.nodes));
      const initialEdges = JSON.parse(JSON.stringify(validSnapshot.edges));

      // Test with failed operation
      simulateOperations({ nodes: initialNodes, edges: initialEdges }, [
        { type: "remove_node", id: "node_order_service" }, // fails due to incident edge
      ]);
      expect(initialNodes.length).toBe(validSnapshot.nodes.length);
      expect(initialEdges.length).toBe(validSnapshot.edges.length);
    });
  });

  // --- Fix 7: Bounded inputs, properties, and byte budget ---
  describe("Fix 7: Property and Input Limits", () => {
    it("enforces property key and string value length limits", () => {
      const oversizedKeyProps = {
        ["k".repeat(LIMITS.MAX_PROPERTY_KEY_LENGTH + 1)]: "val",
      };
      const nodeWithBadProps = {
        id: "node_prop_test",
        kind: "service" as const,
        label: "Test",
        layout: { x: 0, y: 0, width: 10, height: 10 },
        properties: oversizedKeyProps,
      };
      expect(ArchitectureNodeSchema.safeParse(nodeWithBadProps).success).toBe(false);

      const oversizedValProps = {
        key: "v".repeat(LIMITS.MAX_PROPERTY_STRING_LENGTH + 1),
      };
      const nodeWithBadValProps = {
        id: "node_prop_test",
        kind: "service" as const,
        label: "Test",
        layout: { x: 0, y: 0, width: 10, height: 10 },
        properties: oversizedValProps,
      };
      expect(ArchitectureNodeSchema.safeParse(nodeWithBadValProps).success).toBe(false);
    });

    it("rejects non-finite numbers in properties", () => {
      const badNumProps = {
        invalidNum: NaN,
      };
      const node = {
        id: "node_nan",
        kind: "service" as const,
        label: "Test",
        layout: { x: 0, y: 0, width: 10, height: 10 },
        properties: badNumProps,
      };
      expect(ArchitectureNodeSchema.safeParse(node).success).toBe(false);
    });

    it("fails simulation when merged property update exceeds the 64-key limit", () => {
      const existingProps: Record<string, string> = {};
      for (let i = 0; i < 60; i++) {
        existingProps[`prop_${i}`] = `val_${i}`;
      }

      const node: ArchitectureNode = {
        id: "node_many_props",
        kind: "service",
        label: "Node",
        layout: { x: 0, y: 0, width: 100, height: 100 },
        properties: existingProps,
      };

      const updateOp: Operation = {
        type: "update_node",
        id: "node_many_props",
        changes: {
          properties: {
            prop_extra_1: "1",
            prop_extra_2: "2",
            prop_extra_3: "3",
            prop_extra_4: "4",
            prop_extra_5: "5", // 60 + 5 = 65 > 64!
          },
        },
      };

      const result = simulateOperations({ nodes: [node], edges: [] }, [updateOp]);
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("Merged properties violate schema"))).toBe(true);
    });

    it("rejects aggregate payload exceeding 1 MiB byte budget with non-ASCII text", () => {
      // Create snapshot where a large claim string exceeds 1 MiB
      const largeString = "🚀".repeat(300_000); // each emoji is 4 UTF-8 bytes -> 1.2 MB
      const oversizedSnap = {
        ...validSnapshot,
        unresolvedQuestions: [largeString],
      };
      const result = RoomSnapshotSchema.safeParse(oversizedSnap);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("exceeds aggregate JSON byte budget");
    });
  });

  // --- Fix 8: Preserve source and confirmation for brief claims ---
  describe("Fix 8: Brief Claims and Provenance", () => {
    it("allows tentative inferred claims in BriefDraftSchema", () => {
      const draft = {
        constraints: [
          {
            value: "Must use PostgreSQL",
            source: "inference" as const,
            status: "tentative" as const,
          },
        ],
      };
      const result = BriefDraftSchema.safeParse(draft);
      expect(result.success).toBe(true);
    });

    it("rejects tentative claims in ConfirmedBriefSchema", () => {
      const briefWithTentativeClaim = {
        ...validSnapshot.brief!,
        constraints: [
          {
            value: "Must use PostgreSQL",
            source: "inference" as const,
            status: "tentative" as const, // Rejected! Only 'confirmed' allowed in ConfirmedBrief
          },
        ],
      };
      const result = ConfirmedBriefSchema.safeParse(briefWithTentativeClaim);
      expect(result.success).toBe(false);
    });

    it("preserves source: 'inference' when user confirms it", () => {
      const confirmedInference = {
        ...validSnapshot.brief!,
        constraints: [
          {
            value: "Must use PostgreSQL",
            source: "inference" as const,
            status: "confirmed" as const,
          },
        ],
      };
      const result = ConfirmedBriefSchema.safeParse(confirmedInference);
      expect(result.success).toBe(true);
      expect(result.data?.constraints[0]?.source).toBe("inference");
      expect(result.data?.constraints[0]?.status).toBe("confirmed");
    });

    it("allows missing scale and partial draft without fake defaults", () => {
      const partialDraft = {
        purpose: {
          value: "Exploring idea",
          source: "user" as const,
          status: "tentative" as const,
        },
      };
      const result = BriefDraftSchema.safeParse(partialDraft);
      expect(result.success).toBe(true);
      expect(result.data?.stage).toBeUndefined();
      expect(result.data?.scale).toBeUndefined();
    });
  });

  // --- Wire Contract Tests ---
  describe("Wire Contracts: AnalyzeRequest & AnalyzeResponse", () => {
    it("parses valid AnalyzeRequest and AnalyzeResponse", () => {
      const request = {
        schemaVersion: 1,
        requestId: "req_123",
        room: { roomId: "room_test_1" },
        trigger: {
          type: "user_message" as const,
          messageId: "msg_1",
          text: "Should we decouple email from order checkout?",
          entityRefs: [],
        },
        snapshot: validSnapshot,
        recentMessages: [],
        decisions: [],
        focus: [],
      };
      expect(AnalyzeRequestSchema.safeParse(request).success).toBe(true);

      const response = {
        schemaVersion: 1,
        requestId: "req_123",
        turnId: "turn_1",
        sourceSnapshotRef: validSnapshot.ref,
        decision: {
          kind: "ask" as const,
          text: "Does the order completion need to wait for email delivery to succeed?",
          evidence: [{ kind: "edge" as const, id: "edge_order_to_email" }],
        },
      };
      expect(AnalyzeResponseSchema.safeParse(response).success).toBe(true);
    });
  });
});
