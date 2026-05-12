# Prisma From Zero — Space Photo Gallery

Day 32 of TechFromZero. A space photo gallery built on **Prisma 6 + PostgreSQL 16**, ingesting NASA's Astronomy Picture of the Day archive, with a Vite + React frontend that supports favorites, cursor pagination, and HD downloads.

Schema-first migrations, typed query results, relations with `include`, raw query escape hatch, atomic toggle transaction, hoisted multi-binary engine for cross-platform Prisma. Every Prisma pattern you'd reach for in production.

---

## Quick start

You need Docker.

```bash
git clone https://github.com/dev48v/prisma-from-zero
cd prisma-from-zero

# 1. Start Postgres + API (migrates + backfills last 90 days)
docker compose up -d

# 2. Run the React client
npm install --workspace=client
npm run dev:client
# open http://localhost:5173
```

For local dev outside Docker:

```bash
npm install --workspace=server
cd server
cp .env.example .env   # set DATABASE_URL to your local PG
npx prisma migrate dev
npm run dev
```

---

## What's in here

```
prisma-from-zero/
├── server/                Node 22 + TypeScript + Express + Prisma 6
│   ├── prisma/
│   │   └── schema.prisma   Photo + Favorite models, indexes, relations
│   └── src/
│       ├── config.ts        env + NASA API key
│       ├── prisma.ts        global singleton + ready gate
│       ├── nasa.ts          APOD client (today, range, backfill)
│       ├── ingest.ts        upsert + createMany backfill + cron loop
│       ├── routes/photos.ts cursor pagination, raw SQL random, toggle txn
│       └── index.ts         Express bootstrap + healthz/readyz
├── client/                Vite + React 19 + react-router-dom 7
│   └── src/
│       ├── pages/Home.tsx       paginated gallery, cursor "Load more"
│       ├── pages/Detail.tsx     full APOD + favorite toggle + HD link
│       ├── pages/Favorites.tsx  starred-only view
│       ├── components/PhotoCard.tsx image OR video stub
│       └── api.ts                typed fetch wrapper
├── Dockerfile             multi-stage: Prisma generate → compile → slim runtime
├── docker-compose.yml     postgres:16-alpine + api
└── render.yaml            Render Blueprint (PG + Docker web)
```

---

## Step-by-step build

Each commit on `main` is one self-contained concept:

1. **Monorepo skeleton** — npm workspaces, gitignore
2. **Server scaffold** — Express + TypeScript + env config
3. **Prisma schema** — Photo + Favorite + relations + indexes + multi-binary targets
4. **PrismaClient singleton** — globalThis cache for hot reloads + ready gate
5. **NASA APOD client** — typed Feature interface, today + range + backfill
6. **Ingester** — upsert via Prisma + `createMany({ skipDuplicates: true })` for backfill
7. **Query routes** — cursor pagination, raw SQL random, toggle inside a transaction
8. **Express bootstrap** — healthz, readyz, async warmup, graceful shutdown
9. **Vite + React client** — router, typed API, PhotoCard with video stub
10. **Pages + theme** — Home / Detail / Favorites + pink Prisma styling
11. **Docker + Compose + render.yaml** — multi-stage with openssl + Prisma engine
12. **README** — this file

---

## API reference

| Endpoint | What it does |
|----------|--------------|
| `GET /api/photos?limit=&cursor=&favoritesOnly=` | Cursor-paginated gallery. |
| `GET /api/photos/:date` | One photo by YYYY-MM-DD. |
| `GET /api/random` | One random photo (raw `ORDER BY RANDOM()`). |
| `POST /api/photos/:id/favorite` | Toggle favorite inside a transaction. |
| `GET /api/favorites` | All starred photos with joined `favoritedAt`. |
| `GET /healthz` | Liveness — 200 once the port binds. |
| `GET /readyz` | Readiness — 200 once Postgres is reachable. |

---

## Prisma gotchas to know

- **`binaryTargets` is mandatory for Docker deploys.** Alpine = `linux-musl-openssl-3.0.x`, Debian = `debian-openssl-3.0.x`. Omit them and the runtime binary doesn't match → "Could not locate the Query Engine" at boot.
- **`openssl` is a runtime dep on Alpine.** `node:22-alpine` doesn't ship it. `apk add openssl` in both build + runtime stages.
- **`prisma generate` runs at BUILD time AND on every `npm install`.** Order matters in Dockerfiles — install before COPY-ing source if you want layer caching to work.
- **The `globalThis.prisma` cache pattern is for dev only.** In prod (`NODE_ENV=production`) we skip the cache so multiple processes get clean clients.
- **`$transaction(async tx => ...)` gives serializable semantics.** The favorite toggle uses it so two concurrent POSTs can't both create a Favorite row (which would violate `@@unique`).
- **`include: { _count: { select: { x: true } } }` is the cheap-aggregate pattern.** Postgres returns the count as a subquery in the same SELECT — no n+1.

---

## Deployment

**Frontend** → Vercel. `VITE_API_URL` env var → Render backend.

**Backend** → Render free Web Docker + free managed Postgres (90-day expiry on free tier). `render.yaml` provisions both and wires `DATABASE_URL` automatically. `prisma migrate deploy` runs on every container start; missing migrations apply, applied ones are no-ops.

---

## What you'll learn reading this

- Prisma schema → typed client → migration SQL pipeline
- `upsert` vs `createMany({ skipDuplicates })` — when each fits
- Cursor pagination (`take`, `cursor`, `skip: 1`) and why it beats offset
- Relations with `include`, `_count` aggregates, and onDelete cascades
- The `$queryRaw` escape hatch for things Prisma's DSL can't model
- `$transaction` for race-safe multi-step mutations
- Cross-platform Prisma engine deployment via `binaryTargets`
