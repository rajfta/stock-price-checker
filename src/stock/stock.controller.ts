import { Controller, Get, Param, Put } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from "@nestjs/swagger";
import { StockSummaryDto } from "./dto/stock-summary.dto";
import { ParseSymbolPipe } from "./pipes/parse-symbol.pipe";
import { StockService } from "./stock.service";

@ApiTags("stock")
@Controller("stock")
export class StockController {
    constructor(private readonly stock: StockService) {}

    @Get(":symbol")
    @ApiOperation({
        summary: "Current price, last-updated time, and moving average",
    })
    @ApiParam({
        name: "symbol",
        example: "AAPL",
        description: "The stock symbol to query.",
    })
    @ApiOkResponse({ type: StockSummaryDto })
    @ApiBadRequestResponse({ description: "Invalid stock symbol" })
    @ApiNotFoundResponse({ description: "No price data for the symbol" })
    getStock(
        @Param("symbol", ParseSymbolPipe) symbol: string,
    ): Promise<StockSummaryDto> {
        return this.stock.getSummary(symbol);
    }

    @Put(":symbol")
    @ApiOperation({ summary: "Start periodic price checks for a symbol" })
    @ApiParam({
        name: "symbol",
        example: "AAPL",
        description: "The stock symbol to track.",
    })
    @ApiOkResponse({ type: StockSummaryDto })
    @ApiBadRequestResponse({ description: "Invalid stock symbol" })
    @ApiNotFoundResponse({ description: "Unknown symbol (rejected upstream)" })
    async startTracking(
        @Param("symbol", ParseSymbolPipe) symbol: string,
    ): Promise<StockSummaryDto> {
        await this.stock.startTracking(symbol);
        return this.stock.getSummary(symbol);
    }
}
