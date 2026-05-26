#!/usr/bin/env python3
"""
Тесты API endpoints для auth и goals
Требуют запущенного сервера на localhost:8000.
"""
import requests
from datetime import date, timedelta

BASE_URL = "http://localhost:8000"


def test_auth_demo():
    """Тест создания демо-пользователя"""
    print("Тест 1: POST /auth/demo")

    response = requests.post(
        f"{BASE_URL}/auth/demo",
        json={
            "email": "test@goalpace.com",
            "tz": "Europe/Moscow"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["email"] == "test@goalpace.com"
    print(f"  Пользователь создан: {data['id']}")

    response2 = requests.post(
        f"{BASE_URL}/auth/demo",
        json={"email": "test@goalpace.com"}
    )
    assert response2.json()["id"] == data["id"]
    print("  Повторный вызов вернул того же пользователя")

    return data["id"]


def test_create_goal(user_id):
    """Тест создания цели с подзадачами."""
    print("\nТест 2: POST /goals")

    today = date.today()
    end = today + timedelta(days=30)

    response = requests.post(
        f"{BASE_URL}/goals/?user_id={user_id}",
        json={
            "title": "Изучить FastAPI",
            "type": "time",
            "target": 20.0,
            "unit": "hours",
            "period_start": today.isoformat(),
            "period_end": end.isoformat(),
            "priority": 2,
            "notes": "Для курсовой",
            "plan": [
                {"title": "Основы маршрутизации", "target": 8.0},
                {"title": "Pydantic и валидация", "target": 6.0},
                {"title": "Зависимости и middleware", "target": 6.0}
            ]
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Изучить FastAPI"
    assert len(data["plan"]) == 3
    assert data["plan"][0]["title"] == "Основы маршрутизации"
    assert data["plan"][0]["current"] == 0
    print(f"  Цель создана: {data['title']}, подзадач: {len(data['plan'])}")

    return data["id"]


def test_create_goal_validation(user_id):
    """Тест валидации при создании цели."""
    print("\nТест 3: Валидация POST /goals")

    today = date.today()

    response = requests.post(
        f"{BASE_URL}/goals/?user_id={user_id}",
        json={
            "title": "Тест",
            "type": "time",
            "target": 10.0,
            "unit": "hours",
            "period_start": (today + timedelta(days=30)).isoformat(),
            "period_end": today.isoformat(),
            "plan": [{"title": "Подзадача", "target": 10.0}]
        }
    )
    assert response.status_code == 400
    print("  Некорректные даты — 400")

    response = requests.post(
        f"{BASE_URL}/goals/?user_id=nonexistent-id",
        json={
            "title": "Тест",
            "type": "time",
            "target": 10.0,
            "unit": "hours",
            "period_start": today.isoformat(),
            "period_end": (today + timedelta(days=30)).isoformat(),
            "plan": [{"title": "Подзадача", "target": 10.0}]
        }
    )
    assert response.status_code == 404
    print("  Несуществующий пользователь — 404")


def test_get_goals(user_id):
    """Тест получения списка целей."""
    print("\nТест 4: GET /goals")

    response = requests.get(f"{BASE_URL}/goals/?user_id={user_id}")

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert "plan" in data[0]
    print(f"  Получено целей: {len(data)}")


def test_get_goal(goal_id):
    """Тест получения одной цели."""
    print("\nТест 5: GET /goals/{id}")

    response = requests.get(f"{BASE_URL}/goals/{goal_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == goal_id
    assert len(data["plan"]) == 3
    print(f"  Цель: {data['title']}, подзадач: {len(data['plan'])}")

    response = requests.get(f"{BASE_URL}/goals/nonexistent-id")
    assert response.status_code == 404
    print("  Несуществующая цель — 404")


def test_update_goal(goal_id):
    """Тест обновления цели и подзадач."""
    print("\nТест 6: PUT /goals/{id}")

    current = requests.get(f"{BASE_URL}/goals/{goal_id}").json()
    subgoal_ids = [s["id"] for s in current["plan"]]

    response = requests.put(
        f"{BASE_URL}/goals/{goal_id}",
        json={
            "priority": 3,
            "notes": "Обновленная цель",
            "plan": [
                {"id": subgoal_ids[0], "title": "Маршрутизация (обновлено)", "target": 10.0},
                {"id": subgoal_ids[1], "title": "Pydantic и валидация", "target": 6.0},
                {"title": "Тестирование API", "target": 4.0}
            ]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["priority"] == 3
    assert data["notes"] == "Обновленная цель"
    assert len(data["plan"]) == 3
    assert data["plan"][0]["title"] == "Маршрутизация (обновлено)"
    assert data["target"] == 20.0
    print(f"  Цель обновлена, target пересчитан: {data['target']}")


def test_log_progress(goal_id):
    """Тест логирования прогресса."""
    print("\nТест 7: POST /logs")

    goal = requests.get(f"{BASE_URL}/goals/{goal_id}").json()
    subgoal_id = goal["plan"][0]["id"]

    response = requests.post(
        f"{BASE_URL}/logs/",
        json={
            "goal_id": goal_id,
            "subgoal_id": subgoal_id,
            "log_date": date.today().isoformat(),
            "minutes_spent": 120,
            "count_done": 0,
            "note": "Изучал основы"
        }
    )

    assert response.status_code == 201
    print("  Лог создан: 120 минут")

    goal_updated = requests.get(f"{BASE_URL}/goals/{goal_id}").json()
    assert goal_updated["plan"][0]["current"] == 2.0
    print(f"  Прогресс подзадачи: {goal_updated['plan'][0]['current']} ч")


def test_delete_goal(goal_id):
    """Тест удаления цели."""
    print("\nТест 8: DELETE /goals/{id}")

    response = requests.delete(f"{BASE_URL}/goals/{goal_id}")
    assert response.status_code == 204
    print("  Цель удалена")

    response = requests.get(f"{BASE_URL}/goals/{goal_id}")
    assert response.status_code == 404
    print("  Подтверждение: цель не найдена — 404")


def run_all_tests():
    print("=" * 50)
    print("Тестирование API endpoints")
    print("=" * 50)

    try:
        user_id = test_auth_demo()
        goal_id = test_create_goal(user_id)
        test_create_goal_validation(user_id)
        test_get_goals(user_id)
        test_get_goal(goal_id)
        test_update_goal(goal_id)
        test_log_progress(goal_id)
        test_delete_goal(goal_id)

        print("\n" + "=" * 50)
        print("Все тесты API пройдены успешно")
        print("=" * 50)

    except AssertionError as e:
        print(f"\nТест провален: {e}")
    except requests.exceptions.ConnectionError:
        print("\nНе удалось подключиться к серверу.")
        print("Запустите: cd backend && uvicorn main:app --reload")
    except Exception as e:
        print(f"\nОшибка: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()
