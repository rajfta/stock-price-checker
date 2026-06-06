# ---- Builder: install everything, generate the Prisma client, compile ----
FROM node:22-slim AS builder
WORKDIR /app
RUN npm install -g pnpm@10.30.1

# Install deps first so this layer caches unless the manifests change.
# --ignore-scripts skips the postinstall `prisma generate` (no schema yet);
# we run generate explicitly below once the schema has been copied.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the source, generate the Prisma client, then compile to dist/.
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# ---- Runner: the runtime image ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.30.1

# Carry over from the builder:
#   node_modules — includes the Prisma CLI (for `migrate deploy`) + adapter.
#   dist         — the compiled app, incl. the generated client at dist/generated.
#   prisma/, prisma.config.ts, package.json — needed by `migrate deploy`.
# NOTE: this keeps devDeps for simplicity. To slim the image, prune prod-only
# deps and run migrations as a separate one-shot step instead.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Apply any pending migrations, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
