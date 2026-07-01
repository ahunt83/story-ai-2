import { expect, test } from "@playwright/test";

test.describe("live workflow", () => {
  test.skip(!process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL or run npm run test:e2e:isolated for mutating workflow tests.");

  test("creates, drafts, revises, extracts, commits, and reads bible memory", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The full workflow is covered once on desktop.");

    const suffix = Date.now().toString(36);
    const title = `Playwright Memory Story ${suffix}`;

    await page.goto("/");
    await page.getByRole("button", { name: "Start a New Manuscript", exact: true }).first().click();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Initial Prompt").fill("A cartographer finds a room that redraws itself after every choice.");
    await page.getByLabel("Genre / Tone Notes").fill("Quiet speculative mystery with precise continuity.");
    await page.getByRole("button", { name: "Create Story" }).click();

    await expect(page).toHaveURL(/\/writing\?chapterId=/);
    await expect(page.getByRole("heading", { name: "Chapter 1", exact: true })).toBeVisible();

    await page.locator("aside").getByPlaceholder("Write the next scene. Focus on the mirror contradiction and keep the mood atmospheric.").fill("Draft a scene where Mara marks the changing wall map.");
    await page.locator("aside").getByRole("button", { name: "Generate Draft" }).click();
    await expect(page.getByLabel("Scene draft text")).toHaveValue(/The page waited/, { timeout: 15_000 });

    await page.getByRole("link", { name: "Drafts" }).click();
    await expect(page).toHaveURL(/\/writing\/co-writer\?chapterId=/);
    await page.locator("aside").getByPlaceholder("Make the last paragraph more tense and clarify Elena's voice.").fill("Make the discovery feel more deliberate and ominous.");
    await page.locator("aside").getByRole("button", { name: "Apply Revision" }).click();
    await expect(page.getByText(/Revision note applied locally/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Accept All" }).click();
    await expect(page.getByLabel("Scene draft text")).toHaveValue(/Revision note applied locally/, { timeout: 15_000 });

    await page.getByRole("link", { name: "Extract Memory" }).click();
    await expect(page).toHaveURL(/\/writing\/extraction\?chapterId=/);
    await page.getByRole("button", { name: "Run Extraction" }).click();
    await expect(page.getByText("Memory extracted and ready for review.")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Commit to Story Bible/ }).first().click();

    await expect(page).toHaveURL(/\/bible\?storyId=/);
    await expect(page.getByRole("heading", { name: "Continuity Explorer" })).toBeVisible();
    await expect(page.getByText("The approved chapter text is now canonical for this story.")).toBeVisible();
  });
});
