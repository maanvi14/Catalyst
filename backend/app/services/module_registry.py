from app.schemas.module import ModuleSummary


MODULES = [
    ("dashboard", "Dashboard"),
    ("workflow-map", "Workflow Map"),
    ("agents", "Agents"),
    ("conflicts", "Conflicts"),
    ("version-comparison", "Version Comparison"),
    ("agent-trace", "Agent Trace"),
    ("process-health", "Process Health"),
    ("audit-logs", "Audit Logs"),
    ("ask-catalyst", "Ask Catalyst"),
    ("comma-list", "Comma List"),
    ("settings", "Settings"),
]


def get_module_registry() -> list[ModuleSummary]:
    return [ModuleSummary(key=key, name=name, status="foundation") for key, name in MODULES]

