import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { FinnhubService } from "../finnhub/finnhub.service";
import { StockPriceService } from "./stock-price.service";
import { TrackedSymbolService } from "./tracked-symbol.service";

@Injectable()
export class PollerService {
    private readonly logger = new Logger(PollerService.name);

    constructor(
        private readonly trackedSymbols: TrackedSymbolService,
        private readonly finnhub: FinnhubService,
        private readonly stockPrices: StockPriceService,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async tick(): Promise<void> {
        const symbols = await this.trackedSymbols.getActiveSymbols();

        for (const symbol of symbols) {
            try {
                await this.pollSymbol(symbol);
            } catch (err) {
                this.logger.error(
                    `Poll failed for "${symbol}"`,
                    err instanceof Error ? err.stack : String(err),
                );
            }
        }
    }

    async pollSymbol(symbol: string): Promise<void> {
        const quote = await this.finnhub.getQuote(symbol);
        await this.stockPrices.record(
            symbol,
            quote.c,
            new Date(quote.t * 1000),
        );
    }
}
