"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import {
  AgentEventRead,
  AiAgentRead,
  AgentRead,
  ConflictRead,
  DashboardSummary,
  FixtureFileRead,
  HealthResponse,
  SavedQueryRead,
  SequenceRead
} from "@/types/api";

export interface DashboardOverview {
  health: HealthResponse;
  summary: DashboardSummary;
  conflicts: ConflictRead[];
  aiAgents: AiAgentRead[];
  agents: AgentRead[];
  events: AgentEventRead[];
  savedQueries: SavedQueryRead[];
  sequences: SequenceRead[];
  uploads: FixtureFileRead[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async (): Promise<DashboardOverview> => {
      const [health, summary, conflicts, aiAgents, agents, events, savedQueries, sequences, uploads] = await Promise.all([
        apiClient.get<HealthResponse>("/health"),
        apiClient.get<DashboardSummary>("/dashboard"),
        apiClient.get<ConflictRead[]>("/conflicts"),
        apiClient.get<AiAgentRead[]>("/ai-agents"),
        apiClient.get<AgentRead[]>("/agents"),
        apiClient.get<AgentEventRead[]>("/events"),
        apiClient.get<SavedQueryRead[]>("/saved-queries"),
        apiClient.get<SequenceRead[]>("/sequences"),
        apiClient.get<FixtureFileRead[]>("/fixtures/uploads")
      ]);

      return { health, summary, conflicts, aiAgents, agents, events, savedQueries, sequences, uploads };
    }
  });
}