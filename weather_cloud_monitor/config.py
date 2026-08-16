"""Application configuration loaded from environment variables or a local .env file."""

from dataclasses import dataclass
import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def load_env_file(path: Path | None = None) -> None:
    """Load simple KEY=VALUE settings without overwriting existing environment variables."""
    env_path = path or PROJECT_ROOT / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


@dataclass(frozen=True)
class Settings:
    storage_backend: str
    sqlite_path: Path
    supabase_url: str
    supabase_secret_key: str
    supabase_table: str
    middleware_url: str
    middleware_api_key: str
    weather_latitude: float
    weather_longitude: float
    fetch_interval_seconds: int
    host: str
    port: int


def get_settings() -> Settings:
    """Return a validated snapshot of the current application settings."""
    load_env_file()

    storage_backend = os.getenv("STORAGE_BACKEND", "sqlite").strip().lower()
    if storage_backend not in {"sqlite", "supabase"}:
        raise ValueError("STORAGE_BACKEND must be either 'sqlite' or 'supabase'")

    sqlite_path = Path(os.getenv("SQLITE_PATH", "data/weather_readings.db"))
    if not sqlite_path.is_absolute():
        sqlite_path = PROJECT_ROOT / sqlite_path

    interval = int(os.getenv("FETCH_INTERVAL_SECONDS", "900"))
    if interval < 60:
        raise ValueError("FETCH_INTERVAL_SECONDS must be at least 60")

    return Settings(
        storage_backend=storage_backend,
        sqlite_path=sqlite_path,
        supabase_url=os.getenv("SUPABASE_URL", "").strip().rstrip("/"),
        supabase_secret_key=os.getenv("SUPABASE_SECRET_KEY", "").strip(),
        supabase_table=os.getenv("SUPABASE_TABLE", "weather_readings").strip(),
        middleware_url=os.getenv("MIDDLEWARE_URL", "http://127.0.0.1:8000").strip().rstrip("/"),
        middleware_api_key=os.getenv("MIDDLEWARE_API_KEY", "").strip(),
        weather_latitude=float(os.getenv("WEATHER_LATITUDE", "52.5200")),
        weather_longitude=float(os.getenv("WEATHER_LONGITUDE", "13.4050")),
        fetch_interval_seconds=interval,
        host=os.getenv("HOST", "127.0.0.1").strip(),
        port=int(os.getenv("PORT", "8000")),
    )
