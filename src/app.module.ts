import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StockModule } from "./stock/stock.module";
import { validate } from "./config/env.validation";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate }),
        ScheduleModule.forRoot(),
        PrismaModule,
        StockModule,
        HealthModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
