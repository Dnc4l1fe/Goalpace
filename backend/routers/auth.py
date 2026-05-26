"""
Роутер для демо-авторизации
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_user(
    user_id: str = Query(..., description="ID пользователя для авторизации"),
    db: Session = Depends(get_db)
) -> User:
    """Зависимость для получения текущего пользователя по ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден или не авторизован")
    return user


@router.post("/demo", response_model=UserResponse)
def get_or_create_demo_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Создает или возвращает демо-пользователя по email."""
    if user_data.email:
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            return existing_user
    
    new_user = User(
        email=user_data.email,
        tz=user_data.tz
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user
