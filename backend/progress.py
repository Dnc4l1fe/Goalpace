"""
Расчёт прогресса целей: красная линия, дефицит, статус
"""
from datetime import date, datetime
from typing import List, Tuple
from models.models import Goal, Log, GoalType


def calculate_progress_metrics(goal: Goal, logs: List[Log], current_date: date = None) -> dict:
    """
    Основная функция расчёта метрик прогресса по цели
    
    Возвращает словарь с ключами:
    - actual: фактический прогресс (часы или количество)
    - target: целевое значение
    - required_by_today: норма на текущую дату (красная линия)
    - deficit: отставание/опережение (отрицательное = опережаем)
    - percent: процент выполнения
    - status: on_track | at_risk | behind
    - days_elapsed: дней прошло с начала
    - days_total: общая длительность периода
    - days_remaining: дней осталось до конца
    """
    if current_date is None:
        current_date = date.today()
    
    period_start = goal.period_start
    period_end = goal.period_end
    target = goal.target
    
    # Считаем дни
    days_total = (period_end - period_start).days + 1
    days_elapsed = max(0, (current_date - period_start).days + 1)
    days_remaining = max(0, (period_end - current_date).days)
    
    # Если ещё не началось
    if current_date < period_start:
        days_elapsed = 0
    
    # Если уже закончилось
    if current_date > period_end:
        days_elapsed = days_total
        days_remaining = 0
    
    # Фактический прогресс
    actual = calculate_actual_progress(goal, logs)
    
    # Красная линия (норма на сегодня)
    required_by_today = (target * days_elapsed) / days_total if days_total > 0 else 0
    
    # Дефицит (положительное = отстаём, отрицательное = опережаем)
    deficit = required_by_today - actual
    
    percent = (actual / target * 100) if target > 0 else 0
    
    status = determine_status(actual, required_by_today, target, days_remaining)
    
    return {
        "actual": round(actual, 2),
        "target": round(target, 2),
        "required_by_today": round(required_by_today, 2),
        "deficit": round(deficit, 2),
        "percent": round(percent, 1),
        "status": status,
        "days_elapsed": days_elapsed,
        "days_total": days_total,
        "days_remaining": days_remaining
    }


def calculate_actual_progress(goal: Goal, logs: List[Log]) -> float:
    """
    Суммирует фактический прогресс из логов
    Для time-целей возвращает часы (из минут)
    Для count-целей возвращает количество
    """
    if goal.type == GoalType.TIME:
        total_minutes = sum(log.minutes_spent for log in logs)
        return total_minutes / 60.0  # переводим в часы
    else:  # COUNT
        return float(sum(log.count_done for log in logs))


def determine_status(actual: float, required: float, target: float, days_remaining: int) -> str:
    """
    Определяет статус цели: on_track, at_risk, behind
    
    Логика:
    - on_track: опережаем норму или в пределах 15% отставания
    - at_risk: отстаём на 15-35% от нормы
    - behind: отстаём больше чем на 35%
    """
    if days_remaining == 0:
        # Период закончился
        return "on_track" if actual >= target else "behind"
    
    if actual >= required:
        return "on_track"
    
    # Считаем процент отставания от нормы
    lag_percent = ((required - actual) / required * 100) if required > 0 else 0
    
    if lag_percent <= 15:
        return "on_track"
    elif lag_percent <= 35:
        return "at_risk"
    else:
        return "behind"


def get_daily_progress_series(goal: Goal, logs: List[Log]) -> List[dict]:
    """
    Возвращает дневную серию прогресса для графиков
    
    Каждый элемент содержит:
    - date: дата
    - actual_cumulative: накопленный прогресс на эту дату
    - required: норма на эту дату
    - daily_value: значение за этот день
    """
    if not logs:
        return []
    
    # Сортируем логи по дате
    sorted_logs = sorted(logs, key=lambda x: x.log_date)
    
    result = []
    cumulative = 0.0
    
    for log in sorted_logs:
        # Дневное значение
        if goal.type == GoalType.TIME:
            daily_value = log.minutes_spent / 60.0
        else:
            daily_value = float(log.count_done)
        
        cumulative += daily_value
        
        # Норма на эту дату
        days_elapsed = (log.log_date - goal.period_start).days + 1
        days_total = (goal.period_end - goal.period_start).days + 1
        required = (goal.target * days_elapsed) / days_total
        
        result.append({
            "date": log.log_date.isoformat(),
            "actual_cumulative": round(cumulative, 2),
            "required": round(required, 2),
            "daily_value": round(daily_value, 2)
        })
    
    return result


def calculate_weekly_summary(goal: Goal, logs: List[Log], week_start: date) -> dict:
    """
    Суммирует прогресс за неделю (7 дней с week_start)
    """
    week_end = date.fromordinal(week_start.toordinal() + 6)
    
    week_logs = [
        log for log in logs
        if week_start <= log.log_date <= week_end
    ]
    
    if goal.type == GoalType.TIME:
        total = sum(log.minutes_spent for log in week_logs) / 60.0
    else:
        total = float(sum(log.count_done for log in week_logs))
    
    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "total": round(total, 2),
        "days_logged": len(week_logs)
    }
