import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface PricePoint {
    price: number;
    timestamp: Date;
}

@Injectable()
export class StockPriceRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getRecent(symbol: string, limit = 10): Promise<PricePoint[]> {
        return this.prisma.stockPrice.findMany({
            where: { symbol },
            orderBy: { timestamp: "desc" },
            take: limit,
            select: { price: true, timestamp: true },
        });
    }

    // Single latest row — used by the poller's dedup check.
    async getLatest(symbol: string): Promise<PricePoint | null> {
        return this.prisma.stockPrice.findFirst({
            where: { symbol },
            orderBy: { timestamp: "desc" },
            select: { price: true, timestamp: true },
        });
    }

    async record(
        symbol: string,
        price: number,
        timestamp: Date,
    ): Promise<void> {
        await this.prisma.stockPrice.create({
            data: { symbol, price, timestamp },
        });
    }
}
