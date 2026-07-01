import { expect, test } from "@playwright/test";

test.describe("designed screen smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("library dashboard renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await expect(page.getByText("Your manuscripts")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start a New Manuscript", exact: true })).toBeVisible();
  });

  test("writing screen renders manuscript and context", async ({ page }, testInfo) => {
    await page.goto("/writing");
    await expect(page.getByRole("heading", { name: "Chapter 4", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Open a live manuscript" })).toBeVisible();
    if (testInfo.project.name === "desktop") {
      await expect(page.getByText("Continuity Context")).toBeVisible();
    }
  });

  test("co-writer screen renders revision UI", async ({ page }, testInfo) => {
    await page.goto("/writing/co-writer");
    if (testInfo.project.name === "desktop") {
      await expect(page.getByRole("heading", { name: "AI Co-writer" })).toBeVisible();
      await expect(page.getByPlaceholder("Command: Rewrite the last paragraph...")).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: "Chapter 4", exact: true })).toBeVisible();
    }
  });

  test("memory approval screen renders extracted sections", async ({ page }) => {
    await page.goto("/writing/extraction");
    await expect(page.getByText("Continuity Extraction")).toBeVisible();
    await expect(page.getByText("No Memory Extracted")).toBeVisible();
    await expect(page.getByText("Run extraction to create reviewable continuity memory")).toBeVisible();
    await expect(page.getByText("Commit to Story Bible").first()).toBeVisible();
  });

  test("story bible explorer renders", async ({ page }, testInfo) => {
    await page.goto("/bible");
    await expect(page.getByText("Continuity Explorer")).toBeVisible();
    if (testInfo.project.name === "desktop") {
      await expect(page.getByRole("heading", { name: "Create a manuscript to build a Story Bible" })).toBeVisible();
    }
  });
});

async function login(page: import("@playwright/test").Page) {
  for (const credentials of [
    { email: "playwright@example.com", password: "playwright-password" },
    { email: "local@example.com", password: "local-password-123" }
  ]) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(credentials.email);
    await page.getByLabel("Password").fill(credentials.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForLoadState("networkidle").catch(() => undefined);
    if (page.url().endsWith("/")) {
      return;
    }
  }

  await page.goto("/signup");
  await page.getByLabel("Email").fill("playwright@example.com");
  await page.getByLabel("Password").fill("playwright-password");
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  if (page.url().endsWith("/")) {
    return;
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill("playwright@example.com");
  await page.getByLabel("Password").fill("playwright-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}
