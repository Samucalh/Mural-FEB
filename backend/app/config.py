
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    frontend_origins: str = "http://127.0.0.1:5500"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def origins(self) -> list[str]:
        return [
            item.strip()
            for item in self.frontend_origins.split(",")
            if item.strip()
        ]

settings = Settings()
