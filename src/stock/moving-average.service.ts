import { Injectable } from "@nestjs/common";

@Injectable()
export class MovingAverageService {
    calculate(prices: number[]): number | null {
        if (prices.length === 0) {
            return null;
        }

        return parseFloat(
            (
                prices.reduce((sum, price) => sum + price, 0) / prices.length
            ).toFixed(2),
        );
    }
}
