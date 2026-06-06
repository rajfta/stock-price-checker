import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
    );

    // Build the OpenAPI spec from the @Api* decorators and serve Swagger UI.
    const config = new DocumentBuilder()
        .setTitle("Stock Price Checker")
        .setDescription("Track stock symbols and compute moving averages.")
        .setVersion("1.0")
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);

    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
