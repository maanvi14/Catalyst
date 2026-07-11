"""initial Catalyst fixture schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table("domains", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("domain_gid", sa.String(255), nullable=False), sa.Column("domain_xid", sa.String(255), nullable=False), sa.Column("parent_domain_gid", sa.String(255)), sa.Column("description", sa.Text()), sa.UniqueConstraint("domain_gid", name="uq_domains_domain_gid"))
    op.create_table("agents", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("agent_gid", sa.String(255), nullable=False), sa.Column("agent_xid", sa.String(255), nullable=False), sa.Column("domain_gid", sa.String(255), nullable=False), sa.Column("agent_name", sa.String(255), nullable=False), sa.Column("target_object_type", sa.String(100)), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("definition", sa.Text()), sa.UniqueConstraint("agent_gid", name="uq_agents_agent_gid"))
    op.create_table("agent_actions", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("agent_gid", sa.String(255), nullable=False), sa.Column("seq_no", sa.Integer(), nullable=False), sa.Column("action_type", sa.String(255), nullable=False), sa.Column("parameters", sa.Text()), sa.Column("raw_text", sa.Text()), sa.UniqueConstraint("agent_gid", "seq_no", name="uq_agent_actions_agent_seq"))
    op.create_table("agent_events", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("agent_gid", sa.String(255), nullable=False), sa.Column("event_gid", sa.String(255), nullable=False), sa.Column("event_name", sa.String(255), nullable=False), sa.Column("saved_condition_query_gid", sa.String(255)), sa.UniqueConstraint("agent_gid", "event_gid", name="uq_agent_events_agent_event"))
    op.create_table("ai_agents", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("agent_gid", sa.String(255), nullable=False), sa.Column("agent_xid", sa.String(255), nullable=False), sa.Column("domain_gid", sa.String(255), nullable=False), sa.Column("agent_name", sa.String(255), nullable=False), sa.Column("visibility", sa.String(100), nullable=False), sa.Column("trigger_event", sa.String(255)), sa.Column("definition_detail", sa.Text()), sa.UniqueConstraint("agent_gid", name="uq_ai_agents_agent_gid"))
    op.create_table("refnum_quals", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("qual_gid", sa.String(255), nullable=False), sa.Column("qual_xid", sa.String(255), nullable=False), sa.Column("domain_gid", sa.String(255), nullable=False), sa.Column("target_object_type", sa.String(100)), sa.Column("description", sa.Text()), sa.UniqueConstraint("qual_gid", name="uq_refnum_quals_qual_gid"))
    op.create_table("saved_queries", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("query_gid", sa.String(255), nullable=False), sa.Column("query_xid", sa.String(255), nullable=False), sa.Column("domain_gid", sa.String(255), nullable=False), sa.Column("name", sa.String(255), nullable=False), sa.Column("target_object_type", sa.String(100)), sa.Column("sql_text", sa.Text(), nullable=False), sa.UniqueConstraint("query_gid", name="uq_saved_queries_query_gid"))
    op.create_table("sequences", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("sequence_name", sa.String(255), nullable=False), sa.Column("domain_gid", sa.String(255), nullable=False), sa.Column("current_value", sa.Integer(), nullable=False), sa.Column("max_value", sa.Integer()), sa.UniqueConstraint("sequence_name", "domain_gid", name="uq_sequences_name_domain"))
    op.create_table("fixture_files", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("file_name", sa.String(255), nullable=False), sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"), sa.Column("loaded_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.UniqueConstraint("file_name", name="uq_fixture_files_file_name"))


def downgrade() -> None:
    for table in ["fixture_files", "sequences", "saved_queries", "refnum_quals", "ai_agents", "agent_events", "agent_actions", "agents", "domains"]:
        op.drop_table(table)
