import type { ArchitectureEdge, ArchitectureNode, RoomSnapshot } from "./snapshot.ts";
import type { Operation } from "./operations.ts";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateGraph(snapshot: {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}): ValidationResult {
  const errors: string[] = [];
  const nodeMap = new Map<string, ArchitectureNode>();
  const edgeMap = new Map<string, ArchitectureEdge>();

  // 1. Unique Node IDs & Finite Geometry
  for (const node of snapshot.nodes) {
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node ID: '${node.id}'`);
    } else {
      nodeMap.set(node.id, node);
    }

    const { x, y, width, height } = node.layout;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      errors.push(`Node '${node.id}' has non-finite layout coordinates`);
    }
    if (width <= 0 || height <= 0) {
      errors.push(`Node '${node.id}' has non-positive dimensions: width=${width}, height=${height}`);
    }
  }

  // 2. Boundary Validity & Cycle Detection
  for (const node of snapshot.nodes) {
    if (node.boundaryId) {
      const boundaryNode = nodeMap.get(node.boundaryId);
      if (!boundaryNode) {
        errors.push(`Node '${node.id}' references non-existent boundaryId '${node.boundaryId}'`);
      } else if (boundaryNode.kind !== "boundary") {
        errors.push(`Node '${node.id}' references boundaryId '${node.boundaryId}' which has kind '${boundaryNode.kind}' instead of 'boundary'`);
      }

      // Check boundary containment cycle
      let currentId: string | undefined = node.boundaryId;
      const visited = new Set<string>([node.id]);
      while (currentId) {
        if (visited.has(currentId)) {
          errors.push(`Boundary containment cycle detected involving node '${node.id}' and boundary '${currentId}'`);
          break;
        }
        visited.add(currentId);
        const parent = nodeMap.get(currentId);
        currentId = parent?.boundaryId;
      }
    }
  }

  // 3. Unique Edge IDs & Endpoint Existence
  for (const edge of snapshot.edges) {
    if (edgeMap.has(edge.id)) {
      errors.push(`Duplicate edge ID: '${edge.id}'`);
    } else {
      edgeMap.set(edge.id, edge);
    }

    if (!nodeMap.has(edge.from)) {
      errors.push(`Edge '${edge.id}' has dangling 'from' endpoint '${edge.from}'`);
    }
    if (!nodeMap.has(edge.to)) {
      errors.push(`Edge '${edge.id}' has dangling 'to' endpoint '${edge.to}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export type SimulationResult = {
  success: boolean;
  resultingNodes?: ArchitectureNode[];
  resultingEdges?: ArchitectureEdge[];
  errors: string[];
};

export function simulateOperations(
  initial: { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] },
  operations: Operation[]
): SimulationResult {
  const errors: string[] = [];
  const nodes = new Map<string, ArchitectureNode>(initial.nodes.map((n) => [n.id, { ...n, layout: { ...n.layout }, properties: { ...n.properties } }]));
  const edges = new Map<string, ArchitectureEdge>(initial.edges.map((e) => [e.id, { ...e, properties: { ...e.properties } }]));

  // Track which edges are removed in this batch
  const removedEdgeIds = new Set<string>();
  for (const op of operations) {
    if (op.type === "remove_edge") {
      removedEdgeIds.add(op.id);
    }
  }

  // Apply operations sequentially
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]!;

    switch (op.type) {
      case "add_node": {
        if (nodes.has(op.node.id)) {
          errors.push(`Operation ${i} (add_node): Node '${op.node.id}' already exists`);
        } else {
          nodes.set(op.node.id, { ...op.node, layout: { ...op.node.layout }, properties: { ...op.node.properties } });
        }
        break;
      }

      case "update_node": {
        const existing = nodes.get(op.id);
        if (!existing) {
          errors.push(`Operation ${i} (update_node): Node '${op.id}' does not exist`);
        } else {
          nodes.set(op.id, {
            ...existing,
            ...(op.changes.label !== undefined ? { label: op.changes.label } : {}),
            ...(op.changes.description !== undefined ? { description: op.changes.description } : {}),
            ...(op.changes.kind !== undefined ? { kind: op.changes.kind } : {}),
            ...(op.changes.boundaryId !== undefined ? { boundaryId: op.changes.boundaryId ?? undefined } : {}),
            ...(op.changes.properties !== undefined ? { properties: { ...existing.properties, ...op.changes.properties } } : {}),
          });
        }
        break;
      }

      case "move_node": {
        const existing = nodes.get(op.id);
        if (!existing) {
          errors.push(`Operation ${i} (move_node): Node '${op.id}' does not exist`);
        } else {
          nodes.set(op.id, {
            ...existing,
            layout: { ...op.layout },
          });
        }
        break;
      }

      case "remove_node": {
        const existing = nodes.get(op.id);
        if (!existing) {
          errors.push(`Operation ${i} (remove_node): Node '${op.id}' does not exist`);
        } else {
          // Check incident edges: all incident edges must be explicitly removed in the batch
          for (const [edgeId, edge] of edges) {
            if ((edge.from === op.id || edge.to === op.id) && !removedEdgeIds.has(edgeId)) {
              errors.push(
                `Operation ${i} (remove_node): Cannot remove node '${op.id}' because incident edge '${edgeId}' is not removed in this batch`
              );
            }
          }
          nodes.delete(op.id);
        }
        break;
      }

      case "add_edge": {
        if (edges.has(op.edge.id)) {
          errors.push(`Operation ${i} (add_edge): Edge '${op.edge.id}' already exists`);
        } else {
          edges.set(op.edge.id, { ...op.edge, properties: { ...op.edge.properties } });
        }
        break;
      }

      case "update_edge": {
        const existing = edges.get(op.id);
        if (!existing) {
          errors.push(`Operation ${i} (update_edge): Edge '${op.id}' does not exist`);
        } else {
          edges.set(op.id, {
            ...existing,
            ...(op.changes.label !== undefined ? { label: op.changes.label } : {}),
            ...(op.changes.kind !== undefined ? { kind: op.changes.kind } : {}),
            ...(op.changes.protocol !== undefined ? { protocol: op.changes.protocol } : {}),
            ...(op.changes.mode !== undefined ? { mode: op.changes.mode } : {}),
            ...(op.changes.properties !== undefined ? { properties: { ...existing.properties, ...op.changes.properties } } : {}),
          });
        }
        break;
      }

      case "remove_edge": {
        if (!edges.has(op.id)) {
          errors.push(`Operation ${i} (remove_edge): Edge '${op.id}' does not exist`);
        } else {
          edges.delete(op.id);
        }
        break;
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const resultingNodes = Array.from(nodes.values());
  const resultingEdges = Array.from(edges.values());

  // Validate resulting graph invariants
  const graphValidation = validateGraph({ nodes: resultingNodes, edges: resultingEdges });
  if (!graphValidation.valid) {
    return {
      success: false,
      errors: graphValidation.errors,
    };
  }

  return {
    success: true,
    resultingNodes,
    resultingEdges,
    errors: [],
  };
}
