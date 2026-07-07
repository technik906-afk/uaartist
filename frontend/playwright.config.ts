import { defineConfig, devices } from "@playwright/test";

/**
 * E2E против локального dev-стека:
 *   - backend: docker compose up (Django на :8000, БД засеяна seed_demo)
 *   - frontend: next dev на :3000 (поднимет webServer, если не запущен)
 * Доставка считается ЖИВЫМИ API СДЭК/Почты — тесты требуют интернета;
 * переход на оплату ЮKassa перехватывается заглушкой в самом тесте.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1, // общий сток товаров в БД — параллельные заказы дерутся за остатки
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ru-RU",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
