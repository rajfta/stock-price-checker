import { Module } from "@nestjs/common";
import { FinnhubModule } from "../finnhub/finnhub.module";
import { MovingAverageService } from "./moving-average.service";
import { PollerService } from "./poller.service";
import { StockController } from "./stock.controller";
import { StockPriceService } from "./stock-price.service";
import { StockService } from "./stock.service";
import { TrackedSymbolService } from "./tracked-symbol.service";

@Module({
    imports: [FinnhubModule],
    controllers: [StockController],
    providers: [
        StockService,
        PollerService,
        StockPriceService,
        TrackedSymbolService,
        MovingAverageService,
    ],
})
export class StockModule {}
