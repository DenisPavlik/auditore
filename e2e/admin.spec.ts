import { expect, test } from "@playwright/test";

test("the back office is locked, and the demo key opens it to look", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/accedi$/);
  await page.getByRole("button", { name: "Look around as a guest" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Demo · read only")).toBeVisible();
});

test("the demo sees the evening's timeline but cannot change a booking", async ({ page }) => {
  await page.goto("/admin/accedi");
  await page.getByRole("button", { name: "Look around as a guest" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("covers", { exact: true })).toBeVisible();

  const strip = page.locator("button[title]").first();
  await strip.click();
  const card = page.locator("aside");
  await expect(card).toBeVisible();
  const action = card.getByRole("button", { name: /^(Seated|Left|Still here|Restore)$/ }).first();
  await action.click();
  await expect(card.getByText("The demo can look around, but not write in the book.")).toBeVisible();
});

test("every room of the back office opens for the demo", async ({ page }) => {
  await page.goto("/admin/accedi");
  await page.getByRole("button", { name: "Look around as a guest" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const [name, heading] of [
    ["Chiusure", "Days off and closed rooms"],
    ["Carta", "The menu, as the guests read it"],
    ["Galleria", "The pictures on the wall"],
  ]) {
    await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});
