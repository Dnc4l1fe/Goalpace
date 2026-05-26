#!/usr/bin/env python3
"""
Тесты моделей БД: User, Goal, Subgoal, Log.
"""
from datetime import date, datetime
from database import SessionLocal
from models import User, Goal, Subgoal, Log, GoalType, GoalUnit


def test_models():
    db = SessionLocal()

    try:
        # Создание пользователя
        user = User(email="test_models@example.com", tz="Europe/Moscow")
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Пользователь создан: {user.id}")
        assert user.id is not None
        assert user.email == "test_models@example.com"

        # Создание цели
        goal = Goal(
            user_id=user.id,
            title="Изучить Python",
            type=GoalType.TIME,
            target=40.0,
            unit=GoalUnit.HOURS,
            period_start=date(2026, 4, 1),
            period_end=date(2026, 4, 30),
            priority=2,
            notes="Курсовая работа"
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
        print(f"Цель создана: {goal.title} (ID: {goal.id})")
        assert goal.id is not None

        # Создание подзадач с позициями
        sub1 = Subgoal(goal_id=goal.id, title="Синтаксис", target=15.0, position=0)
        sub2 = Subgoal(goal_id=goal.id, title="ООП", target=15.0, position=1)
        sub3 = Subgoal(goal_id=goal.id, title="Асинхронность", target=10.0, position=2)
        db.add_all([sub1, sub2, sub3])
        db.commit()
        db.refresh(sub1)
        print(f"Подзадачи созданы: {len(goal.subgoals)} шт.")
        assert len(goal.subgoals) == 3

        # Проверка порядка подзадач
        titles = [s.title for s in goal.subgoals]
        assert titles == ["Синтаксис", "ООП", "Асинхронность"]
        print(f"Порядок подзадач корректный: {titles}")

        # Создание лога с привязкой к подзадаче
        log = Log(
            goal_id=goal.id,
            subgoal_id=sub1.id,
            log_date=date(2026, 4, 10),
            minutes_spent=120,
            count_done=0,
            note="Работал над синтаксисом"
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        print(f"Лог создан: {log.log_date}, {log.minutes_spent} минут")
        assert log.subgoal_id == sub1.id

        # Проверка relationships
        assert len(user.goals) >= 1
        assert len(goal.logs) == 1
        assert len(sub1.logs) == 1
        assert goal.logs[0].subgoal.title == "Синтаксис"
        print(f"Связи: у пользователя {len(user.goals)} целей, у цели {len(goal.logs)} логов")

        # Каскадное удаление: удаляем цель -> подзадачи и логи тоже удалятся
        goal_id = goal.id
        db.delete(goal)
        db.commit()

        remaining_subs = db.query(Subgoal).filter(Subgoal.goal_id == goal_id).all()
        remaining_logs = db.query(Log).filter(Log.goal_id == goal_id).all()
        assert len(remaining_subs) == 0
        assert len(remaining_logs) == 0
        print("Каскадное удаление: подзадачи и логи удалены вместе с целью")

        # Удаляем тестового пользователя
        db.delete(user)
        db.commit()

        print("\nВсе тесты моделей пройдены успешно")

    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_models()
