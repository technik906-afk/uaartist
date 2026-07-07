import { expect, test } from "@playwright/test";

/**
 * Золотой путь гостя: каталог → товар → корзина → чекаут → заказ → оплата.
 * Доставка считается живыми API (СДЭК) — нужен интернет; переход на ЮKassa
 * перехватывается заглушкой, чтобы не гонять тест по внешнему сайту.
 */
test("гость оформляет заказ с доставкой в ПВЗ СДЭК", async ({ page }) => {
  await page.route(/yoomoney\.ru|yookassa\.ru/, (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>payment-stub</h1>" })
  );

  // Каталог → первая карточка товара
  await page.goto("/catalog");
  const card = page.locator('a[href^="/product/"]').first();
  await expect(card).toBeVisible();
  await card.click();

  // Карточка: цена видна, кладём в корзину
  await expect(page).toHaveURL(/\/product\//);
  await page.getByRole("button", { name: "В корзину" }).click();
  await expect(page.getByRole("button", { name: /Добавлено/ })).toBeVisible();

  // Корзина → чекаут
  await page.goto("/cart");
  await page.getByRole("link", { name: "Оформить заказ" }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // Контакты
  await page.getByPlaceholder("Имя").fill("E2E Тестов");
  await page.getByPlaceholder("Телефон").fill("+79990001122");
  await page.getByPlaceholder("Email", { exact: true }).fill("e2e@uaartist.test");

  // Город: ввод → подсказка СДЭК → выбор
  await page.getByPlaceholder("Город").fill("Москва");
  await page
    .getByRole("button", { name: /^Москва/ })
    .first()
    .click();

  // Живой расчёт тарифов: ждём радио способа (щедрый таймаут на внешние API)
  const pvzRadio = page.getByRole("radio", { name: /пункт выдачи/ });
  await expect(pvzRadio).toBeVisible({ timeout: 20_000 });
  await pvzRadio.check();

  // ПВЗ: options подгружаются асинхронно и «невидимы» в закрытом select —
  // ждём появления в DOM (известная грабля), затем выбираем первый пункт
  const pvzSelect = page.locator("select");
  await expect(pvzSelect.locator("option").nth(1)).toBeAttached({ timeout: 20_000 });
  await pvzSelect.selectOption({ index: 1 });

  // Итог показан, кнопка активна — отправляем
  const submit = page.getByRole("button", { name: /Подтвердить заказ/ });
  await expect(submit).toBeEnabled();
  await submit.click();

  // Успех = редирект на оплату (заглушка) или на «Спасибо» (оплата выключена)
  await page.waitForURL(/yoomoney\.ru|yookassa\.ru|\/thank-you/, { timeout: 20_000 });
});

test("пустая корзина ведёт в каталог", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Корзина пуста")).toBeVisible();
  await page.getByRole("link", { name: "В каталог" }).click();
  await expect(page).toHaveURL(/\/catalog/);
});
