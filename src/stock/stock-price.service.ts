import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StockPriceService {
    constructor(private readonly prisma: PrismaService) {}

    // The data feed for the moving average: the most recent `limit` prices
    // for a symbol. Order doesn't affect the mean, but "desc" makes the
    // intent ("last 10") explicit.
    async getLastPrices(symbol: string, limit = 10): Promise<number[]> {
        const rows = await this.prisma.stockPrice.findMany({
            where: { symbol },
            orderBy: { timestamp: "desc" },
            take: limit,
            select: { price: true },
        });

        return rows.map((row) => row.price);
    }
}
