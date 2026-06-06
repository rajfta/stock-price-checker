import { plainToInstance } from "class-transformer";
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsString,
    IsUrl,
    Max,
    Min,
    validateSync,
} from "class-validator";

export enum Environment {
    Development = "development",
    Production = "production",
    Test = "test",
}

export class EnvironmentVariables {
    @IsEnum(Environment)
    NODE_ENV: Environment;

    @IsInt()
    @Min(1)
    @Max(65535)
    PORT: number;

    @IsString()
    @IsNotEmpty()
    FINNHUB_API_KEY: string;

    @IsUrl()
    FINNHUB_BASE_URL: string;

    @IsString()
    @IsNotEmpty()
    DATABASE_URL: string;
}

export function validate(
    config: Record<string, unknown>,
): EnvironmentVariables {
    const validated = plainToInstance(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validated, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        throw new Error(errors.toString());
    }

    return validated;
}
