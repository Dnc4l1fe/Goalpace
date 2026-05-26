import sys
import os
import random
from datetime import date, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models import User, Goal, Log, GoalType, GoalUnit

def seed_data():
    db = SessionLocal()
    
    print("Seeding data...")
    
    email = "demo@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, tz="Europe/Moscow")
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user: {user.email}")
    else:
        print(f"User exists: {user.email}")
        
    # 2. Создаем цели
    goals_data = [
        {
            "title": "Подготовка к курсовой (Backend)",
            "type": GoalType.TIME,
            "target": 40.0,
            "unit": GoalUnit.HOURS,
            "period_start": date.today() - timedelta(days=10),
            "period_end": date.today() + timedelta(days=20),
            "priority": 3
        },
        {
            "title": "Чтение документации Next.js",
            "type": GoalType.COUNT,
            "target": 15.0, 
            "unit": GoalUnit.COUNT, # условно главы
            "period_start": date.today() - timedelta(days=5),
            "period_end": date.today() + timedelta(days=9),
            "priority": 2
        },
        {
            "title": "Английский язык",
            "type": GoalType.TIME,
            "target": 20.0,
            "unit": GoalUnit.HOURS,
            "period_start": date.today() - timedelta(days=14),
            "period_end": date.today() + timedelta(days=14),
            "priority": 1
        }
    ]
    
    created_goals = []
    for g_data in goals_data:
        existing = db.query(Goal).filter(
            Goal.user_id == user.id, 
            Goal.title == g_data["title"]
        ).first()
        
        if not existing:
            goal = Goal(
                user_id=user.id,
                **g_data
            )
            db.add(goal)
            db.commit()
            db.refresh(goal)
            created_goals.append(goal)
            print(f"Created goal: {goal.title}")
        else:
            created_goals.append(existing)
            print(f"Goal exists: {existing.title}")
            
    # 3. Создаем логи (имитация прогресса)
    # Для каждой цели генерируем логи за прошедшие дни
    
    for goal in created_goals:
        # Удаляем старые логи этой цели, чтобы не дублировать при повторном запуске
        db.query(Log).filter(Log.goal_id == goal.id).delete()
        
        days_elapsed = (date.today() - goal.period_start).days
        if days_elapsed < 0: continue
        
        current_log_date = goal.period_start
        
        for _ in range(days_elapsed + 1):
            if current_log_date > date.today():
                break
                
            if random.random() > 0.3:
                if goal.type == GoalType.TIME:
                    minutes = random.randint(30, 180)
                    log = Log(
                        goal_id=goal.id,
                        log_date=current_log_date,
                        minutes_spent=minutes,
                        count_done=0
                    )
                else:
                    count = random.randint(1, 3)
                    log = Log(
                        goal_id=goal.id,
                        log_date=current_log_date,
                        minutes_spent=0,
                        count_done=count
                    )
                
                db.add(log)
        
            current_log_date += timedelta(days=1)
        
    db.commit()
    print("Seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_data()
