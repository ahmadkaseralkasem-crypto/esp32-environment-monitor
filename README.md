# Weather Cloud Monitor

A Python application that collects current temperature and humidity from
[Open-Meteo](https://open-meteo.com/en/docs), sends the reading through a
FastAPI middleware service, and stores it in local SQLite or Supabase.

```text
Open-Meteo -> collector -> FastAPI middleware -> SQLite or Supabase -> dashboard later
```

The application runs on a computer or a cloud server; no special hardware is required.

## Project files

```text
weather-cloud-monitor/
|-- weather_cloud_monitor/
|   |-- api.py          Middleware HTTP endpoints
|   |-- collector.py    Downloads and submits weather readings
|   |-- config.py       Environment configuration
|   |-- models.py       Validation rules for readings
|   `-- storage.py      SQLite and Supabase storage
|-- collect_weather.py  Starts one collector run
|-- run_middleware.py   Starts the middleware server
|-- supabase/schema.sql Creates the cloud table
|-- tests/              Automated tests
|-- .env.example        Safe configuration template
|-- requirements.txt    Python packages
`-- Dockerfile          Cloud deployment container
```

## 1. Create the Python environment

Open the repository in Visual Studio Code, then open its terminal and run:

```powershell
& "C:\Espressif\tools\python\release-v6.0\venv\Scripts\python.exe" -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
```

The first command creates an isolated Python environment for this application.
The second installs FastAPI and Uvicorn.

## 2. Run locally

Start the middleware in the first Visual Studio Code terminal:

```powershell
& ".\.venv\Scripts\python.exe" run_middleware.py
```

Leave it running. Open a second terminal and collect one reading:

```powershell
& ".\.venv\Scripts\python.exe" collect_weather.py
```

The collector downloads weather, sends it to the middleware, and the middleware
stores it in `data/weather_readings.db`.

Open these addresses in a browser:

- `http://127.0.0.1:8000/docs` - interactive API page.
- `http://127.0.0.1:8000/api/readings` - stored readings as JSON.
- `http://127.0.0.1:8000/health` - middleware status.

To collect continuously every 15 minutes:

```powershell
& ".\.venv\Scripts\python.exe" collect_weather.py --watch
```

Stop the collector or middleware with `Ctrl+C`.

## 3. Configure location

Copy the safe template to a private local configuration file:

```powershell
Copy-Item .env.example .env
```

Edit these values in `.env`:

```text
WEATHER_LATITUDE=52.5200
WEATHER_LONGITUDE=13.4050
FETCH_INTERVAL_SECONDS=900
```

The `.env` file is ignored by Git.

## 4. Connect Supabase cloud storage

1. Create a Supabase project.
2. Open its SQL Editor.
3. Run the contents of `supabase/schema.sql`.
4. In Supabase, copy the project Data API URL and a server-side secret key.
5. Update the private `.env` file:

```text
STORAGE_BACKEND=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_real_key
SUPABASE_TABLE=weather_readings
MIDDLEWARE_API_KEY=replace_with_a_long_random_value
```

Restart the middleware. New readings will now be stored in Supabase instead of
the local SQLite file.

Never commit `.env` or expose `SUPABASE_SECRET_KEY` in browser code. Supabase
secret keys provide elevated database access and belong only in backend
environment variables.

Set the same `MIDDLEWARE_API_KEY` in the collector and deployed middleware
environments. Requests to `/api/readings` must then include that key. Leaving it
empty is convenient for local development but should not be used on a public server.

## Visual Studio Code tasks and debugging

Use **Terminal > Run Task** and select:

- **Set up Python environment**
- **Start middleware**
- **Collect one weather reading**
- **Run automated tests**

For debugging, open **Run and Debug** and choose **Debug middleware** or
**Debug weather collector**. Add a breakpoint by clicking beside a line number,
then press `F5`.

## API endpoints

### `POST /api/readings`

Example request:

```json
{
  "timestamp": "2026-08-17T12:00:00+00:00",
  "temperature_c": 22.5,
  "humidity_percent": 61.0,
  "source": "open-meteo"
}
```

The middleware rejects temperatures outside `-100` to `100` degrees Celsius,
humidity outside `0` to `100` percent, and timestamps without a timezone.

### `GET /api/readings?limit=100`

Returns recent readings for the future visualization layer.

## Run tests

```powershell
& ".\.venv\Scripts\python.exe" -m unittest discover -s tests -v
```

## Cloud deployment

The included `Dockerfile` packages the middleware for a container hosting
service. Configure `STORAGE_BACKEND=supabase`, `SUPABASE_URL`, and
`SUPABASE_SECRET_KEY` as secret environment variables on that service. Also set
`MIDDLEWARE_API_KEY` to protect the public API from unauthorized writes.
