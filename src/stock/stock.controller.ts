import { Controller, Get, Param, Put } from "@nestjs/common";
import { ParseSymbolPipe } from "./pipes/parse-symbol.pipe";
import { StockService, StockSummary } from "./stock.service";

@Controller("stock")
export class StockController {
    constructor(private readonly stock: StockService) {}

    @Get(":symbol")
    getStock(
        @Param("symbol", ParseSymbolPipe) symbol: string,
    ): Promise<StockSummary> {
        return this.stock.getSummary(symbol);
    }

    @Put(":symbol")
    async startTracking(
        @Param("symbol", ParseSymbolPipe) symbol: string,
    ): Promise<StockSummary> {
        await this.stock.startTracking(symbol);
        return this.stock.getSummary(symbol);
    }
}
