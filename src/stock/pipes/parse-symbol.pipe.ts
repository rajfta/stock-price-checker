import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseSymbolPipe implements PipeTransform<string, string> {
    transform(value: string): string {
        const symbol = (value ?? "").trim().toUpperCase();

        // Validate the symbol: 1-10 uppercase letters or dots.
        if (!/^[A-Z.]{1,10}$/.test(symbol)) {
            throw new BadRequestException(`Invalid stock symbol: "${value}"`);
        }

        return symbol;
    }
}
