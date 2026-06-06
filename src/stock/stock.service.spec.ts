import { NotFoundException } from "@nestjs/common";
import { PollerService } from "./poller.service";
import { StockPriceRepository } from "./stock-price.repository";
import { StockService } from "./stock.service";
import { TrackedSymbolRepository } from "./tracked-symbol.repository";

describe("StockService", () => {
    let service: StockService;
    let pollSymbol: jest.Mock;
    let activate: jest.Mock;
    let isActive: jest.Mock;
    let getLatest: jest.Mock;
    let getLastPrices: jest.Mock;
    let calculate: jest.Mock;

    beforeEach(() => {
        pollSymbol = jest.fn().mockResolvedValue(undefined);
        activate = jest.fn().mockResolvedValue(undefined);
        isActive = jest.fn().mockResolvedValue(false);
        getLatest = jest.fn();
        getLastPrices = jest.fn();
        calculate = jest.fn();

        service = new StockService(
            { pollSymbol } as unknown as PollerService,
            { activate, isActive } as unknown as TrackedSymbolRepository,
            { getLatest, getLastPrices } as unknown as StockPriceRepository,
            { calculate },
        );
    });

    describe("startTracking", () => {
        it("polls the symbol first, then activates it", async () => {
            await service.startTracking("AAPL");

            expect(pollSymbol).toHaveBeenCalledWith("AAPL");
            expect(activate).toHaveBeenCalledWith("AAPL");
            // Poll must run BEFORE activate (don't track an invalid symbol).
            expect(pollSymbol.mock.invocationCallOrder[0]).toBeLessThan(
                activate.mock.invocationCallOrder[0],
            );
        });

        it("does nothing when the symbol is already active", async () => {
            isActive.mockResolvedValue(true);

            await service.startTracking("AAPL");

            expect(pollSymbol).not.toHaveBeenCalled();
            expect(activate).not.toHaveBeenCalled();
        });

        it("does not activate when the symbol is invalid (poll rejects)", async () => {
            pollSymbol.mockRejectedValue(new NotFoundException("nope"));

            await expect(service.startTracking("NOPE")).rejects.toThrow(
                NotFoundException,
            );
            expect(activate).not.toHaveBeenCalled();
        });
    });

    describe("getSummary", () => {
        it("assembles latest price, last-updated time, and moving average", async () => {
            const timestamp = new Date("2026-06-06T00:00:00.000Z");
            getLatest.mockResolvedValue({ price: 307.34, timestamp });
            getLastPrices.mockResolvedValue([300, 310]);
            calculate.mockReturnValue(305);

            const summary = await service.getSummary("AAPL");

            expect(summary).toEqual({
                symbol: "AAPL",
                price: 307.34,
                lastUpdated: timestamp,
                movingAverage: 305,
            });
            expect(calculate).toHaveBeenCalledWith([300, 310]);
        });

        it("throws NotFoundException when the symbol has no price data", async () => {
            getLatest.mockResolvedValue(null);

            await expect(service.getSummary("NOPE")).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
