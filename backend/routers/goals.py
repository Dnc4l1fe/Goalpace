"""
Роутер для работы с целями (CRUD)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import date

from database import get_db
from models import Goal, User, Subgoal, Log, GoalType
from schemas import GoalCreate, GoalUpdate, GoalResponse, SubgoalRead

router = APIRouter(prefix="/goals", tags=["goals"])


def _calc_subgoal_current(subgoal: Subgoal, goal_type: GoalType, db: Session) -> float:
    """Считает текущий прогресс подзадачи из связанных логов."""
    logs = db.query(Log).filter(Log.subgoal_id == subgoal.id).all()
    if goal_type == GoalType.TIME:
        return sum(log.minutes_spent for log in logs) / 60.0
    return float(sum(log.count_done for log in logs))


def _goal_to_response(goal: Goal, db: Session) -> dict:
    """Преобразует ORM-объект цели в словарь с подзадачами и их прогрессом."""
    plan = []
    for sub in goal.subgoals:
        current = _calc_subgoal_current(sub, goal.type, db)
        plan.append(SubgoalRead(
            id=sub.id,
            title=sub.title,
            target=sub.target,
            current=round(current, 2)
        ))
    
    return {
        "id": goal.id,
        "user_id": goal.user_id,
        "title": goal.title,
        "type": goal.type,
        "target": goal.target,
        "unit": goal.unit,
        "period_start": goal.period_start,
        "period_end": goal.period_end,
        "priority": goal.priority,
        "notes": goal.notes,
        "created_at": goal.created_at,
        "plan": plan
    }


@router.post("/", response_model=GoalResponse, status_code=201)
def create_goal(goal_data: GoalCreate, user_id: str = Query(...), db: Session = Depends(get_db)):
    """Создает цель вместе со списком подзадач в одной транзакции."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if goal_data.period_start > goal_data.period_end:
        raise HTTPException(status_code=400, detail="Дата начала должна быть раньше даты окончания")
    
    new_goal = Goal(
        user_id=user_id,
        title=goal_data.title,
        type=goal_data.type,
        target=goal_data.target,
        unit=goal_data.unit,
        period_start=goal_data.period_start,
        period_end=goal_data.period_end,
        priority=goal_data.priority,
        notes=goal_data.notes
    )
    db.add(new_goal)
    db.flush()
    
    for idx, sub in enumerate(goal_data.plan):
        subgoal = Subgoal(
            goal_id=new_goal.id,
            title=sub.title,
            target=sub.target,
            position=idx
        )
        db.add(subgoal)
    
    db.commit()
    db.refresh(new_goal)
    
    return _goal_to_response(new_goal, db)


@router.get("/", response_model=List[GoalResponse])
def get_goals(
    user_id: str = Query(...),
    active_only: bool = Query(False, description="Показать только активные цели"),
    db: Session = Depends(get_db)
):
    """Возвращает список целей пользователя с подзадачами."""
    query = db.query(Goal).options(joinedload(Goal.subgoals)).filter(Goal.user_id == user_id)
    
    if active_only:
        today = date.today()
        query = query.filter(Goal.period_end >= today)
    
    goals = query.order_by(Goal.priority.desc(), Goal.created_at.desc()).all()
    return [_goal_to_response(g, db) for g in goals]


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(goal_id: str, db: Session = Depends(get_db)):
    """Возвращает одну цель по ID с подзадачами."""
    goal = db.query(Goal).options(joinedload(Goal.subgoals)).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    
    return _goal_to_response(goal, db)


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: str, goal_data: GoalUpdate, db: Session = Depends(get_db)
):
    """Обновляет поля цели (частичное обновление)."""
    goal = db.query(Goal).options(joinedload(Goal.subgoals)).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    
    update_data = goal_data.model_dump(exclude_unset=True)
    plan_data = update_data.pop("plan", None)
    
    if "period_start" in update_data or "period_end" in update_data:
        start = update_data.get("period_start", goal.period_start)
        end = update_data.get("period_end", goal.period_end)
        if start > end:
            raise HTTPException(status_code=400, detail="Дата начала должна быть раньше даты окончания")

    if plan_data is not None:
        if len(plan_data) == 0:
            raise HTTPException(status_code=400, detail="Должна быть хотя бы одна подзадача")

        existing_subgoals = {sub.id: sub for sub in goal.subgoals}
        incoming_ids = set()
        total_target = 0.0

        for idx, sub_data in enumerate(plan_data):
            sub_id = sub_data.get("id")
            title = sub_data["title"].strip()
            target = sub_data["target"]

            if sub_id:
                subgoal = existing_subgoals.get(sub_id)
                if not subgoal:
                    raise HTTPException(status_code=404, detail="Подзадача не найдена")
                subgoal.title = title
                subgoal.target = target
                subgoal.position = idx
                incoming_ids.add(sub_id)
            else:
                new_subgoal = Subgoal(
                    goal_id=goal.id,
                    title=title,
                    target=target,
                    position=idx
                )
                db.add(new_subgoal)

            total_target += target

        for existing_sub in list(goal.subgoals):
            if existing_sub.id not in incoming_ids:
                db.delete(existing_sub)

        goal.target = round(total_target, 2)
    
    for field, value in update_data.items():
        setattr(goal, field, value)
    
    db.commit()
    db.refresh(goal)
    
    return _goal_to_response(goal, db)


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: str, db: Session = Depends(get_db)):
    """Удаляет цель и все связанные подзадачи и логи."""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    
    db.delete(goal)
    db.commit()
    
    return None
