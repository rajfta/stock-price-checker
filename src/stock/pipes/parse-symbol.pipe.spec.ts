import { BadRequestException } from "@nestjs/common";
import { ParseSymbolPipe } from "./parse-symbol.pipe";

describe("ParseSymbolPipe", () => {
    let pipe: ParseSymbolPipe;

    beforeEach(() => {
        pipe = new ParseSymbolPipe();
    });

    it("uppercases and trims the symbol", () => {
        expect(pipe.transform("  aapl  ")).toBe("AAPL");
    });

    it("passes a valid symbol through unchanged", () => {
        expect(pipe.transform("TSLA")).toBe("TSLA");
    });

    it.each(["", "123", "WAYTOOLONGSYMBOL", "AA PL"])(
        "rejects invalid symbol %p",
        (value) => {
            expect(() => pipe.transform(value)).toThrow(BadRequestException);
        },
    );
});
