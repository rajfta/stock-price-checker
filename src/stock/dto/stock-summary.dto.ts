import { ApiProperty } from "@nestjs/swagger";

export class StockSummaryDto {
    @ApiProperty({ example: "AAPL", description: "The stock symbol." })
    symbol: string;

    @ApiProperty({
        example: 307.36,
        description: "The most recently stored price.",
    })
    price: number;

    @ApiProperty({
        example: "2026-06-05T20:00:00.000Z",
        description: "When the latest price was recorded.",
    })
    lastUpdated: Date;

    @ApiProperty({
        example: 305.12,
        nullable: true,
        description:
            "Mean of the last 10 prices max, or null if none exist yet.",
    })
    movingAverage: number | null;
}
