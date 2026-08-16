"""Collect current internet weather and submit it to the middleware API."""

import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request

from .config import get_settings
from .models import StoredWeatherReading, WeatherReading


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def fetch_weather(latitude: float, longitude: float) -> WeatherReading:
    query = urllib.parse.urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m",
            "timezone": "UTC",
        }
    )
    request = urllib.request.Request(
        f"{OPEN_METEO_URL}?{query}",
        headers={"User-Agent": "weather-cloud-monitor-collector/0.1"},
    )

    with urllib.request.urlopen(request, timeout=15) as response:
        payload = json.load(response)

    current = payload["current"]
    timestamp = str(current["time"])
    if timestamp.endswith("Z"):
        timestamp = timestamp[:-1] + "+00:00"
    elif "+" not in timestamp[10:] and "-" not in timestamp[10:]:
        timestamp += "+00:00"

    return WeatherReading(
        timestamp=timestamp,
        temperature_c=current["temperature_2m"],
        humidity_percent=current["relative_humidity_2m"],
        source="open-meteo",
    )


def submit_reading(
    reading: WeatherReading,
    middleware_url: str,
    api_key: str = "",
) -> StoredWeatherReading:
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "weather-cloud-monitor-collector/0.1",
    }
    if api_key:
        headers["X-API-Key"] = api_key

    request = urllib.request.Request(
        f"{middleware_url.rstrip('/')}/api/readings",
        data=reading.model_dump_json().encode("utf-8"),
        headers=headers,
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=15) as response:
        return StoredWeatherReading.model_validate_json(response.read())


def print_reading(reading: WeatherReading, destination: str) -> None:
    print(
        f"{reading.timestamp.isoformat()} | "
        f"{reading.temperature_c:.1f} C | "
        f"{reading.humidity_percent:.1f} % humidity | {destination}"
    )


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(
        description="Fetch current weather and send it to the middleware."
    )
    parser.add_argument("--latitude", type=float, default=settings.weather_latitude)
    parser.add_argument("--longitude", type=float, default=settings.weather_longitude)
    parser.add_argument("--middleware-url", default=settings.middleware_url)
    parser.add_argument("--api-key", default=settings.middleware_api_key)
    parser.add_argument("--interval", type=int, default=settings.fetch_interval_seconds)
    parser.add_argument("--watch", action="store_true")
    parser.add_argument(
        "--print-only",
        action="store_true",
        help="Fetch and print the reading without sending it to middleware.",
    )
    arguments = parser.parse_args()

    if arguments.interval < 60:
        parser.error("--interval must be at least 60 seconds")

    try:
        while True:
            reading = fetch_weather(arguments.latitude, arguments.longitude)
            if arguments.print_only:
                print_reading(reading, "not stored")
            else:
                stored = submit_reading(reading, arguments.middleware_url, arguments.api_key)
                print_reading(stored, f"stored as reading {stored.id}")

            if not arguments.watch:
                break
            time.sleep(arguments.interval)
    except KeyboardInterrupt:
        print("\nCollector stopped.")
    except (KeyError, ValueError, urllib.error.URLError) as error:
        raise SystemExit(f"Collector failed: {error}") from error


if __name__ == "__main__":
    main()
