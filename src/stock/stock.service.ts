import { Injectable, NotFoundException } from "@nestjs/common";
import { StockSummaryDto } from "./dto/stock-summary.dto";
import { MovingAverageService } from "./moving-average.service";
import { PollerService } from "./poller.service";
import { StockPriceRepository } from "./stock-price.repository";
import { TrackedSymbolRepository } from "./tracked-symbol.repository";

@Injectable()
export class StockService {
    constructor(
        private readonly poller: PollerService,
        private readonly trackedSymbols: TrackedSymbolRepository,
        private readonly stockPrices: StockPriceRepository,
        private readonly movingAverage: MovingAverageService,
    ) {}

    async startTracking(symbol: string): Promise<void> {
        if (await this.trackedSymbols.isActive(symbol)) {
            return;
        }

        await this.poller.pollSymbol(symbol); // Throws if invalid.
        await this.trackedSymbols.activate(symbol);
    }

    async getSummary(symbol: string): Promise<StockSummaryDto> {
        const latest = await this.stockPrices.getLatest(symbol);
        if (!latest) {
            throw new NotFoundException(`No price data for symbol: ${symbol}`);
        }

        // Get the last prices (default 10) and compute the moving average.
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
