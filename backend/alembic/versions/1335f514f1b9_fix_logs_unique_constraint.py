"""fix logs unique constraint

Revision ID: 1335f514f1b9
Revises: add_subgoals
Create Date: 2026-03-27 02:50:54.077984

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1335f514f1b9'
down_revision: Union[str, None] = 'add_subgoals'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
