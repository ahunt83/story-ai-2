import { fail, ok } from "@/lib/api";
import { clearSessionCookie, destroyCurrentSession } from "@/lib/auth";

export async function POST() {
  try {
    await destroyCurrentSession();
    const response = ok({ success: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return fail(error);
  }
}
