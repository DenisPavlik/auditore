import { expect, test } from "@playwright/test";

// The guest walks every step up to the confirmation, and stops there: nothing is booked.
test("a couple picks a day, an hour and a table for two, and reaches the form", async ({ page, isMobile }) => {
  await page.goto("/prenota");
  const days = page.getByRole("listbox", { name: "Day" });
  await days.getByRole("option").and(page.locator(":enabled")).nth(2).click();

  // Two guests is the default; the plan should never offer them a table for four.
  const firstTime = page.getByRole("button", { name: /^\d\d:\d\d, \d+ tables? free/ }).first();
  await firstTime.click();

  if (isMobile) {
    // On a phone each room has its own tab, and the room is drawn up close.
    await expect(page.getByRole("tab", { name: /^Sala/ })).toBeVisible();
  }
  const plan = page.getByRole("group", { name: isMobile ? /^La Sala/ : "Floor plan of the house" });
  await expect(plan.locator('[data-state="free"]').first()).toBeVisible();
  for (const label of await plan.locator('[data-state="free"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""))) {
    expect(label).toMatch(/seats 1 to 2/);
  }

  await page.getByRole("button", { name: "Let La Volpe choose" }).click();
  await expect(page.getByRole("button", { name: "Conferma" })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
});

test("a closed Monday cannot be picked", async ({ page }) => {
  await page.goto("/prenota");
  const monday = page.getByRole("listbox", { name: "Day" }).getByRole("option").filter({ hasText: "chiuso" }).first();
  await expect(monday).toBeDisabled();
});
