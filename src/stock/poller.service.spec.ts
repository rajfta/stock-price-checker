import { Logger } from "@nestjs/common";
import { FinnhubService } from "../finnhub/finnhub.service";
import { PollerService } from "./poller.service";
import { StockPriceService } from "./stock-price.service";
import { TrackedSymbolService } from "./tracked-symbol.service";

describe("PollerService", () => {
    let poller: PollerService;
    let getActiveSymbols: jest.Mock;
    let getQuote: jest.Mock;
    let record: jest.Mock;
    const mockQuote = { c: 307.34, t: 1780689600 };

    beforeEach(() => {
        getActiveSymbols = jest.fn();
        getQuote = jest.fn();
        record = jest.fn().mockResolvedValue(undefined);

        poller = new PollerService(
            { getActiveSymbols } as unknown as TrackedSymbolService,
            { getQuote } as unknown as FinnhubService,
            { record } as unknown as StockPriceService,
        );
    });

    it("fetches a quote and records the price with a converted timestamp", async () => {
        getQuote.mockResolvedValue(mockQuote);

        await poller.pollSymbol("AAPL");

        expect(getQuote).toHaveBeenCalledWith("AAPL");
        expect(record).toHaveBeenCalledWith(
            "AAPL",
            307.34,
            new Date(1780689600 * 1000),
        );
    });

    it("polls every active symbol on a tick", async () => {
        getActiveSymbols.mockResolvedValue(["AAPL", "TSLA"]);
        getQuote.mockResolvedValue(mockQuote);

        await poller.tick();

        expect(getQuote).toHaveBeenCalledWith("AAPL");
        expect(getQuote).toHaveBeenCalledWith("TSLA");
        expect(record).toHaveBeenCalledTimes(2);
    });

    it("isolates failures: one bad symbol does not stop the others", async () => {
        const errorLog = jest
            .spyOn(Logger.prototype, "error")
            .mockImplementation();
        getActiveSymbols.mockResolvedValue(["BAD", "TSLA"]);
        getQuote.mockImplementation((symbol: string) =>
            symbol === "BAD"
                ? Promise.reject(new Error("boom"))
                : Promise.resolve(mockQuote),
        );

        await expect(poller.tick()).resolves.toBeUndefined();

        expect(record).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalledWith(
            "TSLA",
            mockQuote.c,
            new Date(mockQuote.t * 1000),
        );
        expect(errorLog).toHaveBeenCalled();

        errorLog.mockRestore();
    });
});
