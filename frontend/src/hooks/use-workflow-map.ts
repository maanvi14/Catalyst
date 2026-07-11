"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import {
  AgentEventRead,
  AiAgentRead,
  AgentRead,
  ConflictRead,
  DashboardSummary,
  GraphResponse,
  HealthResponse
} from "@/types/api";

export interface WorkflowMapData {
  health: HealthResponse;
  summary: DashboardSummary;
  graph: GraphResponse;
  conflicts: ConflictRead[];
  agents: AgentRead[];
  events: AgentEventRead[];
  aiAgents: AiAgentRead[];
}

export function useWorkflowMap() {
  return useQuery({
    queryKey: ["workflow-map"],
    queryFn: async (): Promise<WorkflowMapData> => {
      const [health, summary, graph, conflicts, agents, events, aiAgents] = await Promise.all([
        apiClient.get<HealthResponse>("/health"),
        apiClient.get<DashboardSummary>("/dashboard"),
        apiClient.get<GraphResponse>("/graph"),
        apiClient.get<ConflictRead[]>("/conflicts"),
        apiClient.get<AgentRead[]>("/agents"),
        apiClient.get<AgentEventRead[]>("/events"),
        apiClient.get<AiAgentRead[]>("/ai-agents")
      ]);

      return { health, summary, graph, conflicts, agents, events, aiAgents };
    }
  });
}