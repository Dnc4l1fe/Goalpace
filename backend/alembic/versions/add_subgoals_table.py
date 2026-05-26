"""добавление таблицы subgoals и поля subgoal_id в logs

Revision ID: add_subgoals
Revises: 1e316c7eeff6
Create Date: 2025-12-21

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'add_subgoals'
down_revision: Union[str, None] = '1e316c7eeff6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'subgoals',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('goal_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('target', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    with op.batch_alter_table('logs') as batch_op:
        batch_op.add_column(sa.Column('subgoal_id', sa.String(), nullable=True))
        batch_op.create_foreign_key(
            'fk_logs_subgoal_id',
            'subgoals',
            ['subgoal_id'],
            ['id'],
            ondelete='CASCADE'
        )
        batch_op.drop_constraint('uq_goal_log_date', type_='unique')
        batch_op.create_unique_constraint(
            'uq_goal_subgoal_log_date',
            ['goal_id', 'subgoal_id', 'log_date']
        )


def downgrade() -> None:
    with op.batch_alter_table('logs') as batch_op:
        batch_op.drop_constraint('uq_goal_subgoal_log_date', type_='unique')
        batch_op.create_unique_constraint('uq_goal_log_date', ['goal_id', 'log_date'])
        batch_op.drop_constraint('fk_logs_subgoal_id', type_='foreignkey')
        batch_op.drop_column('subgoal_id')
    op.drop_table('subgoals')
