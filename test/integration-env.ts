import { testDatabaseUrl } from "./test-database";

// Runs in each worker BEFORE the test module (and therefore before
// ConfigModule reads the environment), so the app connects to the dedicated
// test database rather than the real one.
if (process.env.NODE_ENV === "production") {
    throw new Error(
        "Refusing to run integration tests with NODE_ENV=production",
    );
}

process.env.DATABASE_URL = testDatabaseUrl();
