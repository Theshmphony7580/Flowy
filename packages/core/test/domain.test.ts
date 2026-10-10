import { describe, expect, it } from "bun:test";
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  computeProposalDigest,
  RoomSnapshotSchema,
  simulateOperations,
  validateGraph,
  type ArchitectureEdge,
  type ArchitectureNode,
  type Operation,
  type RoomSnapshot,
} from "../src/index.ts";

describe("Milestone C0: Domain Contracts & Pure Validation", () => {
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
      purpose: "E-commerce checkout system",
      intendedUsers: "Online shoppers",
      keyFlows: ["Order placement"],
      inScope: ["Checkout flow", "Email notification"],
      outOfScope: ["Inventory warehouse"],
      stage: "prototype",
      scale: {},
      constraints: ["Simple infrastructure"],
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

  it("validates a compliant RoomSnapshot via Zod", () => {
    const parseResult = RoomSnapshotSchema.safeParse(validSnapshot);
    expect(parseResult.success).toBe(true);
  });

  it("rejects non-conforming schema versions", () => {
    const invalidVersion = { ...validSnapshot, schemaVersion: 2 };
    const parseResult = RoomSnapshotSchema.safeParse(invalidVersion);
    expect(parseResult.success).toBe(false);
  });

  it("detects dangling edge endpoints via validateGraph", () => {
    const brokenGraph = {
      nodes: validSnapshot.nodes,
      edges: [
        {
          id: "edge_broken",
          from: "node_order_service",
          to: "node_non_existent",
          kind: "request" as const,
          mode: "sync" as const,
          properties: {},
        },
      ],
    };
    const result = validateGraph(brokenGraph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("dangling 'to' endpoint"))).toBe(true);
  });

  it("detects duplicate node IDs via validateGraph", () => {
    const duplicateNodes: ArchitectureNode[] = [
      ...validSnapshot.nodes,
      {
        id: "node_order_service",
        kind: "service",
        label: "Duplicate Service",
        layout: { x: 200, y: 200, width: 100, height: 50 },
        properties: {},
      },
    ];
    const result = validateGraph({ nodes: duplicateNodes, edges: validSnapshot.edges });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate node ID"))).toBe(true);
  });

  it("detects boundary containment cycles", () => {
    const cycleNodes: ArchitectureNode[] = [
      {
        id: "boundary_a",
        kind: "boundary",
        label: "Boundary A",
        boundaryId: "boundary_b",
        layout: { x: 0, y: 0, width: 400, height: 400 },
        properties: {},
      },
      {
        id: "boundary_b",
        kind: "boundary",
        label: "Boundary B",
        boundaryId: "boundary_a",
        layout: { x: 50, y: 50, width: 200, height: 200 },
        properties: {},
      },
    ];
    const result = validateGraph({ nodes: cycleNodes, edges: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Boundary containment cycle"))).toBe(true);
  });

  it("enforces explicit incident edge removal when deleting a node", () => {
    // Attempt to remove node_order_service without removing edge_order_to_email
    const badOps: Operation[] = [
      {
        type: "remove_node",
        id: "node_order_service",
      },
    ];
    const failResult = simulateOperations(
      { nodes: validSnapshot.nodes, edges: validSnapshot.edges },
      badOps
    );
    expect(failResult.success).toBe(false);
    expect(failResult.errors.some((e) => e.includes("Cannot remove node"))).toBe(true);

    // Now remove both incident edge and node
    const goodOps: Operation[] = [
      {
        type: "remove_edge",
        id: "edge_order_to_email",
      },
      {
        type: "remove_node",
        id: "node_order_service",
      },
    ];
    const successResult = simulateOperations(
      { nodes: validSnapshot.nodes, edges: validSnapshot.edges },
      goodOps
    );
    expect(successResult.success).toBe(true);
    expect(successResult.resultingNodes?.length).toBe(1);
    expect(successResult.resultingEdges?.length).toBe(0);
  });

  it("computes deterministic SHA-256 digest regardless of key ordering", () => {
    const payloadA = {
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

    // Construct identical payload with reversed key order
    const payloadB = {
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

    const digestA = computeProposalDigest(payloadA);
    const digestB = computeProposalDigest(payloadB);

    expect(digestA).toBe(digestB);
    expect(digestA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("validates AnalyzeRequest and AnalyzeResponse contracts", () => {
    const request = {
      schemaVersion: 1,
      requestId: "req_123",
      room: { roomId: "room_test_1" },
      trigger: {
        type: "user_message" as const,
        messageId: "msg_1",
        text: "Should we add a queue between order service and email?",
        entityRefs: [],
      },
      snapshot: validSnapshot,
      recentMessages: [],
      decisions: [],
      focus: [],
    };

    const reqParse = AnalyzeRequestSchema.safeParse(request);
    expect(reqParse.success).toBe(true);

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

    const resParse = AnalyzeResponseSchema.safeParse(response);
    expect(resParse.success).toBe(true);
  });
});
