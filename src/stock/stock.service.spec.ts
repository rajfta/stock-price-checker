import { NotFoundException } from "@nestjs/common";
import { PollerService } from "./poller.service";
import { StockPriceService } from "./stock-price.service";
import { StockService } from "./stock.service";
import { TrackedSymbolService } from "./tracked-symbol.service";

describe("StockService", () => {
    let service: StockService;
    let pollSymbol: jest.Mock;
    let activate: jest.Mock;
    let getLatest: jest.Mock;
    let getLastPrices: jest.Mock;
    let calculate: jest.Mock;

    beforeEach(() => {
        pollSymbol = jest.fn().mockResolvedValue(undefined);
        activate = jest.fn().mockResolvedValue(undefined);
        getLatest = jest.fn();
        getLastPrices = jest.fn();
        calculate = jest.fn();

        service = new StockService(
            { pollSymbol } as unknown as PollerService,
            { activate } as unknown as TrackedSymbolService,
            { getLatest, getLastPrices } as unknown as StockPriceService,
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
