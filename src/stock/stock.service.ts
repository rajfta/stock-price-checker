import { Injectable, NotFoundException } from "@nestjs/common";
import { MovingAverageService } from "./moving-average.service";
import { PollerService } from "./poller.service";
import { StockPriceService } from "./stock-price.service";
import { TrackedSymbolService } from "./tracked-symbol.service";

export interface StockSummary {
    symbol: string;
    price: number;
    lastUpdated: Date;
    movingAverage: number | null;
}

@Injectable()
export class StockService {
    constructor(
        private readonly poller: PollerService,
        private readonly trackedSymbols: TrackedSymbolService,
        private readonly stockPrices: StockPriceService,
        private readonly movingAverage: MovingAverageService,
    ) {}

    async startTracking(symbol: string): Promise<void> {
        await this.poller.pollSymbol(symbol); // Throws if invalid.
        await this.trackedSymbols.activate(symbol);
    }

    async getSummary(symbol: string): Promise<StockSummary> {
        const latest = await this.stockPrices.getLatest(symbol);
        if (!latest) {
            throw new NotFoundException(`No price data for symbol: ${symbol}`);
        }

        /// Get the last prices (including the latest, default=10) and calculate the moving average.
        const prices = await this.stockPrices.getLastPrices(symbol);
        const movingAverage = this.movingAverage.calculate(prices);

        return {
            symbol,
            price: latest.price,
            lastUpdated: latest.timestamp,
            movingAverage,
        };
    }
}
