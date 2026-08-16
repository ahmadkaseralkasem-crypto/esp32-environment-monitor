from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest

from pydantic import ValidationError

from weather_cloud_monitor.models import WeatherReading
from weather_cloud_monitor.storage import SQLiteReadingStorage, SupabaseReadingStorage


class SQLiteReadingStorageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temporary_directory.name) / "test.db"
        self.storage = SQLiteReadingStorage(database_path)

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    @staticmethod
    def sample_reading() -> WeatherReading:
        return WeatherReading(
            timestamp=datetime(2026, 8, 17, 12, 0, tzinfo=timezone.utc),
            temperature_c=22.5,
            humidity_percent=61.0,
        )

    def test_save_and_read_back_weather(self) -> None:
        stored = self.storage.save(self.sample_reading())
        readings = self.storage.recent(10)

        self.assertEqual(stored.id, 1)
        self.assertEqual(len(readings), 1)
        self.assertEqual(readings[0].temperature_c, 22.5)
        self.assertEqual(readings[0].humidity_percent, 61.0)

    def test_humidity_above_one_hundred_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            WeatherReading(
                timestamp=datetime.now(timezone.utc),
                temperature_c=20.0,
                humidity_percent=101.0,
            )


class SupabaseReadingStorageTests(unittest.TestCase):
    def test_new_secret_key_is_not_sent_as_a_bearer_token(self) -> None:
        storage = SupabaseReadingStorage(
            "https://example.supabase.co",
            "sb_secret_example",
            "weather_readings",
        )

        headers = storage._headers()

        self.assertEqual(headers["apikey"], "sb_secret_example")
        self.assertNotIn("Authorization", headers)


if __name__ == "__main__":
    unittest.main()
