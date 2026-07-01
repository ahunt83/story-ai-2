import { readFile } from "node:fs/promises";
import { join } from "node:path";

import postgres from "postgres";

export default async function globalSetup() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    return;
  }

  assertSafeTestDatabase(testDatabaseUrl);

  const sql = postgres(testDatabaseUrl, { max: 1, prepare: false });

  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
    await sql.unsafe("CREATE EXTENSION IF NOT EXISTS vector");

    const migration = await readFile(join(process.cwd(), "drizzle", "0000_heavy_post.sql"), "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) {
        await sql.unsafe(trimmed);
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function assertSafeTestDatabase(databaseUrl: string) {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === databaseUrl) {
    throw new Error("TEST_DATABASE_URL must not match DATABASE_URL.");
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace("/", "");
  const hostIsLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  const databaseLooksIsolated = databaseName.toLowerCase().includes("test");

  if (!hostIsLocal || !databaseLooksIsolated) {
    throw new Error("Refusing to reset Playwright database because TEST_DATABASE_URL is not a local test database.");
  }
}
