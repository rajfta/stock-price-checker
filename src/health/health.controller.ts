import { Controller, Get } from "@nestjs/common";
import { HealthService, type HealthStatus } from "./health.service";

@Controller("health")
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    getCheck(): HealthStatus {
        return this.healthService.check();
    }
}
