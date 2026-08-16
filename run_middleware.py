"""Start the Weather Cloud Monitor middleware server."""

import uvicorn

from weather_cloud_monitor.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "weather_cloud_monitor.api:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )


if __name__ == "__main__":
    main()

