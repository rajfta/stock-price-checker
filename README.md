# Stock Price Checker

A [NestJS](https://nestjs.com) service that periodically fetches stock prices from
[Finnhub](https://finnhub.io), stores them in PostgreSQL via Prisma, and exposes the latest
price plus a 10-point moving average through a documented REST API.

## Tech stack

- **NestJS 11** (TypeScript — `strictNullChecks`, `noImplicitAny`)
- **PostgreSQL 16** + **Prisma 7** (driver adapter)
- **@nestjs/schedule** — per-minute cron polling
- **@nestjs/axios + RxJS** — resilient Finnhub client (timeout / retry / error mapping)
- **class-validator** — environment + request validation
- **@nestjs/swagger** — OpenAPI docs
- **Jest** (unit, integration, e2e), **ESLint** + **Prettier**
- **Docker** + **Docker Compose**, **GitHub Actions** CI

## Quick start (Docker — recommended)

The whole stack (app **and** database) runs with one command — no local Node, pnpm, or
Postgres required, only Docker.

```bash
cp .env.example .env          # then set FINNHUB_API_KEY (free key from finnhub.io)
docker compose up --build
```

This builds the app image, starts Postgres, applies migrations, and serves the API.
Open the interactive docs at **<http://localhost:3000/docs>**.

## API

| Method | Route | Description |
|--------|-------|-------------|
| `PUT`  | `/stock/:symbol` | Start per-minute tracking for a symbol (validates it first) |
| `GET`  | `/stock/:symbol` | Latest price, last-updated time, and 10-point moving average |
| `GET`  | `/health` | Liveness check |
| `GET`  | `/docs` | Swagger UI |

```bash
curl -X PUT http://localhost:3000/stock/AAPL   # start tracking
curl http://localhost:3000/stock/AAPL          # { symbol, price, lastUpdated, movingAverage }
```

Errors: invalid symbol → `400`, unknown symbol / no data yet → `404`, upstream failure → `503`.

> **Note:** when the market is closed (nights/weekends) Finnhub returns the last close with a
> frozen timestamp, so the price won't change and the moving average stays flat until trading
> resumes. The poller de-duplicates by timestamp, so it won't store repeats.

## How it works

- **`PUT /stock/:symbol`** validates the symbol against Finnhub (storing the first price) and
  marks it active. It no-ops if the symbol is already tracked.
- A single **`@Cron` poller** runs every minute, loads all active symbols, fetches each quote,
  and stores new price points — skipping duplicates when the quote hasn't advanced. Per-symbol
  errors are isolated so one bad symbol can't stop the others.
- **`GET /stock/:symbol`** returns the latest stored price + timestamp and the mean of the last
  ≤10 prices (one DB query).

### Architecture

```
AppModule
├── ConfigModule (global)        env loading + class-validator validation (fail-fast)
├── ScheduleModule.forRoot()     cron infrastructure
├── PrismaModule (global)        PrismaService — driver adapter + lifecycle hooks
├── HealthModule                 GET /health
├── FinnhubModule                FinnhubService — typed, resilient HTTP client
└── StockModule
    ├── StockController          GET / PUT /stock/:symbol
    ├── StockService             orchestration (composes the pieces below)
    ├── PollerService            @Cron poll loop
    ├── MovingAverageService     pure last-10 calculation
    ├── StockPriceRepository     prices data access
    └── TrackedSymbolRepository  tracked-symbol data access
```

## Local development (without Docker)

Requires Node 22 + pnpm. Use the DB container (or your own Postgres):

```bash
docker compose up -d postgres   # just the database
cp .env.example .env            # set FINNHUB_API_KEY; DATABASE_URL points at localhost
pnpm install
pnpm prisma migrate dev         # apply migrations
pnpm start:dev                  # http://localhost:3000
```

## Environment variables

See `.env.example`:

| Variable | Example | Notes |
|----------|---------|-------|
| `NODE_ENV` | `development` | |
| `PORT` | `3000` | |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/stocks?schema=public` | overridden to the `postgres` service host inside Compose |
| `FINNHUB_API_KEY` | _(your key)_ | **required** |
| `FINNHUB_BASE_URL` | `https://finnhub.io/api/v1` | |

Missing or invalid variables fail fast at startup (validated by class-validator).

## Testing

```bash
pnpm test             # unit tests (fast, fully mocked)
pnpm test:e2e         # e2e — boots the app, stubs the DB, hits /health
pnpm test:integration # integration — real Postgres, real Prisma, only Finnhub stubbed
pnpm lint
```

`test:integration` needs a reachable Postgres (`docker compose up -d postgres` is
enough). It creates a dedicated **`stocks_test`** database, applies the migrations to
it, and exercises the full stack — controller → service → poller → repositories →
Prisma → Postgres — with only the outbound Finnhub HTTP call stubbed. Your dev/prod
data is never touched.

Business logic is built **test-first**; mocked dependencies keep the unit suite fast and
deterministic.

## License

UNLICENSED — built as a take-home exercise.
