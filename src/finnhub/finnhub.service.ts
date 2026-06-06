import { HttpService } from "@nestjs/axios";
import {
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { catchError, firstValueFrom, retry, throwError, timeout } from "rxjs";
import { EnvironmentVariables } from "../config/env.validation";

export interface FinnhubQuote {
    c: number; // Current price
    d: number | null;
    dp: number | null;
    h: number;
    l: number;
    o: number;
    pc: number;
    t: number; // Timestamp
}

@Injectable()
export class FinnhubService {
    private readonly logger = new Logger(FinnhubService.name);

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService<EnvironmentVariables, true>,
    ) {}

    async getQuote(symbol: string): Promise<FinnhubQuote> {
        const baseUrl = this.config.get("FINNHUB_BASE_URL", { infer: true });
        const token = this.config.get("FINNHUB_API_KEY", { infer: true });

        const { data } = await firstValueFrom(
            this.http
                .get<FinnhubQuote>(`${baseUrl}/quote`, {
                    params: { symbol, token },
                })
                .pipe(
                    timeout({ each: 5000 }),
                    retry({ count: 2, delay: 500 }),
                    catchError((err: unknown) => {
                        this.logger.error(
                            `Finnhub request failed for "${symbol}"`,
                            err instanceof Error ? err.stack : String(err),
                        );
                        return throwError(
                            () =>
                                new ServiceUnavailableException(
                                    "Upstream price provider unavailable",
                                ),
                        );
                    }),
                ),
        );

        // A valid HTTP 200 with a zero timestamp = Finnhub's "unknown symbol".
        if (data.t === 0) {
            throw new NotFoundException(`Unknown stock symbol: ${symbol}`);
        }

        return data;
    }
}
