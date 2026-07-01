import { expect, test } from "@playwright/test";

test.describe("designed screen smoke tests", () => {
  test("library dashboard renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await expect(page.getByText("Your manuscripts")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start a New Manuscript", exact: true })).toBeVisible();
  });

  test("writing screen renders manuscript and context", async ({ page }) => {
    await page.goto("/writing");
    await expect(page.getByRole("heading", { name: "Chapter 4", exact: true })).toBeVisible();
    await expect(page.getByText("The Shattered Mirror")).toBeVisible();
    await expect(page.getByText("Continuity Context")).toBeVisible();
  });

  test("co-writer screen renders revision UI", async ({ page }) => {
    await page.goto("/writing/co-writer");
    await expect(page.getByText("AI Draft in progress")).toBeVisible();
    await expect(page.getByPlaceholder("Command: Rewrite the last paragraph...")).toBeVisible();
  });

  test("memory approval screen renders extracted sections", async ({ page }) => {
    await page.goto("/writing/extraction");
    await expect(page.getByText("Continuity Extraction")).toBeVisible();
    await expect(page.getByText("Chapter Summaries")).toBeVisible();
    await expect(page.getByText("Commit to Story Bible").first()).toBeVisible();
  });

  test("story bible explorer renders", async ({ page }) => {
    await page.goto("/bible");
    await expect(page.getByText("Continuity Explorer")).toBeVisible();
    await expect(page.getByText("Canonical Facts")).toBeVisible();
  });
});
