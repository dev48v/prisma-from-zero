// STEP 5 — NASA APOD upstream client.
//
// API shape (single-day):
//   GET https://api.nasa.gov/planetary/apod?api_key=KEY
//     → { date, title, explanation, url, hdurl?, media_type, copyright? }
//
// API shape (range):
//   GET ?api_key=KEY&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
//     → array of the above, oldest first. Max range = 100 days per call.
//
// Quirks:
//   - DEMO_KEY rate limit returns 429 with `X-RateLimit-Remaining: 0`
//   - `media_type` is "image" most days, sometimes "video" (YouTube
//     embed in `url`). We store both, the FE branches on type.
//   - `hdurl` is sometimes missing (older photos lack high-res scans).
//   - Some photos have no `copyright` field at all (NASA-produced).
import { config } from './config.js';

export interface ApodFeature {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: 'image' | 'video' | string;
  copyright?: string;
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    // 429 = rate limit hit. We surface the full message because the
    // X-RateLimit-Reset header tells the operator when to retry.
    const body = await res.text().catch(() => '');
    throw new Error(`nasa ${res.status} ${res.statusText} :: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
};

export const fetchToday = async (): Promise<ApodFeature> => {
  return fetchJson<ApodFeature>(`${config.nasaBase}?api_key=${config.nasaApiKey}`);
};

// Format YYYY-MM-DD for NASA. They don't accept ISO timestamps.
const fmt = (d: Date): string => d.toISOString().slice(0, 10);

export const fetchRange = async (start: Date, end: Date): Promise<ApodFeature[]> => {
  const url = `${config.nasaBase}?api_key=${config.nasaApiKey}&start_date=${fmt(start)}&end_date=${fmt(end)}`;
  return fetchJson<ApodFeature[]>(url);
};

// 90-day backfill is well under NASA's 100-day-per-call limit, so we
// can pull it in ONE request. For longer windows the caller would
// chunk this.
export const fetchBackfill = async (days: number): Promise<ApodFeature[]> => {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return fetchRange(start, end);
};
