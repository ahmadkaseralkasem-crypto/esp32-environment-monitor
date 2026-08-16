"""FastAPI middleware that validates readings and sends them to storage."""

from contextlib import asynccontextmanager
import secrets
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query, Request, status

from .config import get_settings
from .models import StoredWeatherReading, WeatherReading
from .storage import ReadingStorage, StorageError, create_storage


@asynccontextmanager
async def lifespan(application: FastAPI):
    settings = get_settings()
    application.state.settings = settings
    application.state.storage = create_storage(settings)
    yield


app = FastAPI(
    title="Weather Cloud Monitor API",
    version="0.1.0",
    description="Middleware between the weather collector and local or Supabase storage.",
    lifespan=lifespan,
)


def get_storage(request: Request) -> ReadingStorage:
    return request.app.state.storage


def verify_api_key(request: Request) -> None:
    expected_key = request.app.state.settings.middleware_api_key
    if not expected_key:
        return

    supplied_key = request.headers.get("X-API-Key", "")
    if not secrets.compare_digest(supplied_key, expected_key):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


@app.get("/")
def application_info() -> dict[str, str]:
    return {
        "application": "weather-cloud-monitor",
        "documentation": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health(request: Request) -> dict[str, str]:
    return {
        "status": "ok",
        "storage_backend": request.app.state.settings.storage_backend,
    }


@app.post(
    "/api/readings",
    response_model=StoredWeatherReading,
    status_code=status.HTTP_201_CREATED,
)
def create_reading(reading: WeatherReading, request: Request) -> StoredWeatherReading:
    verify_api_key(request)
    try:
        return get_storage(request).save(reading)
    except StorageError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.get("/api/readings", response_model=list[StoredWeatherReading])
def list_readings(
    request: Request,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
) -> list[StoredWeatherReading]:
    verify_api_key(request)
    try:
        return get_storage(request).recent(limit)
    except StorageError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
