import { expect, test } from "@playwright/test";

/** Конструктор: опции из БД, смена размера меняет цену, кастом попадает в корзину. */
test("кастомная косметичка добавляется в корзину", async ({ page }) => {
  await page.goto("/custom");

  // Опции загрузились из API
  const sizeButton = page.getByRole("button", { name: /Макси/ });
  await expect(sizeButton).toBeVisible({ timeout: 15_000 });

  // Цена в кнопке «В корзину» меняется при смене размера
  const addButton = page.getByRole("button", { name: /^В корзину/ });
  const priceBefore = await addButton.textContent();
  await sizeButton.click();
  await expect(addButton).not.toHaveText(priceBefore ?? "", { timeout: 5_000 });

  // Цвет ткани — свотчи с aria-label
  await page.getByRole("button", { name: "Бежевый" }).click();

  await addButton.click();
  await expect(page.getByRole("button", { name: /Добавлено в корзину/ })).toBeVisible();

  // В корзине лежит индивидуальный пошив (Макси — выбранный размер)
  await page.goto("/cart");
  await expect(page.getByText(/Косметичка «Макси».*индивидуальный пошив/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Оформить заказ" })).toBeVisible();
});
