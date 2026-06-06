import { PrismaService } from "../prisma/prisma.service";
import { StockPriceRepository } from "./stock-price.repository";

describe("StockPriceRepository", () => {
    let repository: StockPriceRepository;
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
        repository = new StockPriceRepository(prisma);
    });

    it("returns the most recent rows (price + timestamp, newest first)", async () => {
        const rows = [
            { price: 307.34, timestamp: mockTimestamp },
            { price: 300, timestamp: new Date("2026-06-05T00:00:00.000Z") },
        ];
        findMany.mockResolvedValue(rows);

        const result = await repository.getRecent(mockSymbol);

        expect(result).toEqual(rows);
        expect(findMany).toHaveBeenCalledWith({
            where: { symbol: mockSymbol },
            orderBy: { timestamp: "desc" },
            take: 10,
            select: { price: true, timestamp: true },
        });
    });

    it("records a price row for a symbol", async () => {
        create.mockResolvedValue({});

        await repository.record(mockSymbol, mockPrice, mockTimestamp);

        expect(create).toHaveBeenCalledWith({
            data: {
                symbol: mockSymbol,
                price: mockPrice,
                timestamp: mockTimestamp,
            },
        });
    });

    it("returns the latest price and timestamp for a symbol", async () => {
        findFirst.mockResolvedValue({
            price: mockPrice,
            timestamp: mockTimestamp,
        });

        const result = await repository.getLatest(mockSymbol);

        expect(result).toEqual({ price: mockPrice, timestamp: mockTimestamp });
        expect(findFirst).toHaveBeenCalledWith({
            where: { symbol: mockSymbol },
            orderBy: { timestamp: "desc" },
            select: { price: true, timestamp: true },
        });
    });

    it("returns null if no price is found for a symbol", async () => {
        findFirst.mockResolvedValue(null);

        const result = await repository.getLatest(mockSymbol);

        expect(result).toBeNull();
    });
});
