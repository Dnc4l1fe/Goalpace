from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./goalpace.db"
    timezone: str = "Europe/Moscow"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3:latest"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
