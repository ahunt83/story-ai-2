import { z } from "zod";

import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { themePreferences } from "@/lib/theme";
import { ensureUserPreferences, updateUserPreferences } from "@/lib/user-preferences";

const updatePreferenceSchema = z.object({
  themePreference: z.enum(themePreferences).optional(),
  nsfwMode: z.boolean().optional()
}).refine((input) => input.themePreference !== undefined || input.nsfwMode !== undefined, {
  message: "At least one preference must be provided."
});

export async function GET() {
  try {
    const user = await requireUser();
    const preference = await ensureUserPreferences(user.id);
    return ok({ userPreferences: preference });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = updatePreferenceSchema.parse(await request.json());
    const preference = await updateUserPreferences(user.id, input);

    return ok({ userPreferences: preference });
  } catch (error) {
    return fail(error);
  }
}
