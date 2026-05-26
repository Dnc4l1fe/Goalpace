import uuid
from datetime import datetime, date, timezone
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from database import Base


class GoalType(str, enum.Enum):
    TIME = "time"
    COUNT = "count"


class GoalUnit(str, enum.Enum):
    HOURS = "hours"
    COUNT = "count"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, nullable=True)
    tz = Column(String, default="Europe/Moscow")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    type = Column(Enum(GoalType), nullable=False)
    target = Column(Float, nullable=False)
    unit = Column(Enum(GoalUnit), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    priority = Column(Integer, default=2)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="goals")
    logs = relationship("Log", back_populates="goal", cascade="all, delete-orphan")
    subgoals = relationship("Subgoal", back_populates="goal", cascade="all, delete-orphan", order_by="Subgoal.position")


class Subgoal(Base):
    __tablename__ = "subgoals"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = Column(String, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    target = Column(Float, nullable=False)
    position = Column(Integer, default=0)

    goal = relationship("Goal", back_populates="subgoals")
    logs = relationship("Log", back_populates="subgoal", cascade="all, delete-orphan")


class Log(Base):
    __tablename__ = "logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = Column(String, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    subgoal_id = Column(String, ForeignKey("subgoals.id", ondelete="CASCADE"), nullable=True)
    log_date = Column(Date, nullable=False)
    minutes_spent = Column(Integer, default=0)
    count_done = Column(Integer, default=0)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    goal = relationship("Goal", back_populates="logs")
    subgoal = relationship("Subgoal", back_populates="logs")

    __table_args__ = (
        UniqueConstraint('goal_id', 'subgoal_id', 'log_date', name='uq_goal_subgoal_log_date'),
    )
