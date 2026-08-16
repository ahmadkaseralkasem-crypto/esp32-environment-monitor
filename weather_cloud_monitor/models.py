"""Validated data models shared by the collector, middleware, and storage layers."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WeatherReading(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    timestamp: datetime
    temperature_c: float = Field(ge=-100.0, le=100.0)
    humidity_percent: float = Field(ge=0.0, le=100.0)
    source: str = Field(default="open-meteo", min_length=1, max_length=50)

    @field_validator("timestamp")
    @classmethod
    def timestamp_must_include_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must include a timezone")
        return value


class StoredWeatherReading(WeatherReading):
    id: int | str
    received_at: datetime

