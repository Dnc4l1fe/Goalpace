"""
Роутер для работы с логами прогресса
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import date

from database import get_db
from models import Log, Goal, Subgoal
from schemas import LogCreate, LogUpdate, LogResponse

router = APIRouter(prefix="/logs", tags=["logs"])


@router.post("/", response_model=LogResponse, status_code=201)
def create_or_update_log(log_data: LogCreate, db: Session = Depends(get_db)):
    """Создает лог или обновляет существующий (upsert по goal_id + subgoal_id + date)."""
    goal = db.query(Goal).filter(Goal.id == log_data.goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    
    if log_data.subgoal_id:
        subgoal = db.query(Subgoal).filter(Subgoal.id == log_data.subgoal_id).first()
        if not subgoal or subgoal.goal_id != log_data.goal_id:
            raise HTTPException(status_code=404, detail="Подзадача не найдена")
    
    filters = [
        Log.goal_id == log_data.goal_id,
        Log.log_date == log_data.log_date
    ]
    if log_data.subgoal_id:
        filters.append(Log.subgoal_id == log_data.subgoal_id)
    else:
        filters.append(Log.subgoal_id.is_(None))
    
    existing_log = db.query(Log).filter(and_(*filters)).first()
    
    if existing_log:
        existing_log.minutes_spent += log_data.minutes_spent
        existing_log.count_done += log_data.count_done
        if log_data.note:
            if existing_log.note:
                existing_log.note += f" | {log_data.note}"
            else:
                existing_log.note = log_data.note
        db.commit()
        db.refresh(existing_log)
        return existing_log
    else:
        new_log = Log(
            goal_id=log_data.goal_id,
            subgoal_id=log_data.subgoal_id,
            log_date=log_data.log_date,
            minutes_spent=log_data.minutes_spent,
            count_done=log_data.count_done,
            note=log_data.note
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        return new_log


@router.get("/", response_model=List[LogResponse])
def get_logs(
    goal_id: str = Query(None, description="Фильтр по цели"),
    date_from: date = Query(None, description="Начальная дата"),
    date_to: date = Query(None, description="Конечная дата"),
    db: Session = Depends(get_db)
):
    """Возвращает список логов с фильтрацией по цели и периоду."""
    query = db.query(Log)
    
    if goal_id:
        query = query.filter(Log.goal_id == goal_id)
    
    if date_from:
        query = query.filter(Log.log_date >= date_from)
    
    if date_to:
        query = query.filter(Log.log_date <= date_to)
    
    logs = query.order_by(Log.log_date.desc()).all()
    return logs


@router.get("/{log_id}", response_model=LogResponse)
def get_log(log_id: str, db: Session = Depends(get_db)):
    """Возвращает один лог по ID."""
    log = db.query(Log).filter(Log.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Лог не найден")
    
    return log


@router.put("/{log_id}", response_model=LogResponse)
def update_log(log_id: str, log_data: LogUpdate, db: Session = Depends(get_db)):
    """Обновляет лог (частичное обновление)."""
    log = db.query(Log).filter(Log.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Лог не найден")
    
    update_data = log_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(log, field, value)
    
    db.commit()
    db.refresh(log)
    
    return log


@router.delete("/{log_id}", status_code=204)
def delete_log(log_id: str, db: Session = Depends(get_db)):
    """Удаляет лог."""
    log = db.query(Log).filter(Log.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Лог не найден")
    
    db.delete(log)
    db.commit()
    
    return None
