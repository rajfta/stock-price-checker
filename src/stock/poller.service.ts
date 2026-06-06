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

    @Cron(CronExpression.EVERY_MINUTE)
    async tick(): Promise<void> {
        const symbols = await this.trackedSymbols.getActiveSymbols();

        // PERF NOTE: this is O(N) DB queries per tick — pollSymbol does one
        // getLatest (dedup) + one create per symbol. Fine for a handful of
        // symbols. To scale to many, collapse to O(1): add a
        // @@unique([symbol, timestamp]) constraint and batch with
        // createMany({ skipDuplicates: true }), dropping the per-symbol dedup
        // read entirely. (Finnhub HTTP stays N — its /quote is single-symbol.)
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

    async pollSymbol(symbol: string): Promise<void> {
        const quote = await this.finnhub.getQuote(symbol);
        const timestamp = new Date(quote.t * 1000);

        // Dedup: Finnhub returns a frozen quote when the market is closed.
        // Skip storing if the latest row already has this exact timestamp,
        // so the "last 10 prices" are distinct observations, not duplicates.
        const latest = await this.stockPrices.getLatest(symbol);
        if (latest && latest.timestamp.getTime() === timestamp.getTime()) {
            return;
        }

        await this.stockPrices.record(symbol, quote.c, timestamp);
    }
}
