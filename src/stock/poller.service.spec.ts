import { Logger } from "@nestjs/common";
import { FinnhubService } from "../finnhub/finnhub.service";
import { PollerService } from "./poller.service";
import { StockPriceRepository } from "./stock-price.repository";
import { TrackedSymbolRepository } from "./tracked-symbol.repository";

describe("PollerService", () => {
    let poller: PollerService;
    let getActiveSymbols: jest.Mock;
    let getQuote: jest.Mock;
    let record: jest.Mock;
    let getLatest: jest.Mock;
    const mockQuote = { c: 307.34, t: 1780689600 };
    const mockDate = new Date(mockQuote.t * 1000);

    beforeEach(() => {
        getActiveSymbols = jest.fn();
        getQuote = jest.fn();
        record = jest.fn().mockResolvedValue(undefined);
        getLatest = jest.fn().mockResolvedValue(null); // no prior price

        poller = new PollerService(
            { getActiveSymbols } as unknown as TrackedSymbolRepository,
            { getQuote } as unknown as FinnhubService,
            { record, getLatest } as unknown as StockPriceRepository,
        );
    });

    it("fetches a quote and records the price with a converted timestamp", async () => {
        getQuote.mockResolvedValue(mockQuote);

        await poller.pollSymbol("AAPL");

        expect(getQuote).toHaveBeenCalledWith("AAPL");
        expect(record).toHaveBeenCalledWith("AAPL", 307.34, mockDate);
    });

    it("skips recording when the quote timestamp has not advanced", async () => {
        getQuote.mockResolvedValue(mockQuote);
        // The latest stored price has the SAME timestamp as the new quote.
        getLatest.mockResolvedValue({ price: 307.34, timestamp: mockDate });

        await poller.pollSymbol("AAPL");

        expect(record).not.toHaveBeenCalled();
    });

    it("records when the latest stored timestamp is older", async () => {
        getQuote.mockResolvedValue(mockQuote);
        getLatest.mockResolvedValue({
            price: 300,
            timestamp: new Date((mockQuote.t - 60) * 1000),
        });

        await poller.pollSymbol("AAPL");

        expect(record).toHaveBeenCalledWith("AAPL", 307.34, mockDate);
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
        expect(record).toHaveBeenCalledWith("TSLA", mockQuote.c, mockDate);
        expect(errorLog).toHaveBeenCalled();

        errorLog.mockRestore();
    });
});
