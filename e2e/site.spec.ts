import { expect, test } from "@playwright/test";

test("the home page turns with the seasons", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const seasons = page.getByRole("radiogroup", { name: "Season" });
  await seasons.getByRole("radio", { name: /^Winter/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-season", "winter");
  await seasons.getByRole("radio", { name: /^Summer/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-season", "summer");
});

test("the menu reads chapter by chapter, with prices", async ({ page }) => {
  await page.goto("/menu");
  for (const chapter of ["Antipasti", "Primi", "Secondi", "Dolci", "Vini"]) {
    await expect(page.getByRole("heading", { name: chapter, exact: true })).toBeVisible();
  }
  await expect(page.getByText(/€\d+/).first()).toBeVisible();
});

test("a picture in the gallery opens and steps to the next", async ({ page }) => {
  await page.goto("/galleria");
  await page.getByRole("button", { name: /^Open / }).first().click();
  const lightbox = page.getByRole("dialog");
  await expect(lightbox).toBeVisible();
  const first = await lightbox.getAttribute("aria-label");
  await page.keyboard.press("ArrowRight");
  await expect(lightbox).not.toHaveAttribute("aria-label", first ?? "");
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
});

test("an unknown address is a 404 with the cat", async ({ page }) => {
  const response = await page.goto("/una-pagina-che-non-esiste");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No table by that name." })).toBeVisible();
  await page.getByRole("link", { name: "Back to the door" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("search engines get a sitemap, robots and a share card", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/prenota");
  const card = await request.get("/opengraph-image");
  expect(card.headers()["content-type"]).toContain("image/png");
});
