# STEP 11 — Production multi-stage image.
#
# Two stages. Build runs `prisma generate` (creates the typed client
# binary) THEN `tsc` (compiles TS). Runtime carries the compiled
# output + the hoisted node_modules (which contain the Prisma engine
# binary matching `binaryTargets` in schema.prisma).
#
# A common Prisma deploy footgun: `prisma generate` produces a
# binary specific to the build OS. node:22-alpine = linux-musl-x64.
# If the schema's binaryTargets omits "linux-musl-openssl-3.0.x" the
# runtime container errors with "Prisma Client could not locate the
# Query Engine for runtime". Our schema.prisma includes that target.

# ---------- Stage 1: build ----------
FROM node:22-alpine AS builder

# OpenSSL is REQUIRED for the Prisma query engine binary. Alpine's
# base image doesn't ship it — Prisma fails at boot otherwise with
# "Unable to require libquery_engine".
RUN apk add --no-cache openssl

WORKDIR /app
COPY package.json ./
COPY server/package.json ./server/
COPY server/prisma ./server/prisma
RUN npm install --workspace=server --include=dev
COPY server ./server
RUN npm run build --workspace=server \
  && npm prune --workspace=server --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Workspaces hoist into /app/node_modules — only copy from root,
# not /app/server/node_modules (same gotcha as Day 28+).
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/server/package.json /app/server/package.json
COPY --from=builder /app/server/dist /app/server/dist
COPY --from=builder /app/server/prisma /app/server/prisma

ENV PORT=8080 \
    NODE_ENV=production

USER node
WORKDIR /app/server
EXPOSE 8080

# `prisma migrate deploy` is the production migration command —
# applies pending migrations, doesn't generate new ones. Idempotent
# across container restarts.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
