import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    // whitelist: strip properties not in the DTO; transform: coerce payloads
    // into DTO instances (and run @Transform). Standard request hygiene.
    app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
