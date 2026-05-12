// STEP 7 — Query routes. Five endpoints, each showing a Prisma idiom:
//
//   GET /api/photos?limit=&cursor=&favoritesOnly=
//     → CURSOR pagination (preferred over offset for stable scroll).
//       Cursor = last row's id. Prisma takes `cursor: { id }`+`skip: 1`.
//
//   GET /api/photos/:date
//     → findUnique on the unique `date` column.
//
//   GET /api/random
//     → Prisma's typed API has no `ORDER BY RANDOM()` shortcut.
//       We drop to `$queryRaw` — the escape hatch for everything
//       Prisma can't model in its DSL.
//
//   POST /api/photos/:id/favorite
//     → Toggle. Demonstrates UPSERT + DELETE in a transaction.
//
//   GET /api/favorites
//     → `include: { photo: true }` — Prisma loads the joined photo
//       in ONE query (with a subquery) when possible, OR n+1 lazy
//       loads when not. For a typical favorites page (<100 rows)
//       the difference is invisible.
import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma.js';

export const photosRouter = Router();

const wrap = (
  fn: (req: Request, res: Response) => Promise<void>,
): ((req: Request, res: Response, next: (err?: unknown) => void) => void) => {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
};

photosRouter.get(
  '/photos',
  wrap(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 60);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const favoritesOnly = req.query.favoritesOnly === 'true';

    // Cursor pagination: pass the LAST id from the previous page,
    // skip:1 jumps past it, take:limit+1 fetches one extra to know
    // if there's a next page without a separate count query.
    const photos = await prisma.photo.findMany({
      where: favoritesOnly
        ? { favorites: { some: {} } }
        : undefined,
      include: {
        // _count.favorites is "select count(*) from favorites where
        // photo_id = ..." — Prisma adds it to the SELECT for free.
        _count: { select: { favorites: true } },
      },
      orderBy: { date: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    res.json({
      items: items.map((p) => ({
        ...p,
        favoriteCount: p._count.favorites,
        favorited: p._count.favorites > 0,
      })),
      nextCursor,
    });
  }),
);

photosRouter.get(
  '/photos/:date',
  wrap(async (req, res) => {
    // The `date` column is `@db.Date` — comparing as a Date object
    // works because Prisma normalises both sides to YYYY-MM-DD.
    const photo = await prisma.photo.findUnique({
      where: { date: new Date(req.params.date) },
      include: { _count: { select: { favorites: true } } },
    });
    if (!photo) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }
    res.json({
      ...photo,
      favoriteCount: photo._count.favorites,
      favorited: photo._count.favorites > 0,
    });
  }),
);

photosRouter.get(
  '/random',
  wrap(async (_req, res) => {
    // Raw query escape hatch. Prisma's typed API can't express
    // ORDER BY RANDOM() — too DB-specific. $queryRaw lets us drop
    // to SQL when needed; the result is still typed via the generic.
    const rows = await prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM photos ORDER BY RANDOM() LIMIT 1`;
    if (rows.length === 0) {
      res.status(404).json({ error: 'No photos indexed' });
      return;
    }
    const photo = await prisma.photo.findUnique({
      where: { id: rows[0].id },
      include: { _count: { select: { favorites: true } } },
    });
    res.json({
      ...photo,
      favoriteCount: photo?._count.favorites ?? 0,
      favorited: (photo?._count.favorites ?? 0) > 0,
    });
  }),
);

photosRouter.post(
  '/photos/:id/favorite',
  wrap(async (req, res) => {
    const photoId = req.params.id;
    // Toggle inside a transaction so concurrent toggles don't race
    // into "both inserted" (would violate the @@unique constraint).
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.favorite.findUnique({ where: { photoId } });
      if (existing) {
        await tx.favorite.delete({ where: { photoId } });
        return { favorited: false };
      }
      await tx.favorite.create({ data: { photoId } });
      return { favorited: true };
    });
    res.json(result);
  }),
);

photosRouter.get(
  '/favorites',
  wrap(async (_req, res) => {
    // include + nested orderBy: the joined photo arrives shaped how
    // we want. Without `include` we'd get a list of foreign keys
    // and have to do a second query.
    const favorites = await prisma.favorite.findMany({
      include: { photo: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      items: favorites.map((f) => ({
        ...f.photo,
        favoritedAt: f.createdAt,
        favorited: true,
      })),
    });
  }),
);
