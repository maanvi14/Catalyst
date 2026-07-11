from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class GraphPoint(BaseModel):
    x: float
    y: float


class GraphNode(BaseModel):
    id: str
    type: str = "default"
    position: GraphPoint
    data: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    type: str = "smoothstep"
    animated: bool = False
    data: dict[str, Any] = Field(default_factory=dict)


class GraphMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_nodes: int
    total_edges: int
    node_counts: dict[str, int]
    edge_counts: dict[str, int]
    domain_count: int
    layout: str
    layout_seed: int


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    metadata: GraphMetadata