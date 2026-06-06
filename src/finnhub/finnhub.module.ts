import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { FinnhubService } from "./finnhub.service";

@Module({
    imports: [HttpModule],
    providers: [FinnhubService],
    exports: [FinnhubService],
})
export class FinnhubModule {}
