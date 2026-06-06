import { Module } from "@nestjs/common";
import { FinnhubModule } from "../finnhub/finnhub.module";
import { MovingAverageService } from "./moving-average.service";
import { PollerService } from "./poller.service";
import { StockController } from "./stock.controller";
import { StockPriceRepository } from "./stock-price.repository";
import { StockService } from "./stock.service";
import { TrackedSymbolRepository } from "./tracked-symbol.repository";

@Module({
    imports: [FinnhubModule],
    controllers: [StockController],
    providers: [
        StockService,
        PollerService,
        StockPriceRepository,
        TrackedSymbolRepository,
        MovingAverageService,
    ],
})
export class StockModule {}
