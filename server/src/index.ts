// STEP 8 — Express bootstrap. Same pattern as Day 31:
//   - bind port immediately so /healthz responds to Render
//   - block PG warm-up + backfill in a background task
//   - graceful shutdown closes Prisma + HTTP cleanly
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { prisma, waitForReady } from './prisma.js';
import { photosRouter } from './routes/photos.js';
import { backfill, startIngestionLoop, stopIngestionLoop } from './ingest.js';

const app = express();

app.use(
  cors({ origin: config.corsOrigins.length > 0 ? config.corsOrigins : true }),
);
app.use(express.json());

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

let pgReady = false;
app.get('/readyz', async (_req, res) => {
  if (!pgReady) {
    res.status(503).json({ status: 'pending', reason: 'postgres not ready' });
    return;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', postgres: true });
  } catch {
    res.status(503).json({ status: 'degraded', postgres: false });
  }
});

app.use('/api', photosRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: err instanceof Error ? err.message : 'Internal server error',
  });
};
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});

const warmup = async (): Promise<void> => {
  await waitForReady();
  pgReady = true;
  console.log('Postgres ready');

  try {
    console.log(`[ingest] cold-start backfill of last ${config.backfillDays} days...`);
    const result = await backfill(config.backfillDays);
    console.log(
      `[ingest] backfill done: inserted=${result.inserted} of ${result.total} (rest were duplicates)`,
    );
  } catch (err) {
    console.error('[ingest] backfill failed:', (err as Error).message);
  }

  startIngestionLoop(config.ingestIntervalMs);
};

warmup().catch((err) => {
  console.error('Warmup failed:', err.message);
});

const shutdown = (signal: string): void => {
  console.log(`Received ${signal}, closing server`);
  stopIngestionLoop();
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
