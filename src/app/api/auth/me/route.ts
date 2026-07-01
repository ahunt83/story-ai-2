import { fail, ok } from "@/lib/api";
import { currentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await currentUser();
    return ok({
      user: user ? { id: user.id, email: user.email, displayName: user.displayName } : null
    });
  } catch (error) {
    return fail(error);
  }
}
