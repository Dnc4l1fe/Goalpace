from fastapi import APIRouter, HTTPException, Depends
from schemas import AIPlanRequest, AIPlanResponse
from config import get_settings
import httpx
import json
import re
import datetime

router = APIRouter(prefix="/ai", tags=["ai"])
settings = get_settings()

SYSTEM_PROMPT = """Ты - персональный архитектор целей. Проанализируй запрос пользователя и составь структурированный план.

ПРАВИЛА ВЫБОРА target_type:
- "time" — если цель измеряется временем (изучение, практика, тренировки).
- "quantitative" — если цель измеряется количеством (прочитать книги, решить задачи, написать статьи, пробежать км). target_total подзадач = ШТУКИ.

ПРАВИЛА time_unit (ТОЛЬКО если target_type = "time"):
- "hours" — если подзадачи крупные (от 1 часа и выше). target_total = количество ЧАСОВ.
- "minutes" — если подзадачи мелкие (менее 1 часа). target_total = количество МИНУТ.
- Выбирай ту единицу, при которой числа выглядят удобнее. Например: 2 часа → hours + 2, а не minutes + 120. 30 минут → minutes + 30, а не hours + 0.5.
- Если target_type = "quantitative", поле time_unit НЕ УКАЗЫВАЙ.

ПРАВИЛА ДЕДЛАЙНА:
- ВСЕГДА рассчитывай реалистичный end_date от сегодняшней даты.
- Если пользователь указал срок — используй его.
- Если НЕ указал — рассчитай сам исходя из объёма работы (обычно 1-3 месяца).
- end_date НЕ МОЖЕТ быть null. Формат: YYYY-MM-DD.

СТРОГО ВОЗВРАЩАЙ ТОЛЬКО CLEAN JSON БЕЗ ТЕКСТА И MARKDOWN.

{
  "title": "Название цели",
  "target_type": "time" или "quantitative",
  "time_unit": "hours" или "minutes" (ТОЛЬКО если target_type = "time"),
  "end_date": "YYYY-MM-DD",
  "subgoals": [
    {
      "title": "Название подзадачи",
      "target_type": "time" или "quantitative" (СОВПАДАЕТ с главным target_type),
      "target_total": <ЦЕЛОЕ ЧИСЛО>
    }
  ]
}

Сегодняшняя дата: {current_date}.
"""

@router.post("/generate-plan", response_model=AIPlanResponse)
async def generate_plan(request: AIPlanRequest):
    current_date = datetime.date.today().isoformat()
    system_prompt = SYSTEM_PROMPT.replace("{current_date}", current_date)
    
    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Оригинальный запрос пользователя: {request.prompt}"}
        ],
        "format": "json",
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0.3
        }
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(f"{settings.ollama_url}/api/chat", json=payload)
            response.raise_for_status()
            
            data = response.json()
            ai_content = data.get("message", {}).get("content", "")
            ai_content = re.sub(r"<think>.*?</think>", "", ai_content, flags=re.DOTALL).strip()

            try:
                parsed_json = json.loads(ai_content)
                return parsed_json
            except json.JSONDecodeError:
                if "```json" in ai_content:
                    ai_content = ai_content.split("```json")[1].split("```")[0].strip()
                    parsed_json = json.loads(ai_content)
                    return parsed_json
                raise ValueError("Invalid format")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
