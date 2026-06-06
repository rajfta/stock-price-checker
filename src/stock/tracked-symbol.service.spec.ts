import { PrismaService } from "../prisma/prisma.service";
import { TrackedSymbolService } from "./tracked-symbol.service";

describe("TrackedSymbolService", () => {
    let service: TrackedSymbolService;
    let findMany: jest.Mock;
    let upsert: jest.Mock;

    beforeEach(() => {
        findMany = jest.fn();
        upsert = jest.fn();
        const prisma = {
            trackedSymbol: { findMany, upsert },
        } as unknown as PrismaService;
        service = new TrackedSymbolService(prisma);
    });

    it("returns the names of all active tracked symbols", async () => {
        findMany.mockResolvedValue([{ symbol: "AAPL" }, { symbol: "TSLA" }]);

        const symbols = await service.getActiveSymbols();

        expect(symbols).toEqual(["AAPL", "TSLA"]);
        expect(findMany).toHaveBeenCalledWith({
            where: { active: true },
            select: { symbol: true },
        });
    });

    it("activates a symbol for tracking", async () => {
        upsert.mockResolvedValue({});

        await service.activate("AAPL");

        expect(upsert).toHaveBeenCalledWith({
            where: { symbol: "AAPL" },
            update: { active: true },
            create: { symbol: "AAPL", active: true },
        });
    });
});
