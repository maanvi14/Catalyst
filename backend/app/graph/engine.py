from __future__ import annotations

import math
import re
from collections import Counter, defaultdict

import networkx as nx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Agent, AgentEvent, AiAgent, Domain
from app.schemas.graph import GraphEdge, GraphMetadata, GraphNode, GraphPoint, GraphResponse


class WorkflowGraphEngine:
    _EVENT_PATTERN = re.compile(r"<event>(.*?)</event>", re.IGNORECASE | re.DOTALL)

    def build(self, session: Session) -> GraphResponse:
        graph = nx.DiGraph()
        node_kind_counts: Counter[str] = Counter()
        edge_type_counts: Counter[str] = Counter()

        # Load all agents and domains
        agents = list(session.scalars(select(Agent).order_by(Agent.agent_gid)))
        ai_agents = list(session.scalars(select(AiAgent).order_by(AiAgent.agent_gid)))
        domains = list(session.scalars(select(Domain).order_by(Domain.domain_gid)))
        agent_events = list(session.scalars(select(AgentEvent).order_by(AgentEvent.agent_gid, AgentEvent.event_gid)))

        # Build helpers
        event_by_agent = {e.agent_gid: e.event_name for e in agent_events}

        # Add Legacy Agents as nodes
        for agent in agents:
            node_id = f"legacy-agent:{agent.agent_gid}"
            trigger_event = event_by_agent.get(agent.agent_gid) or self._extract_event_name(agent.definition) or "—"
            
            # Find domain label
            domain_obj = next((d for d in domains if d.domain_gid == agent.domain_gid), None)
            domain_label = domain_obj.domain_xid if domain_obj else agent.domain_gid

            self._add_node(
                graph,
                node_id=node_id,
                kind="Legacy Agents",
                label=agent.agent_name,
                subtitle=trigger_event,
                domain_gid=agent.domain_gid,
                entity_type="legacy_agent",
                entity_gid=agent.agent_gid,
                domain_label=domain_label,
            )
            node_kind_counts["Legacy Agents"] += 1

        # Add Oracle AI Agents as nodes
        for ai_agent in ai_agents:
            node_id = f"oracle-ai-agent:{ai_agent.agent_gid}"
            
            # Find domain label
            domain_obj = next((d for d in domains if d.domain_gid == ai_agent.domain_gid), None)
            domain_label = domain_obj.domain_xid if domain_obj else ai_agent.domain_gid

            self._add_node(
                graph,
                node_id=node_id,
                kind="Oracle AI Agents",
                label=ai_agent.agent_name,
                subtitle=ai_agent.trigger_event or "—",
                domain_gid=ai_agent.domain_gid,
                entity_type="oracle_ai_agent",
                entity_gid=ai_agent.agent_gid,
                domain_label=domain_label,
            )
            node_kind_counts["Oracle AI Agents"] += 1

        # Map agent GIDs to event names for sequence connecting
        agents_by_event = defaultdict(list)
        for agent in agents:
            trigger_event = event_by_agent.get(agent.agent_gid) or self._extract_event_name(agent.definition)
            if trigger_event:
                agents_by_event[trigger_event.strip()].append(f"legacy-agent:{agent.agent_gid}")

        for ai_agent in ai_agents:
            if ai_agent.trigger_event:
                agents_by_event[ai_agent.trigger_event.strip()].append(f"oracle-ai-agent:{ai_agent.agent_gid}")

        # Business Process Event Flow sequence
        EVENT_FLOW = {
            "ORDER_RELEASE - CREATED": ["ORDER_RELEASE - APPROVED", "GTM - ORDER_SCREENING"],
            "ORDER_RELEASE - APPROVED": ["SHIPMENT - CREATED"],
            "SHIPMENT - CREATED": ["SHIPMENT - PLANNED", "SHIPMENT - EVENT"],
            "SHIPMENT - PLANNED": ["SHIPMENT - RATED", "GTM - SHIPMENT_EXPORT"],
            "SHIPMENT - RATED": ["SHIPMENT - TENDER"],
            "SHIPMENT - TENDER": ["SHIPMENT - TENDERED"],
            "SHIPMENT - TENDERED": ["SHIPMENT - DISPATCHED"],
            "SHIPMENT - DISPATCHED": ["SHIPMENT - ARRIVED"],
            "SHIPMENT - ARRIVED": ["SHIPMENT - DELIVERED"],
            "SHIPMENT - DELIVERED": ["SHIPMENT - COMPLETED", "INVOICE - GENERATE"],
            "INVOICE - GENERATE": ["INVOICE - RECEIVED"],
            "INVOICE - RECEIVED": ["INVOICE - APPROVED"],
            "INVOICE - APPROVED": ["INVOICE - PAYMENT_RECEIVED"],
        }

        # Connect agents based on event sequence flow
        for source_event, target_events in EVENT_FLOW.items():
            source_nodes = agents_by_event.get(source_event, [])
            for target_event in target_events:
                target_nodes = agents_by_event.get(target_event, [])
                for src in source_nodes:
                    for tgt in target_nodes:
                        self._add_edge(graph, source=src, target=tgt, label="Depends On")
                        edge_type_counts["Depends On"] += 1

        # Compute betweenness centrality strictly on the Agent-to-Agent graph
        centrality = nx.betweenness_centrality(graph)
        centrality_values = [v for v in centrality.values() if v > 0.0]
        centrality_values.sort(reverse=True)
        cutoff_idx = max(0, int(len(centrality_values) * 0.1) - 1)
        spof_threshold = centrality_values[cutoff_idx] if centrality_values else 0.01

        nodes, edges = self._to_react_flow(graph, centrality, spof_threshold)
        metadata = GraphMetadata(
            total_nodes=len(nodes),
            total_edges=len(edges),
            node_counts=dict(sorted(node_kind_counts.items())),
            edge_counts=dict(sorted(edge_type_counts.items())),
            domain_count=len(domains),
            layout="spring",
            layout_seed=7,
        )
        return GraphResponse(nodes=nodes, edges=edges, metadata=metadata)

    def _add_node(
        self,
        graph: nx.DiGraph,
        *,
        node_id: str,
        kind: str,
        label: str,
        subtitle: str,
        domain_gid: str | None,
        entity_type: str,
        entity_gid: str,
        domain_label: str,
    ) -> None:
        graph.add_node(
            node_id,
            kind=kind,
            label=label,
            subtitle=subtitle,
            domain_gid=domain_gid,
            entity_type=entity_type,
            entity_gid=entity_gid,
            domain_label=domain_label,
        )

    def _add_edge(self, graph: nx.DiGraph, *, source: str, target: str, label: str) -> None:
        edge_id = f"{source}->{target}:{label}"
        graph.add_edge(source, target, id=edge_id, label=label, type="smoothstep", animated=False)

    def _to_react_flow(self, graph: nx.DiGraph, centrality: dict[str, float] = None, spof_threshold: float = 0.01) -> tuple[list[GraphNode], list[GraphEdge]]:
        if graph.number_of_nodes() == 0:
            return [], []

        layout = nx.spring_layout(graph.to_undirected(), seed=7)
        scale = max(180.0, math.sqrt(graph.number_of_nodes()) * 220.0)

        nodes: list[GraphNode] = []
        for node_id, attributes in graph.nodes(data=True):
            x, y = layout.get(node_id, (0.0, 0.0))
            node_centrality = centrality.get(node_id, 0.0) if centrality else 0.0
            is_spof = node_centrality >= spof_threshold and node_centrality > 0.0
            nodes.append(
                GraphNode(
                    id=node_id,
                    type="default",
                    position=GraphPoint(x=float(x * scale), y=float(y * scale)),
                    data={
                        "label": attributes["label"],
                        "kind": attributes["kind"],
                        "subtitle": attributes["subtitle"],
                        "domain_gid": attributes["domain_gid"],
                        "entity_type": attributes["entity_type"],
                        "entity_gid": attributes["entity_gid"],
                        "domain_label": attributes["domain_label"],
                        "centrality": node_centrality,
                        "is_spof": is_spof,
                    },
                )
            )

        edges: list[GraphEdge] = []
        for source, target, attributes in graph.edges(data=True):
            edges.append(
                GraphEdge(
                    id=attributes["id"],
                    source=source,
                    target=target,
                    label=attributes["label"],
                    type=attributes["type"],
                    animated=attributes["animated"],
                    data={"relationship": attributes["label"]},
                )
            )

        return nodes, edges

    def _extract_event_name(self, definition: str | None) -> str | None:
        if not definition:
            return None
        match = self._EVENT_PATTERN.search(definition)
        if not match:
            return None
        return match.group(1).strip() or None
