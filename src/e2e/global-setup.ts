import { scrypt as nodeScrypt } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import postgres from "postgres";

const scrypt = promisify(nodeScrypt);
export const testEmail = "playwright@example.com";
export const testPassword = "playwright-password";

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

    const migrationDir = join(process.cwd(), "drizzle");
    const migrations = (await readdir(migrationDir))
      .filter((file) => /^\d+_.*\.sql$/.test(file))
      .sort();

    for (const file of migrations) {
      const migration = await readFile(join(migrationDir, file), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) {
        const trimmed = statement.trim();
        if (trimmed) {
          await sql.unsafe(trimmed);
        }
      }
    }

    await sql`
      insert into users (id, email, display_name, password_hash)
      values ('user_playwright', ${testEmail}, 'Playwright User', ${await hashTestPassword(testPassword)})
      on conflict (email) do nothing
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function hashTestPassword(password: string) {
  const salt = "playwright-test-salt";
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString("base64url")}`;
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
