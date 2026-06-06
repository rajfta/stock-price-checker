import { Module } from "@nestjs/common";
import { FinnhubModule } from "../finnhub/finnhub.module";
import { MovingAverageService } from "./moving-average.service";
import { PollerService } from "./poller.service";
import { StockPriceService } from "./stock-price.service";
import { TrackedSymbolService } from "./tracked-symbol.service";

@Module({
    imports: [FinnhubModule],
    providers: [
        PollerService,
        StockPriceService,
        TrackedSymbolService,
        MovingAverageService,
    ],
})
export class StockModule {}
