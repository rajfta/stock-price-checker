import { HttpService } from "@nestjs/axios";
import {
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { of, throwError } from "rxjs";
import { FinnhubQuote, FinnhubService } from "./finnhub.service";

describe("FinnhubService", () => {
    let service: FinnhubService;
    let httpService: { get: jest.Mock };

    // Real quote from Finnhub
    const quote: FinnhubQuote = {
        c: 307.34,
        d: -3.89,
        dp: -1.25,
        h: 315.17,
        l: 307.15,
        o: 312.86,
        pc: 311.23,
        t: 1780689600,
    };

    beforeEach(async () => {
        httpService = { get: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FinnhubService,
                { provide: HttpService, useValue: httpService },
                { provide: ConfigService, useValue: { get: () => "test" } },
            ],
        }).compile();

        service = module.get(FinnhubService);
    });

    it("returns the quote for a valid symbol", async () => {
        httpService.get.mockReturnValue(of({ data: quote }));
        await expect(service.getQuote("AAPL")).resolves.toEqual(quote);
        expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it("throws NotFoundException for an unknown symbol (all-zero, t=0)", async () => {
        httpService.get.mockReturnValue(
            of({ data: { ...quote, c: 0, d: null, dp: null, t: 0 } }),
        );

        await expect(service.getQuote("NOPE")).rejects.toThrow(
            NotFoundException,
        );
    });

    it("maps an API failure to ServiceUnavailableException after retrying", async () => {
        const errorLog = jest
            .spyOn(Logger.prototype, "error")
            .mockImplementation();

        let attempts = 0;
        httpService.get.mockReturnValue(
            throwError(() => {
                attempts += 1;
                return new Error("network down");
            }),
        );

        await expect(service.getQuote("AAPL")).rejects.toThrow(
            ServiceUnavailableException,
        );
        expect(attempts).toBe(3);
        expect(errorLog).toHaveBeenCalledTimes(1);

        errorLog.mockRestore();
    });
});
