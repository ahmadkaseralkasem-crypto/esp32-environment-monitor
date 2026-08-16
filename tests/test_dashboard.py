from pathlib import Path
from types import SimpleNamespace
import unittest

from weather_cloud_monitor.api import STATIC_DIR, dashboard, list_readings


class DashboardTests(unittest.TestCase):
    def test_dashboard_assets_exist(self) -> None:
        expected_files = ("index.html", "styles.css", "app.js")

        for filename in expected_files:
            with self.subTest(filename=filename):
                self.assertTrue((STATIC_DIR / filename).is_file())

    def test_root_returns_dashboard_html(self) -> None:
        response = dashboard()

        self.assertEqual(Path(response.path), STATIC_DIR / "index.html")
        self.assertEqual(response.media_type, "text/html")

    def test_readings_endpoint_does_not_expose_or_require_write_key(self) -> None:
        class EmptyStorage:
            @staticmethod
            def recent(limit: int) -> list[object]:
                self.assertEqual(limit, 10)
                return []

        request = SimpleNamespace(
            app=SimpleNamespace(state=SimpleNamespace(storage=EmptyStorage()))
        )

        self.assertEqual(list_readings(request, limit=10), [])


if __name__ == "__main__":
    unittest.main()
