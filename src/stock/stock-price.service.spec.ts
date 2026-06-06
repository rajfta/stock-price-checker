import { PrismaService } from "../prisma/prisma.service";
import { StockPriceService } from "./stock-price.service";

describe("StockPriceService", () => {
    let service: StockPriceService;
    let findMany: jest.Mock;
    let findFirst: jest.Mock;
    let create: jest.Mock;

    const mockPrice = 307.34;
    const mockTimestamp = new Date("2026-06-06T00:00:00.000Z");
    const mockSymbol = "AAPL";

    beforeEach(() => {
        findMany = jest.fn();
        findFirst = jest.fn();
        create = jest.fn();
        const prisma = {
            stockPrice: { findMany, create, findFirst },
        } as unknown as PrismaService;
        service = new StockPriceService(prisma);
    });

    it("returns the last 10 prices for a symbol (newest first) as numbers", async () => {
        findMany.mockResolvedValue([
            { price: 300 },
            { price: 200 },
            { price: 100 },
        ]);

        const prices = await service.getLastPrices(mockSymbol);

        expect(prices).toEqual([300, 200, 100]);
        expect(findMany).toHaveBeenCalledWith({
            where: { symbol: mockSymbol },
            orderBy: { timestamp: "desc" },
            take: 10,
            select: { price: true },
        });
    });

    it("records a price row for a symbol", async () => {
        create.mockResolvedValue({});

        await service.record(mockSymbol, mockPrice, mockTimestamp);

        expect(create).toHaveBeenCalledWith({
            data: {
                symbol: mockSymbol,
                price: mockPrice,
                timestamp: mockTimestamp,
            },
        });
    });

    it("returns the latest price and the timestamp for a symbol", async () => {
        findFirst.mockResolvedValue({
            price: mockPrice,
            timestamp: mockTimestamp,
        });

        const result = await service.getLatest(mockSymbol);

        expect(result).toEqual({
            price: mockPrice,
            timestamp: mockTimestamp,
        });
        expect(findFirst).toHaveBeenCalledWith({
            where: { symbol: mockSymbol },
            orderBy: { timestamp: "desc" },
            select: { price: true, timestamp: true },
        });
    });

    it("returns null if no price is found for a symbol", async () => {
        findFirst.mockResolvedValue(null);

        const result = await service.getLatest(mockSymbol);

        expect(result).toBeNull();
        expect(findFirst).toHaveBeenCalledWith({
            where: { symbol: mockSymbol },
            orderBy: { timestamp: "desc" },
            select: { price: true, timestamp: true },
        });
    });
});
