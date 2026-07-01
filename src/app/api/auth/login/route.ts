import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const [user] = await db.select().from(users).where(eq(users.email, input.email.trim().toLowerCase())).limit(1);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return ok({ error: "Invalid email or password" }, { status: 401 });
    }

    const session = await createSession(user.id);
    const response = ok({ user: publicUser(user) });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return fail(error);
  }
}

function publicUser(user: typeof users.$inferSelect) {
  return { id: user.id, email: user.email, displayName: user.displayName };
}
