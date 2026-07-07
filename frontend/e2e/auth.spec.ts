import { expect, test, type APIRequestContext } from "@playwright/test";

const API = "http://localhost:8000/api/v1";
const PASSWORD = "E2e-Passw0rd!73";

function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}@uaartist.test`;
}

async function registerViaApi(request: APIRequestContext, email: string) {
  const response = await request.post(`${API}/auth/register/`, {
    data: {
      email,
      password: PASSWORD,
      name: "E2E Аккаунтов",
      phone: "+79990002233",
      consent: true,
    },
  });
  expect(response.ok()).toBeTruthy();
}

test("регистрация через форму ведёт в личный кабинет", async ({ page }) => {
  await page.goto("/register");

  await page.getByPlaceholder("Имя").fill("E2E Регистратов");
  await page.getByPlaceholder("Телефон").fill("+79990003344");
  await page.getByPlaceholder("Email", { exact: true }).fill(uniqueEmail("reg"));
  await page.getByPlaceholder("Пароль", { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder("Подтвердите пароль").fill(PASSWORD);

  // Согласие 152-ФЗ обязательно — кнопка активируется только после чекбокса
  const submit = page.getByRole("button", { name: "Зарегистрироваться" });
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox").check();

  await submit.click();
  await page.waitForURL(/\/account/);
});

test("логин существующим пользователем", async ({ page, request }) => {
  const email = uniqueEmail("login");
  await registerViaApi(request, email);

  await page.goto("/login");
  await page.getByPlaceholder("Email", { exact: true }).fill(email);
  await page.getByPlaceholder("Пароль", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();

  await page.waitForURL(/\/account/);
});

test("логин с неверным паролем показывает ошибку и не пускает", async ({ page, request }) => {
  const email = uniqueEmail("badpass");
  await registerViaApi(request, email);

  await page.goto("/login");
  await page.getByPlaceholder("Email", { exact: true }).fill(email);
  await page.getByPlaceholder("Пароль", { exact: true }).fill("неверный-пароль-123");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).not.toHaveURL(/\/account/);
  await expect(page.getByRole("alert").or(page.getByText(/невер|ошибк/i))).toBeVisible();
});
