import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { stories, users } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { createSession, getUserCount, hashPassword, setSessionCookie } from "@/lib/auth";
import { createId } from "@/lib/ids";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).optional()
});

export async function POST(request: Request) {
  try {
    const input = signupSchema.parse(await request.json());
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingUserCount = await getUserCount();

    if (existingUserCount > 0) {
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (!existing) {
        throw new Error("Signup is closed after the first local user is created.");
      }
    }

    const [created] = await db
      .insert(users)
      .values({
        id: createId("user"),
        email: normalizedEmail,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password)
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      throw new Error("An account with that email already exists.");
    }

    if (existingUserCount === 0) {
      await db.update(stories).set({ ownerUserId: created.id, updatedAt: new Date() });
    }

    const session = await createSession(created.id);
    const response = ok({ user: publicUser(created) }, { status: 201 });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return fail(error);
  }
}

function publicUser(user: typeof users.$inferSelect) {
  return { id: user.id, email: user.email, displayName: user.displayName };
}
