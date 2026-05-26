from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List
from models.models import GoalType, GoalUnit


# User schemas
class UserBase(BaseModel):
    email: Optional[str] = None
    tz: str = "Europe/Moscow"


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Goal schemas
class SubgoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    target: float = Field(..., gt=0)


class SubgoalRead(BaseModel):
    id: str
    title: str
    target: float
    current: float = 0

    class Config:
        from_attributes = True


class SubgoalUpdate(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    target: float = Field(..., gt=0)


class GoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    type: GoalType
    target: float = Field(..., gt=0)
    unit: GoalUnit
    period_start: date
    period_end: date
    priority: int = Field(default=2, ge=1, le=3)
    notes: Optional[str] = None


class GoalCreate(GoalBase):
    plan: List[SubgoalCreate] = []


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    target: Optional[float] = Field(None, gt=0)
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    priority: Optional[int] = Field(None, ge=1, le=3)
    notes: Optional[str] = None
    plan: Optional[List[SubgoalUpdate]] = None


class GoalResponse(GoalBase):
    id: str
    user_id: str
    created_at: datetime
    plan: List[SubgoalRead] = []

    class Config:
        from_attributes = True


# Log schemas
class LogBase(BaseModel):
    log_date: date
    minutes_spent: int = Field(default=0, ge=0)
    count_done: int = Field(default=0, ge=0)
    note: Optional[str] = None


class LogCreate(LogBase):
    goal_id: str
    subgoal_id: Optional[str] = None


class LogUpdate(BaseModel):
    minutes_spent: Optional[int] = Field(None, ge=0)
    count_done: Optional[int] = Field(None, ge=0)
    note: Optional[str] = None


class LogResponse(LogBase):
    id: str
    goal_id: str
    subgoal_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Report schemas
class ProgressMetrics(BaseModel):
    actual: float
    target: float
    required_by_today: float
    deficit: float
    percent: float
    status: str
    days_elapsed: int
    days_total: int
    days_remaining: int


class GoalProgressResponse(BaseModel):
    goal: GoalResponse
    metrics: ProgressMetrics


class OverallSummary(BaseModel):
    total_goals: int
    on_track: int
    at_risk: int
    behind: int
    total_percent: float


class DailyActivity(BaseModel):
    date: date
    total_hours: float
    total_count: int
    goals_active: int


class MonthReport(BaseModel):
    month: str
    days: List[DailyActivity]


class AIPlanRequest(BaseModel):
    prompt: str


class AIPlanResponse(BaseModel):
    title: str
    target_type: str
    time_unit: Optional[str] = None
    end_date: Optional[date] = None
    subgoals: List[dict]
