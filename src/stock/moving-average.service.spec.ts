import { MovingAverageService } from "./moving-average.service";

describe("MovingAverageService", () => {
    let service: MovingAverageService;

    beforeEach(() => {
        service = new MovingAverageService();
    });

    it("returns the arithmetic mean of the given prices", () => {
        expect(service.calculate([100, 200, 300])).toBe(200);
    });

    it("returns null when there are no prices (avoids divide-by-zero)", () => {
        expect(service.calculate([])).toBeNull();
    });

    it("rounds the average to 2 decimals", () => {
        expect(service.calculate([10, 11, 13])).toBe(11.33);
    });
});
