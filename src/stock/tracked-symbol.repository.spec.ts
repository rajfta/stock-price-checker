import { PrismaService } from "../prisma/prisma.service";
import { TrackedSymbolRepository } from "./tracked-symbol.repository";

describe("TrackedSymbolRepository", () => {
    let repository: TrackedSymbolRepository;
    let findMany: jest.Mock;
    let upsert: jest.Mock;
    let findUnique: jest.Mock;

    beforeEach(() => {
        findMany = jest.fn();
        upsert = jest.fn();
        findUnique = jest.fn();
        const prisma = {
            trackedSymbol: { findMany, upsert, findUnique },
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

    describe("isActive", () => {
        it("returns true when the symbol exists and is active", async () => {
            findUnique.mockResolvedValue({ active: true });

            expect(await repository.isActive("AAPL")).toBe(true);
            expect(findUnique).toHaveBeenCalledWith({
                where: { symbol: "AAPL" },
                select: { active: true },
            });
        });

        it("returns false when the symbol is inactive", async () => {
            findUnique.mockResolvedValue({ active: false });

            expect(await repository.isActive("AAPL")).toBe(false);
        });

        it("returns false when the symbol does not exist", async () => {
            findUnique.mockResolvedValue(null);

            expect(await repository.isActive("NOPE")).toBe(false);
        });
    });
});
