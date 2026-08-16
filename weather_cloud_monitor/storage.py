"""Local SQLite and Supabase storage implementations."""

from contextlib import contextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sqlite3
from typing import Iterator, Protocol
import urllib.error
import urllib.parse
import urllib.request

from .config import Settings
from .models import StoredWeatherReading, WeatherReading


class StorageError(RuntimeError):
    """Raised when a reading cannot be stored or retrieved."""


class ReadingStorage(Protocol):
    def save(self, reading: WeatherReading) -> StoredWeatherReading: ...

    def recent(self, limit: int) -> list[StoredWeatherReading]: ...


class SQLiteReadingStorage:
    """Store readings locally so the complete pipeline can run before cloud setup."""

    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize_database()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _initialize_database(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS weather_readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    observed_at TEXT NOT NULL,
                    temperature_c REAL NOT NULL,
                    humidity_percent REAL NOT NULL,
                    source TEXT NOT NULL,
                    received_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_weather_observed_at "
                "ON weather_readings(observed_at DESC)"
            )

    @staticmethod
    def _row_to_model(row: sqlite3.Row) -> StoredWeatherReading:
        return StoredWeatherReading(
            id=row["id"],
            timestamp=datetime.fromisoformat(row["observed_at"]),
            temperature_c=row["temperature_c"],
            humidity_percent=row["humidity_percent"],
            source=row["source"],
            received_at=datetime.fromisoformat(row["received_at"]),
        )

    def save(self, reading: WeatherReading) -> StoredWeatherReading:
        received_at = datetime.now(timezone.utc)
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO weather_readings (
                    observed_at, temperature_c, humidity_percent, source, received_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    reading.timestamp.isoformat(),
                    reading.temperature_c,
                    reading.humidity_percent,
                    reading.source,
                    received_at.isoformat(),
                ),
            )
            reading_id = cursor.lastrowid

        return StoredWeatherReading(
            id=reading_id or 0,
            **reading.model_dump(),
            received_at=received_at,
        )

    def recent(self, limit: int) -> list[StoredWeatherReading]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT id, observed_at, temperature_c, humidity_percent, source, received_at
                FROM weather_readings
                ORDER BY observed_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        return [self._row_to_model(row) for row in rows]


class SupabaseReadingStorage:
    """Store readings through Supabase's generated REST Data API."""

    def __init__(self, project_url: str, secret_key: str, table: str) -> None:
        if not project_url or not secret_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SECRET_KEY are required")
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", table) is None:
            raise ValueError("SUPABASE_TABLE contains unsupported characters")

        self.endpoint = f"{project_url.rstrip('/')}/rest/v1/{table}"
        self.secret_key = secret_key

    def _headers(self, *, return_rows: bool = False) -> dict[str, str]:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "weather-cloud-monitor-middleware/0.1",
            "apikey": self.secret_key,
        }

        # Legacy service_role keys are JWTs and also use Authorization.
        # New sb_secret_ keys must be sent only through the apikey header.
        if not self.secret_key.startswith("sb_secret_"):
            headers["Authorization"] = f"Bearer {self.secret_key}"
        if return_rows:
            headers["Prefer"] = "return=representation"
        return headers

    def _request(self, request: urllib.request.Request) -> object:
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                response_body = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:500]
            raise StorageError(f"Supabase returned HTTP {error.code}: {detail}") from error
        except urllib.error.URLError as error:
            raise StorageError(f"Could not connect to Supabase: {error.reason}") from error

        if not response_body:
            return []
        return json.loads(response_body)

    @staticmethod
    def _record_to_model(record: dict[str, object]) -> StoredWeatherReading:
        return StoredWeatherReading(
            id=record["id"],
            timestamp=record["observed_at"],
            temperature_c=record["temperature_c"],
            humidity_percent=record["humidity_percent"],
            source=record["source"],
            received_at=record["created_at"],
        )

    def save(self, reading: WeatherReading) -> StoredWeatherReading:
        payload = {
            "observed_at": reading.timestamp.isoformat(),
            "temperature_c": reading.temperature_c,
            "humidity_percent": reading.humidity_percent,
            "source": reading.source,
        }
        request = urllib.request.Request(
            self.endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers=self._headers(return_rows=True),
            method="POST",
        )
        records = self._request(request)
        if not isinstance(records, list) or not records:
            raise StorageError("Supabase did not return the inserted reading")
        return self._record_to_model(records[0])

    def recent(self, limit: int) -> list[StoredWeatherReading]:
        query = urllib.parse.urlencode(
            {
                "select": "id,observed_at,temperature_c,humidity_percent,source,created_at",
                "order": "observed_at.desc",
                "limit": limit,
            }
        )
        request = urllib.request.Request(
            f"{self.endpoint}?{query}",
            headers=self._headers(),
            method="GET",
        )
        records = self._request(request)
        if not isinstance(records, list):
            raise StorageError("Supabase returned an unexpected response")
        return [self._record_to_model(record) for record in records]


def create_storage(settings: Settings) -> ReadingStorage:
    if settings.storage_backend == "sqlite":
        return SQLiteReadingStorage(settings.sqlite_path)
    return SupabaseReadingStorage(
        settings.supabase_url,
        settings.supabase_secret_key,
        settings.supabase_table,
    )
