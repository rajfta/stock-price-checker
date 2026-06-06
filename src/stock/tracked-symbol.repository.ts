import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TrackedSymbolRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getActiveSymbols(): Promise<string[]> {
        const rows = await this.prisma.trackedSymbol.findMany({
            where: { active: true },
            select: { symbol: true },
        });

        return rows.map((row) => row.symbol);
    }

    async activate(symbol: string): Promise<void> {
        await this.prisma.trackedSymbol.upsert({
            where: { symbol },
            update: { active: true },
            create: { symbol, active: true },
        });
    }

    async isActive(symbol: string): Promise<boolean> {
        const row = await this.prisma.trackedSymbol.findUnique({
            where: { symbol },
            select: { active: true },
        });

        return row?.active === true;
    }
}
