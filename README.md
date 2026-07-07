# uaartist — интернет-магазин аксессуаров ручной работы

Монорепо: **Django 5 + DRF** (`backend/`) · **Next.js 16 + TypeScript** (`frontend/`) · PostgreSQL.
Подробная роадмапа — [roadmap.md](roadmap.md).

## Локальная разработка

```bash
cp .env.example .env            # один раз; вписать секреты по необходимости
docker compose up -d            # API на http://localhost:8000 (Postgres + Django)
cd frontend && npm install && npm run dev   # витрина на http://localhost:3000
```

- Swagger: http://localhost:8000/api/v1/docs/ · Админка: http://localhost:8000/admin/ (dev: admin/admin)
- Тесты бэкенда: `docker compose exec -T -u $(id -u):$(id -g) backend pytest`
- Линтеры: `... backend sh -c "black . && ruff check --fix ."` · фронт: `npm run lint && npm run format`
- Демо-каталог: `docker compose exec -T backend python manage.py seed_demo`
- После изменения API: `cd frontend && npm run gen:api` (перегенерирует TS-типы из OpenAPI)

⚠️ Не запускайте `npm run build` при работающем `npm run dev` — прод-сборка ломает
dev-кэш `.next`; после сборки перезапустите dev-сервер (`rm -rf .next && npm run dev`).

## Продакшн

| Что | Где |
|---|---|
| API | https://api.uaartist.ru (VM Cloud.ru `89.232.177.22`, Ubuntu 24.04) |
| Витрина | https://www.uaartist.ru — та же VM, контейнер `frontend` (Next.js standalone) |
| Код на сервере | `~/uaartist` (клон этого репозитория) |
| Секреты | `~/uaartist/.env` на сервере (в git не попадает) |
| Стек | `docker-compose.prod.yml`: nginx (TLS) → Next.js + gunicorn/Django → PostgreSQL |

> Витрина переехала с Vercel на VM в июле 2026: ТСПУ дросселирует трафик к зарубежным
> хостингам с домашних сетей РФ (HTML грузился без CSS либо не грузился вовсе).

### Обновление (бэкенд и витрина)

```bash
ssh leff@89.232.177.22
cd ~/uaartist
git checkout -- deploy/nginx/conf.d/   # на сервере лежат https-версии конфигов
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
cp deploy/nginx/api-https.conf.example deploy/nginx/conf.d/api.conf
cp deploy/nginx/www-https.conf.example deploy/nginx/conf.d/www.conf
sudo docker compose -f docker-compose.prod.yml restart nginx
```

Миграции и collectstatic выполняются автоматически при старте контейнера backend.
`NEXT_PUBLIC_*` витрины вшиты в бандл на этапе сборки (значения — build args в
`docker-compose.prod.yml`); их смена требует `up -d --build frontend`, не restart.

### TLS-сертификат

Let's Encrypt: `api.uaartist.ru` и отдельный сертификат `www.uaartist.ru` + `uaartist.ru`;
продлеваются автоматически (crontab пользователя `leff`, понедельник 04:20). Ручное продление:

```bash
sudo docker run --rm -v uaartist_letsencrypt:/etc/letsencrypt \
  -v uaartist_certbot_www:/var/www/certbot certbot/certbot renew \
  --webroot -w /var/www/certbot
sudo docker compose -f ~/uaartist/docker-compose.prod.yml restart nginx
```

### Письма (SMTP)

Провайдер — **SMTP.bz** (бесплатный тариф: 15 000 писем/мес, ≤500/сутки). Пока переменные
не заданы, работает console backend — письма видны только в логах backend.

Подключение (однократно):

1. Зарегистрироваться на smtp.bz, добавить отправителя с доменом `uaartist.ru`.
2. Прописать выданные записи **SPF** (TXT на `@`) и **DKIM** (TXT на селектор) в DNS-зоне
   Selectel; дождаться подтверждения домена в ЛК.
3. В `~/uaartist/.env` на сервере добавить (хост/логин/пароль — из ЛК → SMTP):

   ```
   DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   DJANGO_EMAIL_HOST=connect.smtp.bz
   DJANGO_EMAIL_PORT=587
   DJANGO_EMAIL_HOST_USER=...
   DJANGO_EMAIL_HOST_PASSWORD=...
   ```

4. `sudo docker compose -f docker-compose.prod.yml up -d backend` (пересоздаст с новым env).
5. Проверка: из `manage.py shell` —
   `from django.core.mail import send_mail; send_mail("test", "test", None, ["свой@ящик"])`,
   затем прогон через mail-tester.com (должно быть 9–10/10) и живой сброс пароля с витрины.

### Бэкапы

`deploy/backup-db.sh` (cron пользователя `leff`, ежедневно 03:30): дамп Postgres в
`~/backups/db-*.sql.gz` (хранится 14 шт) + по воскресеньям архив медиа
`media-*.tar.gz` (4 шт). Лог — `~/backups/backup.log`. Восстановление БД:

```bash
gunzip -c ~/backups/db-XXXX.sql.gz | sudo docker compose -f docker-compose.prod.yml \
  exec -T db psql -U uaartist uaartist
```

Offsite: тот же скрипт зеркалит `~/backups` в Cloud.ru Object Storage
(`s3://bucket-uaartist/backups`, endpoint s3.cloud.ru, ключи `BACKUP_S3_*` в
`~/uaartist/.env`). Ротация зеркалится (`sync --delete`); при объёме бакета
>12 ГБ (free tier 15) скрипт шлёт предупреждение в Telegram.

### E2E-тесты (Playwright)

Из `frontend/`: `npm run test:e2e` (нужен запущенный dev-стек: `docker compose up` +
интернет — доставка считается живым СДЭК; фронтенд поднимется сам, если не запущен).
Global-setup пополняет сток вариантов до 50 перед прогоном. Отчёт: `npx playwright show-report`.
Сценарии: гостевой чекаут с ПВЗ СДЭК, конструктор, регистрация/логин.

### Полезное на сервере

```bash
sudo docker compose -f docker-compose.prod.yml ps            # статус
sudo docker compose -f docker-compose.prod.yml logs backend  # логи Django (и письма: SMTP пока не настроен — console backend)
sudo docker compose -f docker-compose.prod.yml exec backend python manage.py shell
```

### Cloud.ru: грабли

Правила security group применяются к порту ВМ только после **перезагрузки** машины.
Если открыли порт, а трафик не идёт (tcpdump пуст) — `sudo reboot`.

## DNS

Зона на NS Selectel: `api`, `www` и корень — A-записи на `89.232.177.22`.
Канонический хост витрины — `www.uaartist.ru`, apex отвечает 308 → www (nginx).
