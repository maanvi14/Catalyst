"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  Position,
  ReactFlow,
  ReactFlowInstance
} from "reactflow";
import {
  Search,
  X,
  Download,
  Share2
} from "lucide-react";
import { LoadingState } from "@/components/shared/loading-state";
import { WorkflowNode } from "@/components/workflow/workflow-node";
import { useWorkflowMap } from "@/hooks/use-workflow-map";
import {
  ConflictAgentRead,
  ConflictRead,
  GraphNodeData
} from "@/types/api";

const nodeTypes = { workflowNode: WorkflowNode };

const DOMAIN_PALETTE = ["#38bdf8", "#34d399", "#f59e0b", "#f97316", "#60a5fa", "#14b8a6", "#22c55e", "#ef4444", "#84cc16", "#06b6d4"];

type NodeKind = "Legacy Agents" | "Oracle AI Agents" | "Saved Queries" | "Domains" | "Refnums" | "Sequences";

type Selection =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function parseActions(definition: string | null | undefined): string[] {
  if (!definition) {
    return [];
  }

  const matches = [...definition.matchAll(/<action>(.*?)<\/action>/gi)].map((match) => match[1].trim()).filter(Boolean);
  if (matches.length > 0) {
    return Array.from(new Set(matches));
  }

  return definition
    .split(/[.;\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 4);
}


function sentenceSummary(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[.?!]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function severityColor(severity: string): string {
  if (severity === "high") {
    return "#DC2626"; // Red — legible on white
  }
  if (severity === "medium") {
    return "#D97706"; // Amber — legible on white
  }
  return "#4B5563"; // Dark gray for low severity conflict/link for visibility
}

function relationshipColor(label: string): string {
  if (label === "Conflict") {
    return "#EF4444"; // Red — dashed conflict line
  }
  if (label === "Depends On") {
    return "#4B5563"; // Darker gray structural edge — high contrast on white (gray-600)
  }
  if (label === "Uses Query") {
    return "#4B5563"; // Darker gray for query edges
  }
  if (label === "Same Domain") {
    return "#6B7280"; // Mid-gray
  }
  if (label === "Expose") {
    return "#9CA3AF"; // Light-medium gray
  }
  return "#4B5563"; // Default dark gray
}

function getAgentNodeId(agent: ConflictAgentRead): string {
  return agent.source === "ai" ? `oracle-ai-agent:${agent.agent_gid}` : `legacy-agent:${agent.agent_gid}`;
}

// Map each agent node to one of the 4 domain swimlanes based on entity_type and trigger_event prefix.
const getColumnIndex = (node: Node<GraphNodeData>) => {
  // AI & Recovery: AI agents always belong here
  if (node.data.entity_type === "oracle_ai_agent" || node.data.kind === "Oracle AI Agents") {
    return 3; // Column 4: AI & RECOVERY
  }

  const trigger = (node.data.subtitle || "").toUpperCase().trim();
  
  if (trigger.startsWith("GTM")) return 2; // Column 3: GTM
  if (trigger.startsWith("INVOICE")) return 1; // Column 2: INVOICE & FINANCE
  if (trigger.startsWith("SHIPMENT") || trigger.startsWith("ORDER_RELEASE")) return 0; // Column 1: SHIPMENT EXECUTION

  return 4; // Column 5: UNCLASSIFIED
};

const EVENT_ORDER = [
  "ORDER_RELEASE - CREATED",
  "GTM - ORDER_SCREENING",
  "ORDER_RELEASE - APPROVED",
  "SHIPMENT - CREATED",
  "SHIPMENT - PLANNED",
  "GTM - SHIPMENT_EXPORT",
  "SHIPMENT - RATED",
  "SHIPMENT - TENDER",
  "SHIPMENT - TENDERED",
  "SHIPMENT - DISPATCHED",
  "SHIPMENT - ARRIVED",
  "SHIPMENT - DELIVERED",
  "INVOICE - GENERATE",
  "INVOICE - RECEIVED",
  "INVOICE - APPROVED",
  "INVOICE - PAYMENT_RECEIVED",
  "SHIPMENT - COMPLETED",
  "SHIPMENT - EVENT"
];

const getEventOrderIndex = (subtitle: string) => {
  const cleanSubtitle = (subtitle || "").toUpperCase().trim();
  const idx = EVENT_ORDER.findIndex(evt => cleanSubtitle.includes(evt.toUpperCase()));
  return idx === -1 ? 99 : idx;
};

// Layout Algorithm: adaptive multi-column grid per lane (2 cols for ≤6, 3 cols for >6)
const getLayoutedElements = (nodes: Node<GraphNodeData>[], edges: Edge[]) => {
  // Group nodes by column index
  const nodesByColumn: Record<number, Node<GraphNodeData>[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: []
  };

  nodes.forEach((node) => {
    const colIdx = getColumnIndex(node);
    const safeCol = colIdx >= 0 && colIdx < 5 ? colIdx : 4;
    nodesByColumn[safeCol].push(node);
  });

  // Sort each column's nodes topologically by event flow order, then alphabetically
  for (let c = 0; c <= 4; c++) {
    nodesByColumn[c].sort((a, b) => {
      const orderA = getEventOrderIndex(a.data.subtitle || "");
      const orderB = getEventOrderIndex(b.data.subtitle || "");
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.data.label || "").localeCompare(b.data.label || "");
    });
  }

  const CARD_WIDTH = 230;
  const CARD_HEIGHT = 105;
  const GAP_X = 28;
  const GAP_Y = 28;
  const LANE_PAD = 32;

  // Compute adaptive columns per lane: 2 if ≤6 nodes, 3 if >6
  const colsPerLane: Record<number, number> = {};
  for (let c = 0; c <= 4; c++) {
    colsPerLane[c] = nodesByColumn[c].length > 6 ? 3 : 2;
  }

  // Compute lane widths based on column count (perfectly symmetrical padding)
  const laneWidth = (cols: number) => cols * CARD_WIDTH + (cols - 1) * GAP_X + LANE_PAD * 2;

  // Compute cumulative x offsets for each lane
  const laneXOffset: Record<number, number> = {};
  let cumulativeX = 0;
  for (let c = 0; c <= 4; c++) {
    laneXOffset[c] = cumulativeX;
    cumulativeX += laneWidth(colsPerLane[c]);
  }

  const layoutedNodes = nodes.map((node) => {
    const colIdx = getColumnIndex(node);
    const safeCol = colIdx >= 0 && colIdx < 5 ? colIdx : 4;
    const laneNodes = nodesByColumn[safeCol];
    const nodeIndex = laneNodes.findIndex(n => n.id === node.id);
    const cols = colsPerLane[safeCol];

    // Grid layout: adaptive columns within the lane
    const row = Math.floor(nodeIndex / cols);
    const col = nodeIndex % cols;

    const x = laneXOffset[safeCol] + LANE_PAD + col * (CARD_WIDTH + GAP_X);
    const y = row * (CARD_HEIGHT + GAP_Y) + 45;

    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: { x, y }
    };
  });

  return { nodes: layoutedNodes, edges };
};

// BFS to find all reachable nodes (Descendants)
const getDescendants = (nodeId: string, edges: Edge[]): Set<string> => {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    edges.forEach((edge) => {
      if (edge.source === current && !visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push(edge.target);
      }
    });
  }
  return visited;
};

// BFS to find all ancestor nodes (reachability to selected node)
const getAncestors = (nodeId: string, edges: Edge[]): Set<string> => {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    edges.forEach((edge) => {
      if (edge.target === current && !visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    });
  }
  return visited;
};

// BFS to find the path (nodes & edges) connecting start to end node
const getPathElements = (startId: string, endId: string, edges: Edge[]): { nodes: Set<string>; edges: Set<string> } | null => {
  // BFS search from startId to endId
  let queue: { node: string; pathNodes: string[]; pathEdges: string[] }[] = [
    { node: startId, pathNodes: [startId], pathEdges: [] }
  ];
  let visited = new Set<string>([startId]);
  
  while (queue.length > 0) {
    const { node, pathNodes, pathEdges } = queue.shift()!;
    if (node === endId) {
      return { nodes: new Set(pathNodes), edges: new Set(pathEdges) };
    }
    
    const outgoing = edges.filter((e) => e.source === node);
    outgoing.forEach((edge) => {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push({
          node: edge.target,
          pathNodes: [...pathNodes, edge.target],
          pathEdges: [...pathEdges, edge.id]
        });
      }
    });
  }
  
  // Try reverse search (from endId to startId) if forward path not found
  queue = [{ node: endId, pathNodes: [endId], pathEdges: [] }];
  visited = new Set<string>([endId]);
  while (queue.length > 0) {
    const { node, pathNodes, pathEdges } = queue.shift()!;
    if (node === startId) {
      return { nodes: new Set(pathNodes), edges: new Set(pathEdges) };
    }
    
    const outgoing = edges.filter((e) => e.source === node);
    outgoing.forEach((edge) => {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push({
          node: edge.target,
          pathNodes: [...pathNodes, edge.target],
          pathEdges: [...pathEdges, edge.id]
        });
      }
    });
  }
  
  return null;
};

// Risk score calculation based on node attributes
const getNodeRiskScore = (node: Node<GraphNodeData>) => {
  let risk = 10;
  if (node.data.is_spof) risk += 50;
  if (node.data.is_conflicted) risk += 30;
  if (node.data.entity_type === "oracle_ai_agent") risk += 10;
  return risk;
};

// Risk Color selector for Blast Radius Highlight Edges
const getEdgeRiskColor = (sourceNode: Node<GraphNodeData> | undefined, targetNode: Node<GraphNodeData> | undefined) => {
  if (!sourceNode || !targetNode) return "#94a3b8";
  const scoreA = getNodeRiskScore(sourceNode);
  const scoreB = getNodeRiskScore(targetNode);
  const maxScore = Math.max(scoreA, scoreB);
  
  if (maxScore > 60) return "#DC2626"; // Red for high risk — legible on white
  if (maxScore > 30) return "#D97706"; // Amber for medium risk — legible on white
  return "#16A34A"; // Green for low risk — legible on white
};

const NODE_KIND_FILTERS_DEFAULT: Record<NodeKind, boolean> = {
  "Legacy Agents": true,
  "Oracle AI Agents": true,
  "Saved Queries": true,
  Domains: true,
  Refnums: true,
  Sequences: true
};

export default function WorkflowMapPage() {
  const router = useRouter();
  const { data, isLoading } = useWorkflowMap();
  const [selection, setSelection] = useState<Selection>(null);
  const [search, setSearch] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const showStructuralEdges = true;
  const showConflictEdges = true;
  const severityFilter = "all";
  const nodeKindFilters = NODE_KIND_FILTERS_DEFAULT;

  // Primary view filter mode: "all" | "conflicts" | "bottlenecks"
  const [viewMode, setViewMode] = useState<"all" | "conflicts" | "bottlenecks">("all");

  // Multi-select / Path tracking states
  const [firstSelectedNodeId, setFirstSelectedNodeId] = useState<string | null>(null);
  const [secondSelectedNodeId, setRealSecondSelectedNodeId] = useState<string | null>(null);

  // React Flow focus helper state
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const workflow = data;

  const domainLookup = useMemo(() => {
    if (!workflow) {
      return new Map<string, { label: string; color: string }>();
    }

    const uniqueDomainGids = Array.from(new Set(workflow.graph.nodes.map(n => n.data.domain_gid).filter(Boolean)));
    const map = new Map<string, { label: string; color: string }>();

    uniqueDomainGids.forEach((domainGid, index) => {
      const node = workflow.graph.nodes.find(n => n.data.domain_gid === domainGid);
      map.set(domainGid!, {
        label: node?.data.domain_label || domainGid!,
        color: DOMAIN_PALETTE[index % DOMAIN_PALETTE.length]
      });
    });

    return map;
  }, [workflow]);

  const agentsByGid = useMemo(() => new Map(workflow?.agents.map((agent) => [agent.agent_gid, agent]) ?? []), [workflow]);
  const aiAgentsByGid = useMemo(() => new Map(workflow?.aiAgents.map((agent) => [agent.agent_gid, agent]) ?? []), [workflow]);

  const filteredNodesRaw = useMemo(() => {
    if (!workflow) return [] as Node<GraphNodeData>[];
    const query = normalize(search);

    return workflow.graph.nodes
      .map((node) => {
        const domain = node.data.domain_gid ? domainLookup.get(node.data.domain_gid) : undefined;
        const text = [node.data.label, node.data.subtitle, node.data.kind, node.data.entity_gid, domain?.label, node.data.entity_type].join(" ").toLowerCase();
        
        const matchesQuery = query.length === 0 || text.includes(query);
        const matchesKind = nodeKindFilters[node.data.kind as NodeKind] ?? false;

        // Check conflicts associated with this node
        const nodeConflicts = workflow.conflicts.filter((c) =>
          c.affected_agents.some((agent) => agent.agent_gid === node.data.entity_gid)
        );
        const isConflicted = nodeConflicts.length > 0;

        const isVisible = matchesQuery && matchesKind && (
          viewMode === "all" ||
          (viewMode === "conflicts" && isConflicted) ||
          (viewMode === "bottlenecks" && node.data.is_spof)
        );

        const agent = agentsByGid.get(node.data.entity_gid);
        const aiAgent = aiAgentsByGid.get(node.data.entity_gid);
        const successRate = (aiAgent as unknown as Record<string, string | undefined>)?.success_rate || (agent as unknown as Record<string, string | undefined>)?.success_rate || undefined;
        const version = (aiAgent as unknown as Record<string, string | undefined>)?.version || (agent as unknown as Record<string, string | undefined>)?.version || undefined;
        const isLimited = aiAgent ? aiAgent.visibility?.toLowerCase() !== "full" : false;

        return {
          ...node,
          type: "workflowNode",
          draggable: false,
          data: {
            ...node.data,
            domain_label: domain?.label,
            domain_color: domain?.color,
            matched: matchesQuery,
            is_conflicted: isConflicted,
            conflict_count: nodeConflicts.length,
            success_rate: successRate,
            version: version,
            is_limited: isLimited
          },
          hidden: !isVisible,
          sourcePosition: Position.Right,
          targetPosition: Position.Left
        } satisfies Node<GraphNodeData>;
      })
      .filter((node) => !node.hidden);
  }, [domainLookup, nodeKindFilters, search, viewMode, workflow, agentsByGid, aiAgentsByGid]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodesRaw.map((n) => n.id)), [filteredNodesRaw]);

  const filteredEdgesRaw = useMemo(() => {
    if (!workflow) return [] as Edge[];

    const struct = !showStructuralEdges ? [] : workflow.graph.edges
      .filter((edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: edge.type,
        animated: edge.animated,
        data: { ...edge.data, relationship: edge.label }
      }));

    const conf = !showConflictEdges ? [] : workflow.conflicts
      .filter((conflict) => severityFilter === "all" || conflict.severity === severityFilter)
      .flatMap((conflict) => {
        const [leftAgent, rightAgent] = conflict.affected_agents;
        if (!leftAgent || !rightAgent) return [];
        const source = getAgentNodeId(leftAgent);
        const target = getAgentNodeId(rightAgent);
        if (!filteredNodeIds.has(source) || !filteredNodeIds.has(target)) return [];

        return [{
          id: `conflict:${conflict.conflict_id}`,
          source,
          target,
          label: conflict.severity,
          type: "smoothstep",
          animated: conflict.severity !== "low",
          data: {
            relationship: "Conflict",
            severity: conflict.severity,
            conflict_id: conflict.conflict_id,
            conflict_type: conflict.conflict_type,
            trigger_event: conflict.trigger_event
          }
        }];
      });

    return [...struct, ...conf];
  }, [workflow, showStructuralEdges, showConflictEdges, severityFilter, filteredNodeIds]);

  const layoutedElements = useMemo(() => {
    return getLayoutedElements(filteredNodesRaw, filteredEdgesRaw);
  }, [filteredNodesRaw, filteredEdgesRaw]);

  // Synchronize selection tracking states
  useEffect(() => {
    if (selection?.kind === "node") {
      setFirstSelectedNodeId((prev) => {
        if (prev && prev !== selection.id) {
          setRealSecondSelectedNodeId(selection.id);
          return prev;
        }
        setRealSecondSelectedNodeId(null);
        return selection.id;
      });
    } else {
      setFirstSelectedNodeId(null);
      setRealSecondSelectedNodeId(null);
    }
  }, [selection]);

  const selectedAncestors = useMemo(() => {
    if (!firstSelectedNodeId || secondSelectedNodeId) return new Set<string>();
    return getAncestors(firstSelectedNodeId, layoutedElements.edges);
  }, [firstSelectedNodeId, secondSelectedNodeId, layoutedElements.edges]);

  const selectedDescendants = useMemo(() => {
    if (!firstSelectedNodeId || secondSelectedNodeId) return new Set<string>();
    return getDescendants(firstSelectedNodeId, layoutedElements.edges);
  }, [firstSelectedNodeId, secondSelectedNodeId, layoutedElements.edges]);

  const selectedPathElements = useMemo(() => {
    if (!firstSelectedNodeId || !secondSelectedNodeId) return null;
    return getPathElements(firstSelectedNodeId, secondSelectedNodeId, layoutedElements.edges);
  }, [firstSelectedNodeId, secondSelectedNodeId, layoutedElements.edges]);

  const visibleNodes = useMemo(() => {
    const hasSelection = firstSelectedNodeId !== null;
    return layoutedElements.nodes.map((node) => {
      const isDimmed = hasSelection && !(
        (secondSelectedNodeId && selectedPathElements?.nodes.has(node.id)) ||
        (!secondSelectedNodeId && (node.id === firstSelectedNodeId || selectedAncestors.has(node.id) || selectedDescendants.has(node.id)))
      );

      let borderHighlightColor: string | undefined = undefined;
      if (hasSelection && !isDimmed) {
        if (!secondSelectedNodeId) {
          if (selectedAncestors.has(node.id)) {
            borderHighlightColor = "#C084FC"; // Purple for ancestors
          } else if (selectedDescendants.has(node.id)) {
            borderHighlightColor = "#34D399"; // Emerald for descendants
          }
        } else {
          borderHighlightColor = "#F59E0B"; // Amber for path nodes
        }
      }

      return {
        ...node,
        selected: selection?.kind === "node" && selection.id === node.id,
        style: {
          opacity: isDimmed ? 0.2 : 1.0,
          transition: "opacity 0.25s ease-in-out, border-color 0.25s ease-in-out"
        },
        data: {
          ...node.data,
          selected: selection?.kind === "node" && selection.id === node.id,
          border_highlight_color: borderHighlightColor
        }
      };
    });
  }, [layoutedElements.nodes, firstSelectedNodeId, secondSelectedNodeId, selectedAncestors, selectedDescendants, selectedPathElements, selection]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    const hasSelection = firstSelectedNodeId !== null;
    return layoutedElements.edges.map((edge) => {
      const isConflict = edge.data.relationship === "Conflict";
      const sourceNode = visibleNodes.find((n) => n.id === edge.source);
      const targetNode = visibleNodes.find((n) => n.id === edge.target);

      let isHighlighted = false;
      let edgeColor = isConflict ? severityColor(String(edge.label ?? "")) : relationshipColor(String(edge.label ?? ""));

      if (hasSelection) {
        if (secondSelectedNodeId) {
          isHighlighted = selectedPathElements?.edges.has(edge.id) ?? false;
          if (isHighlighted) {
            edgeColor = "#F59E0B"; // Gold for active simple path
          }
        } else {
          const isDescendantFlow = (edge.source === firstSelectedNodeId || selectedDescendants.has(edge.source)) && selectedDescendants.has(edge.target);
          const isAncestorFlow = selectedAncestors.has(edge.source) && (edge.target === firstSelectedNodeId || selectedAncestors.has(edge.target));
          isHighlighted = isDescendantFlow || isAncestorFlow;
          
          if (isHighlighted) {
            edgeColor = getEdgeRiskColor(sourceNode, targetNode);
          }
        }
      }

      const opacity = hasSelection ? (isHighlighted ? 1.0 : 0.1) : 1.0;
      const strokeWidth = isHighlighted ? 3.5 : (isConflict ? 2.8 : (edge.label === "Expose" ? 1.8 : 2.4));

      return {
        ...edge,
        animated: edge.animated || isHighlighted,
        style: {
          ...edge.style,
          stroke: edgeColor,
          strokeWidth,
          strokeDasharray: isConflict ? "8 6" : (edge.label === "Expose" ? "6 6" : undefined),
          opacity,
          transition: "opacity 0.25s ease-in-out, stroke 0.25s ease-in-out"
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor
        }
      };
    });
  }, [layoutedElements.edges, firstSelectedNodeId, secondSelectedNodeId, selectedAncestors, selectedDescendants, selectedPathElements, visibleNodes]);

  useEffect(() => {
    if (selection?.kind === "node" && !visibleNodeIds.has(selection.id)) {
      setSelection(null);
    } else if (selection?.kind === "edge" && !visibleEdges.some((edge) => edge.id === selection.id)) {
      setSelection(null);
    }
  }, [selection, visibleEdges, visibleNodeIds]);

  const selectedDisplayNode = useMemo(() => {
    if (!workflow) {
      return null;
    }

    if (selection?.kind === "node") {
      return workflow.graph.nodes.find((node) => node.id === selection.id) ?? null;
    }

    if (selection?.kind === "edge") {
      const edge = visibleEdges.find((item) => item.id === selection.id) ?? null;
      if (!edge) {
        return null;
      }
      return workflow.graph.nodes.find((node) => node.id === edge.source) ?? workflow.graph.nodes.find((node) => node.id === edge.target) ?? null;
    }

    return null;
  }, [selection, visibleEdges, workflow]);

  const selectedAgent = selectedDisplayNode && selectedDisplayNode.data.entity_type === "legacy_agent" ? agentsByGid.get(selectedDisplayNode.data.entity_gid) : null;
  const selectedAiAgent = selectedDisplayNode && selectedDisplayNode.data.entity_type === "oracle_ai_agent" ? aiAgentsByGid.get(selectedDisplayNode.data.entity_gid) : null;

  const selectedNodeConflicts = useMemo(() => {
    if (!selectedDisplayNode || !workflow) {
      return [] as ConflictRead[];
    }

    return workflow.conflicts.filter((conflict) =>
      conflict.affected_agents.some((agent) => agent.agent_gid === selectedDisplayNode.data.entity_gid && agent.source === (selectedDisplayNode.data.entity_type === "oracle_ai_agent" ? "ai" : "legacy"))
    );
  }, [selectedDisplayNode, workflow]);

  const selectedActions = useMemo(() => {
    if (!selectedDisplayNode) {
      return [] as string[];
    }

    if (selectedDisplayNode.data.entity_type === "legacy_agent") {
      return parseActions(selectedAgent?.definition);
    }

    if (selectedDisplayNode.data.entity_type === "oracle_ai_agent") {
      const summary = sentenceSummary(selectedAiAgent?.definition_detail);
      return summary.length > 0 ? summary : [selectedAiAgent?.definition_detail ?? "AI behavior is described in the fixture metadata."];
    }

    if (selectedDisplayNode.data.entity_type === "saved_query") {
      return ["Used as a trigger-time lookup or condition gate", "Serves as a dependency for event-driven automation"];
    }

    return ["No direct actions exposed for this node type."];
  }, [selectedAgent?.definition, selectedAiAgent?.definition_detail, selectedDisplayNode]);

  const searchResults = useMemo(() => {
    if (!search || !workflow) return [];
    const query = normalize(search);
    return visibleNodes.filter(node => 
      node.data.label.toLowerCase().includes(query) ||
      node.data.entity_gid.toLowerCase().includes(query) ||
      node.data.subtitle.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to top 5 results for clean dropdown
  }, [search, visibleNodes, workflow]);

  const columnCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    visibleNodes.forEach((node) => {
      const colIdx = getColumnIndex(node);
      const safeCol = colIdx >= 0 && colIdx < 5 ? colIdx : 4;
      counts[safeCol]++;
    });
    return counts;
  }, [visibleNodes]);

  if (isLoading) {
    return <LoadingState label="Rendering workflow map" />;
  }

  const hasUnclassified = columnCounts[4] > 0;
  const laneHeaders = [
    ["SHIPMENT EXECUTION", columnCounts[0]],
    ["INVOICE & FINANCE", columnCounts[1]],
    ["GTM", columnCounts[2]],
    ["AI & RECOVERY", columnCounts[3]]
  ];
  if (hasUnclassified) {
    laneHeaders.push(["UNCLASSIFIED", columnCounts[4]]);
  }
  const laneCount = laneHeaders.length;
  const laneWidthPercentage = 100 / laneCount;

  return (
    <div className="h-full w-full flex flex-col bg-[var(--color-dark-bg,#0B1120)] relative overflow-hidden">
      {/* Slim Top Bar (one row) */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border,#1E3A5F)] bg-[var(--color-surface,#111827)] z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white tracking-wide">Workflow Intelligence Platform</h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide">Oracle Transportation Management 26B</p>
          </div>
        </div>

        {/* Filter pills center-left */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-extrabold tracking-wider text-slate-500 uppercase mr-1">FILTER VIEW:</span>
          <button
            type="button"
            onClick={() => {
              setViewMode("all");
              setSelection(null);
              setFirstSelectedNodeId(null);
              setRealSecondSelectedNodeId(null);
            }}
            className={`py-1.5 px-3 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all border ${
              viewMode === "all"
                ? "bg-[rgba(56,189,248,0.1)] text-[#38bdf8] border-[#38bdf8]/40 shadow-sm"
                : "bg-transparent text-slate-400 border-slate-700/60 hover:text-slate-200"
            }`}
          >
            All Workflows
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("conflicts");
              setSelection(null);
              setFirstSelectedNodeId(null);
              setRealSecondSelectedNodeId(null);
            }}
            className={`py-1.5 px-3 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all border ${
              viewMode === "conflicts"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-sm"
                : "bg-transparent text-slate-400 border-slate-700/60 hover:text-rose-300"
            }`}
          >
            Trigger Conflicts
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("bottlenecks");
              setSelection(null);
              setFirstSelectedNodeId(null);
              setRealSecondSelectedNodeId(null);
            }}
            className={`py-1.5 px-3 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all border ${
              viewMode === "bottlenecks"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-sm"
                : "bg-transparent text-slate-400 border-slate-700/60 hover:text-amber-300"
            }`}
          >
            Bottlenecks
          </button>
        </div>

        {/* Right side: Collapsible search + Export actions */}
        <div className="flex items-center gap-2">
          {/* Compact Collapsible Search */}
          <div className="relative flex items-center">
            {searchExpanded ? (
              <div className="flex items-center gap-1.5 bg-[var(--color-navy,#16233A)] border border-[var(--color-border,#1E3A5F)] px-2.5 py-1 rounded-lg">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  placeholder="Search by name, trigger..."
                  className="w-40 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchExpanded(false);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchExpanded(true)}
                className="p-1.5 rounded-lg bg-[var(--color-navy,#16233A)] border border-[var(--color-border,#1E3A5F)] hover:bg-slate-800 text-slate-300 transition-colors"
                title="Search workflows"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

            {/* Autocomplete Dropdown Search Overlay */}
            {searchExpanded && searchFocused && searchResults.length > 0 && (
              <div className="absolute right-0 top-9 w-64 bg-[#0E1726] border border-[var(--color-border,#1E3A5F)] rounded-lg shadow-2xl z-50 overflow-hidden divide-y divide-[var(--color-border,#1E3A5F)]/50">
                {searchResults.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onMouseDown={() => {
                      setSelection({ kind: "node", id: node.id });
                      setSearch("");
                      setSearchExpanded(false);
                      if (rfInstance) {
                        rfInstance.setCenter(node.position.x, node.position.y, { zoom: 1.3, duration: 800 });
                      }
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--color-navy,#16233A)] flex items-center justify-between text-[11px] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate">{node.data.label}</p>
                      <p className="text-[9px] text-slate-400 truncate uppercase">
                        {node.data.subtitle || node.data.kind}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[var(--color-navy,#16233A)] border border-[var(--color-border,#1E3A5F)] hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[var(--color-navy,#16233A)] border border-[var(--color-border,#1E3A5F)] hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Export to Visio</span>
          </button>
        </div>
      </div>

      {/* Domain Swimlane Headers Row */}
      <div className={`grid border-b border-[var(--color-border,#1E3A5F)] bg-[var(--color-navy,#16233A)] text-[10px] font-extrabold tracking-wider text-[var(--color-text-secondary,#94A3B8)] uppercase select-none z-10`} style={{ gridTemplateColumns: `repeat(${laneCount}, 1fr)` }}>
        {laneHeaders.map(([title, count], idx) => (
          <div
            key={String(title)}
            className={`flex items-center justify-between px-6 py-2 ${
              idx < laneCount - 1 ? "border-r border-[var(--color-border,#1E3A5F)]/50" : ""
            }`}
          >
            <span>{title}</span>
            <span className="flex items-center justify-center bg-[var(--color-surface,#111827)] text-slate-300 px-2 py-0.5 rounded text-[9px] font-extrabold border border-[var(--color-border,#1E3A5F)] shadow-sm">
              {count}
            </span>
          </div>
        ))}
      </div>

      {/* Main Canvas & Overlay Inspector Area — WHITE canvas background */}
      <div className="flex-1 relative overflow-hidden flex flex-row bg-[#FAFAFA]">
        
        {/* Absolute Background Vertical Column Dividers — light gray for white canvas */}
        <div className="absolute inset-0 pointer-events-none flex z-0 select-none">
          {Array.from({ length: laneCount }).map((_, i) => (
            <div key={i} className={`h-full border-[#E5E5E5]/60 ${i < laneCount - 1 ? "border-r" : ""}`} style={{ width: `${laneWidthPercentage}%` }} />
          ))}
        </div>

        {/* Pathfinder Status Banner (Docked at the top of the canvas absolute) */}
        {firstSelectedNodeId && secondSelectedNodeId && (
          <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-[#0E1726] border border-amber-500/40 rounded-xl px-5 py-2.5 shadow-2xl z-40 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-xs text-slate-200 font-semibold">
                Showing path(s) connecting <span className="font-bold text-white">{visibleNodes.find(n => n.id === firstSelectedNodeId)?.data.label}</span> and <span className="font-bold text-white">{visibleNodes.find(n => n.id === secondSelectedNodeId)?.data.label}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-extrabold uppercase tracking-wider transition-all border border-amber-500/30"
            >
              Clear Path Trace
            </button>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <div className="w-full h-full relative z-10">
          <ReactFlow
            key="catalyst-workflow-map"
            nodes={visibleNodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.08 }}
            nodeOrigin={[0.5, 0.5]}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            zoomOnScroll={false}
            zoomOnPinch={true}
            panOnDrag={true}
            panOnScroll={false}
            preventScrolling={false}
            zoomOnDoubleClick={true}
            selectNodesOnDrag={false}
            defaultEdgeOptions={{
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed, color: "#4B5563" }
            }}
            onNodeClick={(_, node) => setSelection({ kind: "node", id: node.id })}
            onEdgeClick={(_, edge) => setSelection({ kind: "edge", id: edge.id })}
            onPaneClick={() => setSelection(null)}
            onInit={setRfInstance}
          >
            <MiniMap
              position="bottom-right"
              nodeColor={(node) => node.data.domain_color ?? relationshipColor(node.data.kind)}
              nodeStrokeWidth={3}
              maskColor="rgba(250,250,250,0.6)"
              style={{ width: 180, height: 120 }}
              className="!rounded-xl !border !border-slate-200 !bg-white/95 !shadow-sm !bottom-12 !right-16"
            />
            <Controls showInteractive={false} position="bottom-right" className="!rounded-xl !border !border-slate-200 !bg-white/95 !shadow-sm !text-slate-600 !bottom-12 !right-4" />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#D1D5DB" />
          </ReactFlow>
        </div>

        {/* Legend Bar — compact bottom bar with 3 organized groups */}
        <div className="absolute bottom-0 left-0 right-0 h-10 border-t border-slate-200 bg-white flex items-center justify-between px-6 z-20 text-[10px] text-slate-500 font-semibold select-none">
          <div className="flex items-center gap-5 flex-wrap">
            {/* Domain Group */}
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">DOMAIN:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
              <span>Shipment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#14B8A6]" />
              <span>Invoice</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
              <span>GTM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F97316]" />
              <span>AI & Recovery</span>
            </div>

            <span className="mx-1 h-4 w-px bg-slate-200" />

            {/* Agent Type Group */}
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">TYPE:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#64748B]" />
              <span>Classic</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#D97706]" />
              <span>AI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
              <span>AI (Limited)</span>
            </div>

            <span className="mx-1 h-4 w-px bg-slate-200" />

            {/* Signals Group */}
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">SIGNALS:</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 rounded-full bg-[#DC2626] text-white text-[8px] font-extrabold">⚡ 3</span>
              <span>Conflict</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center justify-center bg-slate-800 text-white rounded-sm px-1 text-[8px] font-extrabold">◆</span>
              <span>Bottleneck</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-[#4B5563]" />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 border-b-2 border-dashed border-[#EF4444]" />
              <span>Conflict</span>
            </div>
          </div>

          {/* Connection Risk legend — visible ONLY in blast-radius active selection state */}
          {firstSelectedNodeId && !secondSelectedNodeId && (
            <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Risk:</span>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-[#16A34A]" />
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-[#D97706]" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-[#DC2626]" />
                <span>High</span>
              </div>
            </div>
          )}
        </div>

        {/* Slide-in Overlay Inspector Drawer (only visible when a node is clicked) */}
        {selectedDisplayNode && (
          <aside className="absolute right-0 top-0 bottom-10 w-[420px] bg-[#0E1726] border-l border-[var(--color-border,#1E3A5F)] shadow-2xl z-30 flex flex-col transition-all duration-300">
            {/* Inspector Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border,#1E3A5F)]">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white truncate max-w-[280px]">
                  {selectedDisplayNode.data.label}
                </h2>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wide uppercase ${
                  selectedDisplayNode.data.entity_type === "oracle_ai_agent" ? "bg-[#F97316] text-white" : "bg-purple-500/20 text-purple-300"
                }`}>
                  {selectedDisplayNode.data.entity_type === "oracle_ai_agent" ? "AI" : "Legacy"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
              
              {/* Event Trigger Section */}
              <div className="bg-[#16233A]/60 border border-[var(--color-border,#1E3A5F)] rounded-xl p-3.5 space-y-2">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Event Trigger</p>
                <div className="flex items-center justify-between bg-[var(--color-surface,#111827)] border border-[var(--color-border,#1E3A5F)] rounded-lg px-3 py-2 font-mono text-[11px] text-[#38bdf8]">
                  <span>{selectedDisplayNode.data.subtitle || "—"}</span>
                  <span className="text-[9px] text-[#38bdf8] font-bold">OTM ↗</span>
                </div>
                <p className="text-[9px] text-slate-500 font-semibold uppercase">
                  Object Type: {selectedDisplayNode.data.subtitle?.split(" - ")[0] || "AGENT"}
                </p>
              </div>

              {/* Execution Conditions */}
              <div className="space-y-2">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Execution Conditions</p>
                <ul className="space-y-1.5 list-disc list-inside text-slate-300 bg-[#16233A]/20 border border-[var(--color-border,#1E3A5F)]/50 rounded-xl p-3.5">
                  <li>Triggered by default {selectedDisplayNode.data.subtitle?.split(" - ")[0] || "AGENT"} transaction changes</li>
                  <li>Matches domain ownership context &apos;{selectedDisplayNode.data.domain_gid || "NWL"}&apos;</li>
                  <li>Status validation checks active boolean status</li>
                </ul>
              </div>

              {/* Action Sequence */}
              <div className="space-y-2">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Action Sequence</p>
                <div className="bg-[#16233A]/20 border border-[var(--color-border,#1E3A5F)]/50 rounded-xl p-3.5 text-slate-400 italic">
                  {selectedActions.length > 0 && selectedActions[0] !== "No direct actions exposed for this node type." ? (
                    <ul className="space-y-1 list-disc list-inside text-slate-300 not-italic">
                      {selectedActions.map((action, i) => <li key={i}>{action}</li>)}
                    </ul>
                  ) : (
                    "No actions configured for this agent profile."
                  )}
                </div>
              </div>

              {/* Dependencies */}
              <div className="space-y-2">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Dependencies</p>
                <div className="bg-[#16233A]/20 border border-[var(--color-border,#1E3A5F)]/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-[#38bdf8]/15 border border-[#38bdf8]/35 text-[#38bdf8] rounded px-2 py-0.5 text-[9px] font-extrabold uppercase">
                      Domain: {selectedDisplayNode.data.domain_gid || "NWL"}
                    </span>
                    {selectedNodeConflicts.map((c) => (
                      <span key={c.conflict_id} className="bg-rose-500/15 border border-rose-500/35 text-rose-400 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase">
                        Collides: {c.affected_agents.find(a => a.agent_gid !== selectedDisplayNode.data.entity_gid)?.agent_name || "Agent"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trigger Conflicts Red Card */}
              {selectedNodeConflicts.length > 0 && (
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 space-y-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                    <span>⚡</span> Trigger conflicts
                  </p>
                  <p className="text-[10px] text-rose-200">
                    This agent shares its trigger with {selectedNodeConflicts.length} other agent(s):
                  </p>
                  
                  <div className="space-y-2">
                    {selectedNodeConflicts.flatMap(c => c.affected_agents).filter(a => a.agent_gid !== selectedDisplayNode.data.entity_gid).map((agent, i) => (
                      <div key={i} className="flex items-center justify-between bg-rose-950/40 border border-rose-500/20 rounded-lg px-2.5 py-1.5">
                        <span className="font-bold text-rose-200 text-[10px] truncate max-w-[220px]">
                          {agent.agent_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const targetNodeId = agent.source === "ai" ? `oracle-ai-agent:${agent.agent_gid}` : `legacy-agent:${agent.agent_gid}`;
                            const found = visibleNodes.find(n => n.id === targetNodeId);
                            if (found) {
                              setSelection({ kind: "node", id: targetNodeId });
                              if (rfInstance) {
                                rfInstance.setCenter(found.position.x, found.position.y, { zoom: 1.3, duration: 800 });
                              }
                            }
                          }}
                          className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 rounded px-2 py-0.5 text-[9px] font-extrabold transition-all"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Buttons Grid */}
            <div className="p-4 border-t border-[var(--color-border,#1E3A5F)] bg-[#111827] space-y-2 z-10 select-none">
              <button
                type="button"
                onClick={() => router.push(`/ask-catalyst?agent_gid=${selectedDisplayNode.data.entity_gid}`)}
                className="w-full py-2 rounded-lg bg-[#3F51B5] hover:bg-[#4D62CD] text-white text-[10px] font-extrabold uppercase tracking-wider transition-colors shadow-sm"
              >
                AI Explain
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/agent-trace?agent_gid=${selectedDisplayNode.data.entity_gid}`)}
                  className="py-1.5 rounded bg-[var(--color-navy,#16233A)] hover:bg-slate-800 border border-[var(--color-border,#1E3A5F)] text-slate-300 text-[9px] font-extrabold uppercase tracking-wide transition-colors"
                >
                  Simulate Trace
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/version-comparison?agent_gid=${selectedDisplayNode.data.entity_gid}`)}
                  className="py-1.5 rounded bg-[var(--color-navy,#16233A)] hover:bg-slate-800 border border-[var(--color-border,#1E3A5F)] text-slate-300 text-[9px] font-extrabold uppercase tracking-wide transition-colors"
                >
                  Compare Versions
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/agents?agent_gid=${selectedDisplayNode.data.entity_gid}`)}
                  className="py-1.5 rounded bg-[var(--color-navy,#16233A)] hover:bg-slate-800 border border-[var(--color-border,#1E3A5F)] text-slate-300 text-[9px] font-extrabold uppercase tracking-wide transition-colors"
                >
                  Agent Workbench
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/conflicts?agent_gid=${selectedDisplayNode.data.entity_gid}`)}
                  className="py-1.5 rounded bg-[var(--color-navy,#16233A)] hover:bg-slate-800 border border-[var(--color-border,#1E3A5F)] text-slate-300 text-[9px] font-extrabold uppercase tracking-wide transition-colors"
                >
                  Agent Conflicts
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}


