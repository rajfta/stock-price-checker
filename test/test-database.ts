import { config } from "dotenv";

// Load .env so local runs inherit DATABASE_URL the same way the app does.
// In CI the variables are already in the environment; dotenv won't override
// them (override defaults to false), so this is a no-op there.
config();

const FALLBACK_URL =
    "postgresql://postgres:postgres@localhost:5432/stocks?schema=public";

// Integration tests run against a dedicated database so they never read or
// truncate development / production data.
export const TEST_DATABASE_NAME = "stocks_test";

export function baseDatabaseUrl(): string {
    return process.env.DATABASE_URL ?? FALLBACK_URL;
}

function withDatabaseName(connectionString: string, dbName: string): string {
    const url = new URL(connectionString);
    url.pathname = `/${dbName}`;
    return url.toString();
}

export function testDatabaseUrl(): string {
    return withDatabaseName(baseDatabaseUrl(), TEST_DATABASE_NAME);
}

// The maintenance database, used only to issue CREATE DATABASE for the test DB.
export function adminDatabaseUrl(): string {
    const url = new URL(baseDatabaseUrl());
    url.pathname = "/postgres";
    url.search = "";
    return url.toString();
}
