import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariables } from "../config/env.validation";

export interface HealthStatus {
    status: "ok" | "error";
    env: string;
}

@Injectable()
export class HealthService {
    constructor(
        private readonly config: ConfigService<EnvironmentVariables, true>,
    ) {}

    check(): HealthStatus {
        return {
            status: "ok",
            env: this.config.get("NODE_ENV", { infer: true }),
        };
    }
}
