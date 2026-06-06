import { execSync } from "node:child_process";
import { Client } from "pg";
import {
    adminDatabaseUrl,
    TEST_DATABASE_NAME,
    testDatabaseUrl,
} from "./test-database";

// Jest globalSetup: create the dedicated test database (if absent) and bring
// it up to date with the Prisma migrations once, before any test runs.
export default async function globalSetup(): Promise<void> {
    const admin = new Client({ connectionString: adminDatabaseUrl() });
    await admin.connect();
    try {
        const existing = await admin.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [TEST_DATABASE_NAME],
        );
        if (existing.rowCount === 0) {
            await admin.query(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);
        }
    } finally {
        await admin.end();
    }

    execSync("npx prisma migrate deploy", {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    });
}
