import { scrypt as nodeScrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { createId } from "@/lib/ids";

const scrypt = promisify(nodeScrypt);
const sessionCookieName = "story_ai_session";
const sessionDays = 30;

export type AuthUser = typeof users.$inferSelect;

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [scheme, salt, storedKey] = passwordHash.split(":");
  if (scheme !== "scrypt" || !salt || !storedKey) {
    return false;
  }

  const key = await scrypt(password, salt, 64) as Buffer;
  const stored = Buffer.from(storedKey, "base64url");
  return stored.length === key.length && timingSafeEqual(stored, key);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export async function getUserCount() {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return row?.count ?? 0;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: createId("session"),
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt
  });

  return { token, expiresAt };
}

export async function currentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) {
    return null;
  }

  const [row] = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return row?.user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

export async function destroyCurrentSession() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) {
    return;
  }

  await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date) {
  response.headers.append(
    "Set-Cookie",
    `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}

export function clearSessionCookie(response: Response) {
  response.headers.append(
    "Set-Cookie",
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}
