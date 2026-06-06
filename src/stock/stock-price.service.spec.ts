import { PrismaService } from "../prisma/prisma.service";
import { StockPriceService } from "./stock-price.service";

describe("StockPriceService", () => {
    let service: StockPriceService;
    let findMany: jest.Mock;
    let create: jest.Mock;

    beforeEach(() => {
        findMany = jest.fn();
        create = jest.fn();
        const prisma = {
            stockPrice: { findMany, create },
        } as unknown as PrismaService;
        service = new StockPriceService(prisma);
    });

    it("returns the last 10 prices for a symbol (newest first) as numbers", async () => {
        findMany.mockResolvedValue([
            { price: 300 },
            { price: 200 },
            { price: 100 },
        ]);

        const prices = await service.getLastPrices("AAPL");

        expect(prices).toEqual([300, 200, 100]);
        expect(findMany).toHaveBeenCalledWith({
            where: { symbol: "AAPL" },
            orderBy: { timestamp: "desc" },
            take: 10,
            select: { price: true },
        });
    });

    it("records a price row for a symbol", async () => {
        create.mockResolvedValue({});
        const timestamp = new Date("2026-06-06T00:00:00.000Z");

        await service.record("AAPL", 307.34, timestamp);

        expect(create).toHaveBeenCalledWith({
            data: { symbol: "AAPL", price: 307.34, timestamp },
        });
    });
});
