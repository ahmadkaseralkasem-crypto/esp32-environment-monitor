CREATE TABLE IF NOT EXISTS public.weather_readings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    observed_at TIMESTAMPTZ NOT NULL,
    temperature_c DOUBLE PRECISION NOT NULL
        CHECK (temperature_c BETWEEN -100 AND 100),
    humidity_percent DOUBLE PRECISION NOT NULL
        CHECK (humidity_percent BETWEEN 0 AND 100),
    source TEXT NOT NULL DEFAULT 'open-meteo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weather_readings_observed_at_idx
    ON public.weather_readings (observed_at DESC);

ALTER TABLE public.weather_readings ENABLE ROW LEVEL SECURITY;

-- No public policies are added. The middleware uses a server-side Supabase
-- secret key, which must stay in the deployment environment and outside Git.

