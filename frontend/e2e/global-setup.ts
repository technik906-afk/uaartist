import { execSync } from "node:child_process";

/**
 * Каждый прогон заказы списывают сток — пополняем перед тестами,
 * иначе товары «заканчиваются» от прогона к прогону.
 * Требует запущенный dev-стек бэкенда (docker compose из корня репо).
 */
export default function globalSetup() {
  execSync(
    `docker compose exec -T backend python manage.py shell -c "` +
      `from apps.catalog.models import ProductVariant; ` +
      `ProductVariant.objects.update(stock=50)"`,
    { cwd: "..", stdio: "inherit" }
  );
}
