import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { PrismaService } from "./../src/prisma/prisma.service";

describe("Health (e2e)", () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            // Stub the DB: /health never queries it, and the real Prisma 7
            // client can't start under Jest (its WASM compiler loads via a
            // dynamic import). This keeps the e2e on the HTTP layer.
            .overrideProvider(PrismaService)
            .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it("/health (GET) returns status ok", () => {
        return request(app.getHttpServer())
            .get("/health")
            .expect(200)
            .expect((res) => {
                expect(res.body).toMatchObject({ status: "ok" });
            });
    });

    afterEach(async () => {
        await app.close();
    });
});
