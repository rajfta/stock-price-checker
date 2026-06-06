import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { FinnhubService } from "../finnhub/finnhub.service";
import { StockPriceRepository } from "./stock-price.repository";
import { TrackedSymbolRepository } from "./tracked-symbol.repository";

@Injectable()
export class PollerService {
    private readonly logger = new Logger(PollerService.name);

    constructor(
        private readonly trackedSymbols: TrackedSymbolRepository,
        private readonly finnhub: FinnhubService,
        private readonly stockPrices: StockPriceRepository,
    ) {}

    // ONE global cron over the active-symbols work list (the restart-safe
    // poller design). Registered on bootstrap via ScheduleModule.forRoot().
    @Cron(CronExpression.EVERY_MINUTE)
    async tick(): Promise<void> {
        const symbols = await this.trackedSymbols.getActiveSymbols();

        for (const symbol of symbols) {
            try {
                await this.pollSymbol(symbol);
            } catch (err) {
                // Per-symbol isolation: one failure must not abort the loop
                // or crash the cron. Log and keep going.
                this.logger.error(
                    `Poll failed for "${symbol}"`,
                    err instanceof Error ? err.stack : String(err),
                );
            }
        }
    }

    // Fetch + store one symbol. Reused by the cron above and by PUT's
    // immediate first poll.
    async pollSymbol(symbol: string): Promise<void> {
        const quote = await this.finnhub.getQuote(symbol);
        await this.stockPrices.record(
            symbol,
            quote.c,
            new Date(quote.t * 1000),
        );
    }
}
