import { PrismaService } from "../prisma/prisma.service";
import { TrackedSymbolRepository } from "./tracked-symbol.repository";

describe("TrackedSymbolRepository", () => {
    let repository: TrackedSymbolRepository;
    let findMany: jest.Mock;
    let upsert: jest.Mock;

    beforeEach(() => {
        findMany = jest.fn();
        upsert = jest.fn();
        const prisma = {
            trackedSymbol: { findMany, upsert },
        } as unknown as PrismaService;
        repository = new TrackedSymbolRepository(prisma);
    });

    it("returns the names of all active tracked symbols", async () => {
        findMany.mockResolvedValue([{ symbol: "AAPL" }, { symbol: "TSLA" }]);

        const symbols = await repository.getActiveSymbols();

        expect(symbols).toEqual(["AAPL", "TSLA"]);
        expect(findMany).toHaveBeenCalledWith({
            where: { active: true },
            select: { symbol: true },
        });
    });

    it("activates a symbol for tracking", async () => {
        upsert.mockResolvedValue({});

        await repository.activate("AAPL");

        expect(upsert).toHaveBeenCalledWith({
            where: { symbol: "AAPL" },
            update: { active: true },
            create: { symbol: "AAPL", active: true },
        });
    });
});
