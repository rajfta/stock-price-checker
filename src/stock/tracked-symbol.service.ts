import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TrackedSymbolService {
    constructor(private readonly prisma: PrismaService) {}

    async getActiveSymbols(): Promise<string[]> {
        const rows = await this.prisma.trackedSymbol.findMany({
            where: { active: true },
            select: { symbol: true },
        });

        return rows.map((row) => row.symbol);
    }
}
