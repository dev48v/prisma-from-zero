// STEP 6 — Ingestion job.
//
// Prisma upsert pattern:
//   prisma.photo.upsert({ where: { date }, create: {...}, update: {...} })
//
// One round trip per row, same as ON CONFLICT DO UPDATE in raw SQL.
// For our scale (~90 rows on backfill, 1/day after) this is fine —
// Prisma's overhead vs raw SQL is ~10ms/row.
//
// For bulk inserts where you DON'T need upsert semantics, use
// prisma.photo.createMany({ skipDuplicates: true, data: [...] }) —
// it batches everything into a single INSERT statement. We use that
// here for the backfill since we know we're starting from empty.
import { prisma } from './prisma.js';
import { fetchToday, fetchBackfill, type ApodFeature } from './nasa.js';

const toPhotoRow = (apod: ApodFeature) => ({
  date: new Date(apod.date),
  title: apod.title,
  explanation: apod.explanation,
  url: apod.url,
  hdurl: apod.hdurl ?? null,
  mediaType: apod.media_type,
  copyright: apod.copyright?.trim() || null,
  payload: apod as unknown as object,
});

export const ingestOne = async (apod: ApodFeature): Promise<'inserted' | 'updated'> => {
  // upsert returns the row. To distinguish insert vs update we check
  // the count first — slightly chatty but useful for ingest logs.
  const existing = await prisma.photo.findUnique({
    where: { date: new Date(apod.date) },
    select: { id: true },
  });
  await prisma.photo.upsert({
    where: { date: new Date(apod.date) },
    create: toPhotoRow(apod),
    update: toPhotoRow(apod),
  });
  return existing ? 'updated' : 'inserted';
};

export const backfill = async (days: number): Promise<{ inserted: number; total: number }> => {
  const apods = await fetchBackfill(days);
  if (apods.length === 0) return { inserted: 0, total: 0 };

  // createMany with skipDuplicates is the bulk path. It doesn't
  // support UPDATE semantics — re-runs add zero new rows once the
  // backfill window has been ingested. For revisions you'd reach
  // for upsert in a loop, but APOD content rarely changes.
  const result = await prisma.photo.createMany({
    data: apods.map(toPhotoRow),
    skipDuplicates: true,
  });
  return { inserted: result.count, total: apods.length };
};

let timer: NodeJS.Timeout | null = null;

export const startIngestionLoop = (intervalMs: number): void => {
  const tick = async (): Promise<void> => {
    try {
      const t0 = Date.now();
      const apod = await fetchToday();
      const status = await ingestOne(apod);
      console.log(`[ingest] tick: ${apod.date} ${status} (${Date.now() - t0}ms)`);
    } catch (err) {
      // Don't kill the loop — rate-limit blip, transient 5xx, etc.
      // Next tick will recover.
      console.error('[ingest] tick failed:', (err as Error).message);
    }
  };
  void tick();
  timer = setInterval(tick, intervalMs);
};

export const stopIngestionLoop = (): void => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
