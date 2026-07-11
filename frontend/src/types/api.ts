export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
}

export interface ModuleSummary {
  key: string;
  name: string;
  status: string;
}

export interface DashboardSummary {
  domains: number;
  agents: number;
  active_agents: number;
  ai_agents: number;
  events: number;
  actions: number;
  saved_queries: number;
  sequences: number;
  fixture_files_loaded: number;
}

export interface AgentRead {
  id: number;
  agent_gid: string;
  agent_xid: string;
  domain_gid: string;
  agent_name: string;
  target_object_type: string | null;
  is_active: boolean;
  definition: string | null;
}

export interface AiAgentRead {
  id: number;
  agent_gid: string;
  agent_xid: string;
  domain_gid: string;
  agent_name: string;
  visibility: string;
  trigger_event: string | null;
  definition_detail: string | null;
}

export interface AgentEventRead {
  id: number;
  agent_gid: string;
  event_gid: string;
  event_name: string;
  saved_condition_query_gid: string | null;
}

export interface SavedQueryRead {
  id: number;
  query_gid: string;
  query_xid: string;
  domain_gid: string;
  name: string;
  target_object_type: string | null;
  sql_text: string;
}

export interface SequenceRead {
  id: number;
  sequence_name: string;
  domain_gid: string;
  current_value: number;
  max_value: number | null;
}

export interface ConflictAgentRead {
  agent_gid: string;
  agent_xid: string;
  agent_name: string;
  domain_gid: string;
  source: string;
}

export interface ConflictRead {
  conflict_id: string;
  conflict_type: string;
  severity: string;
  trigger_event: string;
  affected_agents: ConflictAgentRead[];
  suggested_resolution: string;
  evidence_count?: number;
}

export type ConflictDetail = ConflictRead;

export interface FixtureFileRead {
  id: number;
  file_name: string;
  row_count: number;
  loaded_at: string | null;
}

export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphNodeData {
  label: string;
  kind: string;
  subtitle: string;
  domain_gid: string | null;
  entity_type: string;
  entity_gid: string;
  domain_label?: string;
  domain_color?: string;
  selected?: boolean;
  matched?: boolean;
  is_spof?: boolean;
  centrality?: number;
  is_conflicted?: boolean;
  conflict_count?: number;
  is_limited?: boolean;
  border_highlight_color?: string;
  success_rate?: string;
  version?: string;
}

export interface GraphNodeRead {
  id: string;
  type: string;
  position: GraphPoint;
  data: GraphNodeData;
}

export interface GraphEdgeData {
  relationship: string;
  severity?: string;
  conflict_id?: string;
  conflict_type?: string;
  trigger_event?: string;
}

export interface GraphEdgeRead {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  animated: boolean;
  data: GraphEdgeData;
}

export interface GraphMetadata {
  total_nodes: number;
  total_edges: number;
  node_counts: Record<string, number>;
  edge_counts: Record<string, number>;
  domain_count: number;
  layout: string;
  layout_seed: number;
}

export interface GraphResponse {
  nodes: GraphNodeRead[];
  edges: GraphEdgeRead[];
  metadata: GraphMetadata;
}

export interface ProcessJob {
  job_name: string;
  schedule: string;
  last_run: string;
  duration: string;
  trend: string;
  health: string;
}

export interface AuditLog {
  timestamp: string;
  user: string;
  action: string;
  target: string;
  environment: string;
  result: string;
}

export interface TraceStep {
  title: string;
  detail: string;
  duration: string;
  status: string;
}

export interface TraceResponse {
  run_id: string;
  agent_gid: string;
  shipment_gid: string;
  status: string;
  steps: TraceStep[];
}

export interface AskResponse {
  answer: string;
  grounded: boolean;
  question: string;
  citations: string[];
}

export interface AgentActionRead {
  id: number;
  agent_gid: string;
  action_type: string;
  parameters: string | null;
  sequence_num: number;
}

export interface AgentDetail {
  agent_gid: string;
  agent_xid: string;
  domain_gid: string;
  agent_name: string;
  target_object_type: string | null;
  is_active: boolean;
  definition: string | null;
  is_ai: boolean;
  visibility?: string;
  events: AgentEventRead[];
  actions: AgentActionRead[];
}


