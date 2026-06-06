import { PrismaService } from "../prisma/prisma.service";
import { StockPriceService } from "./stock-price.service";

describe("StockPriceService", () => {
    let service: StockPriceService;
    let findMany: jest.Mock;

    beforeEach(() => {
        findMany = jest.fn();
        const prisma = {
            stockPrice: { findMany },
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
});
