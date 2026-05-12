Day 32 - Type-safe SQL without writing SQL. Prisma + PostgreSQL + 90 days of NASA's most beautiful photos.


🚀TechFromZero Series - PrismaFromZero


🌐 Try it live: https://prisma-from-zero.vercel.app


This isn't a Hello World. It's a real typed-ORM app:
📐 Prisma schema → typed client → PostgreSQL 16 → React + cursor pagination


🔗 The full code (with step-by-step commits you can follow):
https://github.com/dev48v/prisma-from-zero


🧱 What I built (step by step):

1️⃣ Prisma schema — Photo + Favorite + relations + indexes + multi-binary targets so the generated engine works on Mac, Linux, Alpine, Debian

2️⃣ Migrations — `prisma migrate diff` generates the SQL, `prisma migrate deploy` applies it on every container start (idempotent)

3️⃣ PrismaClient singleton — globalThis cache so tsx watch hot reloads don't leak connection pools every save

4️⃣ NASA APOD ingest — `createMany({ skipDuplicates: true })` for the 90-day backfill, `upsert` for the 6h cron tick

5️⃣ Cursor pagination — `take`, `cursor: { id }`, `skip: 1` — stable scroll even when new photos arrive between page loads

6️⃣ Raw SQL escape hatch — `prisma.$queryRaw\`ORDER BY RANDOM()\`` because Prisma's DSL can't model that

7️⃣ Atomic favorite toggle — `prisma.$transaction(async tx => ...)` so two concurrent POSTs can't violate the unique constraint

8️⃣ Cross-platform engine — `binaryTargets = ["native", "linux-musl-openssl-3.0.x", "debian-openssl-3.0.x"]` + `apk add openssl` so Alpine Docker actually boots


💡 Every file has detailed comments explaining WHY, not just what. Written for any beginner who wants to learn Prisma by reading real code — with full clarity on each step.

👉 If you're a beginner learning Prisma, clone it and read the commits one by one. Each commit = one concept. Each file = one lesson. Built from scratch, so nothing is hidden.

🔥 This is Day 32 of a 50-day series. A new technology every day. Follow along!

🌐 See all days: https://dev48v.infy.uk/techfromzero.php

#TechFromZero #Day32 #Prisma #LearnByDoing #OpenSource #BeginnerGuide #100DaysOfCode #CodingFromScratch
