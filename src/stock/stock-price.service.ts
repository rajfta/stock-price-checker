import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StockPriceService {
    constructor(private readonly prisma: PrismaService) {}

    async getLastPrices(symbol: string, limit = 10): Promise<number[]> {
        const rows = await this.prisma.stockPrice.findMany({
            where: { symbol },
            orderBy: { timestamp: "desc" },
            take: limit,
            select: { price: true },
        });

        return rows.map((row) => row.price);
    }

    async getLatest(
        symbol: string,
    ): Promise<{ price: number; timestamp: Date } | null> {
        const row = await this.prisma.stockPrice.findFirst({
            where: { symbol },
            orderBy: { timestamp: "desc" },
            select: { price: true, timestamp: true },
        });

        if (!row) {
            return null;
        }

        return { price: row.price, timestamp: row.timestamp };
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
