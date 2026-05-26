"""
Роутер для отчётов и статистики
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from database import get_db
from models import User, Goal, Log
from schemas import (
    GoalProgressResponse, OverallSummary, MonthReport, DailyActivity
)
from routers.auth import get_current_user
from progress import calculate_progress_metrics

router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)


@router.get("/goal/{goal_id}", response_model=GoalProgressResponse)
def get_goal_progress(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Возвращает метрики прогресса по конкретной цели."""
    goal = db.query(Goal).filter(
        Goal.id == goal_id, Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    logs = db.query(Log).filter(Log.goal_id == goal_id).all()
    metrics = calculate_progress_metrics(goal, logs)
    
    return {
        "goal": goal,
        "metrics": metrics
    }

@router.get("/summary", response_model=OverallSummary)
def get_overall_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Возвращает общую статистику по всем целям пользователя."""
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    
    if not goals:
        return {
            "total_goals": 0,
            "on_track": 0,
            "at_risk": 0,
            "behind": 0,
            "total_percent": 0.0
        }
        
    statuses = {"on_track": 0, "at_risk": 0, "behind": 0}
    total_percent = 0.0
    
    for goal in goals:
        logs = db.query(Log).filter(Log.goal_id == goal.id).all()
        metrics = calculate_progress_metrics(goal, logs)
        if metrics["status"] in statuses:
            statuses[metrics["status"]] += 1
        total_percent += metrics["percent"]
        
    return {
        "total_goals": len(goals),
        "on_track": statuses["on_track"],
        "at_risk": statuses["at_risk"],
        "behind": statuses["behind"],
        "total_percent": round(total_percent / len(goals), 1)
    }

@router.get("/month/{year}/{month}", response_model=MonthReport)
def get_month_report(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Возвращает подневную активность за указанный месяц."""
    try:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")
        
    logs = db.query(Log).join(Goal).filter(
        Goal.user_id == current_user.id,
        Log.log_date >= start_date,
        Log.log_date < end_date
    ).all()
    
    daily_stats = {}
    
    for log in logs:
        d = log.log_date
        if d not in daily_stats:
            daily_stats[d] = {"hours": 0.0, "count": 0, "goals": set()}
            
        daily_stats[d]["hours"] += log.minutes_spent / 60.0
        daily_stats[d]["count"] += log.count_done
        daily_stats[d]["goals"].add(log.goal_id)
        
    result_days = []
    for d in sorted(daily_stats.keys()):
        stats = daily_stats[d]
        result_days.append({
            "date": d,
            "total_hours": round(stats["hours"], 2),
            "total_count": stats["count"],
            "goals_active": len(stats["goals"])
        })
        
    return {
        "month": f"{year}-{month:02d}",
        "days": result_days
    }
