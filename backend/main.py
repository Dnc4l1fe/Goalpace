from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
settings = get_settings()

app = FastAPI(
    title="GoalPace API",
    description="API для планирования учебных целей и трекинга прогресса",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, goals, logs, reports, ai
app.include_router(auth.router)
app.include_router(goals.router)
app.include_router(logs.router)
app.include_router(reports.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {"message": "GoalPace API работает"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
