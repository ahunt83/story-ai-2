import { describe, expect, it } from "vitest";

import { hashPassword, hashSessionToken, verifyPassword } from "./auth";

describe("auth helpers", () => {
  it("hashes and verifies passwords with scrypt", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).toMatch(/^scrypt:/);
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("hashes session tokens deterministically without exposing the token", () => {
    const token = "session-token";

    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toContain(token);
  });
});
