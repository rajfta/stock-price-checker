import { HttpService } from "@nestjs/axios";
import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { Test, TestingModule } from "@nestjs/testing";
import { Observable, of, throwError } from "rxjs";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { PollerService } from "./../src/stock/poller.service";
import { PrismaService } from "./../src/prisma/prisma.service";

// The ONLY thing stubbed is the outbound Finnhub HTTP call. Everything else —
// Nest wiring, FinnhubService normalization, the services, the repositories,
// Prisma, and a real Postgres (the dedicated `stocks_test` DB) — runs for real.
let nextHttpResponse: () => Observable<{ data: unknown }>;

const quote = (overrides: Partial<{ c: number; t: number }> = {}) =>
    of({ data: { c: 307.34, t: 1780689600, ...overrides } });

// The /stock/:symbol JSON shape (lastUpdated is an ISO string over the wire).
interface StockSummaryResponse {
    symbol: string;
    price: number;
    lastUpdated: string;
    movingAverage: number | null;
}

describe("Stock (integration)", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let poller: PollerService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(HttpService)
            .useValue({ get: () => nextHttpResponse() })
            .compile();

        app = moduleFixture.createNestApplication();
        // Mirror the production bootstrap (main.ts).
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, transform: true }),
        );
        await app.init();

        // Stop the real per-minute cron so only explicit poller.tick() calls
        // run — keeps DB state deterministic across assertions.
        app.get(SchedulerRegistry)
            .getCronJobs()
            .forEach((job) => {
                void job.stop();
            });

        prisma = app.get(PrismaService);
        poller = app.get(PollerService);
    });

    beforeEach(async () => {
        nextHttpResponse = () => quote();
        await prisma.stockPrice.deleteMany();
        await prisma.trackedSymbol.deleteMany();
    });

    afterAll(async () => {
        await app.close();
    });

    const server = () => request(app.getHttpServer());

    describe("GET /stock/:symbol", () => {
        it("rejects an invalid symbol with 400", async () => {
            await server().get("/stock/123!!").expect(400);
        });

        it("returns 404 when the symbol has no stored prices", async () => {
            await server().get("/stock/AAPL").expect(404);
        });
    });

    describe("PUT /stock/:symbol", () => {
        it("validates upstream, persists the symbol + first price, and returns the summary", async () => {
            const res = await server().put("/stock/AAPL").expect(200);
            const body = res.body as StockSummaryResponse;

            expect(body).toMatchObject({
                symbol: "AAPL",
                price: 307.34,
                movingAverage: 307.34,
            });
            expect(typeof body.lastUpdated).toBe("string");

            const tracked = await prisma.trackedSymbol.findUnique({
                where: { symbol: "AAPL" },
            });
            expect(tracked?.active).toBe(true);

            const prices = await prisma.stockPrice.findMany({
                where: { symbol: "AAPL" },
            });
            expect(prices).toHaveLength(1);
            expect(prices[0].price).toBe(307.34);
        });

        it("lower-cases / trims into a canonical symbol before storing", async () => {
            await server().put("/stock/  aapl  ").expect(200);

            const tracked = await prisma.trackedSymbol.findMany();
            expect(tracked.map((t) => t.symbol)).toEqual(["AAPL"]);
        });

        it("does not track an unknown symbol (Finnhub t=0 -> 404)", async () => {
            nextHttpResponse = () => quote({ c: 0, t: 0 });

            await server().put("/stock/NOPE").expect(404);

            expect(
                await prisma.trackedSymbol.findUnique({
                    where: { symbol: "NOPE" },
                }),
            ).toBeNull();
            expect(await prisma.stockPrice.count()).toBe(0);
        });

        it("maps an upstream failure to 503", async () => {
            // The service logs the failure (expected); silence it for clean output.
            const errorLog = jest
                .spyOn(Logger.prototype, "error")
                .mockImplementation();
            nextHttpResponse = () =>
                throwError(() => new Error("network down"));

            await server().put("/stock/AAPL").expect(503);

            expect(errorLog).toHaveBeenCalled();
            errorLog.mockRestore();
        });
    });

    describe("moving average over real rows", () => {
        it("computes the mean of the last <=10 stored prices", async () => {
            const base = Date.parse("2026-06-05T20:00:00.000Z");
            const prices = [300, 310, 320, 330, 340, 350, 360, 370, 380, 390];
            for (let i = 0; i < prices.length; i++) {
                await prisma.stockPrice.create({
                    data: {
                        symbol: "AAPL",
                        price: prices[i],
                        timestamp: new Date(base + i * 60_000),
                    },
                });
            }

            const res = await server().get("/stock/AAPL").expect(200);
            const body = res.body as StockSummaryResponse;

            expect(body.price).toBe(390); // newest
            expect(body.movingAverage).toBe(345); // mean(300..390)
        });

        it("uses only the most recent 10 when more than 10 exist", async () => {
            const base = Date.parse("2026-06-05T20:00:00.000Z");
            // Oldest two (100, 110) must fall outside the window.
            const prices = [
                100, 110, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390,
            ];
            for (let i = 0; i < prices.length; i++) {
                await prisma.stockPrice.create({
                    data: {
                        symbol: "AAPL",
                        price: prices[i],
                        timestamp: new Date(base + i * 60_000),
                    },
                });
            }

            const res = await server().get("/stock/AAPL").expect(200);
            const body = res.body as StockSummaryResponse;

            expect(body.movingAverage).toBe(345); // mean(300..390), not 100/110
        });
    });

    describe("poller writes through the real stack", () => {
        it("stores a new price for active symbols on a tick", async () => {
            await server().put("/stock/AAPL").expect(200); // 1 price, tracked

            // Advance the quote timestamp so it is not deduped.
            nextHttpResponse = () => quote({ c: 311.5, t: 1780689660 });
            await poller.tick();

            const prices = await prisma.stockPrice.findMany({
                where: { symbol: "AAPL" },
                orderBy: { timestamp: "desc" },
            });
            expect(prices).toHaveLength(2);
            expect(prices[0].price).toBe(311.5);
        });

        it("does not store a duplicate when the quote timestamp is unchanged", async () => {
            await server().put("/stock/AAPL").expect(200); // stores t=1780689600
            await poller.tick(); // same timestamp -> dedup skip

            expect(await prisma.stockPrice.count()).toBe(1);
        });
    });
});
