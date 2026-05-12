// STEP 2 — Centralised env loading + validation.
const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required(
    'DATABASE_URL',
    'postgresql://prisma:prisma@localhost:5432/prisma',
  ),
  // NASA APOD: api.nasa.gov. DEMO_KEY is rate-limited (30/hr, 50/day)
  // but enough for the daily ingest (1 call/day) plus the 90-day
  // backfill on cold start (1 range call = 90 days = 1 quota slot).
  nasaApiKey: process.env.NASA_API_KEY ?? 'DEMO_KEY',
  nasaBase: process.env.NASA_BASE ?? 'https://api.nasa.gov/planetary/apod',
  // How often to check for the newest APOD. NASA publishes once per
  // day around 05:00 UTC; polling every 6 hours catches it within a
  // window without burning quota.
  ingestIntervalMs: Number(process.env.INGEST_INTERVAL_MS ?? 6 * 60 * 60 * 1000),
  // First-boot backfill window in days.
  backfillDays: Number(process.env.BACKFILL_DAYS ?? 90),
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
