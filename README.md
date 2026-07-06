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
| Код на сервере | `~/uaartist` (клон этого репозитория) |
| Секреты | `~/uaartist/.env` на сервере (в git не попадает) |
| Стек | `docker-compose.prod.yml`: nginx (TLS) → gunicorn/Django → PostgreSQL |
| Витрина | Vercel (проект `frontend/`), домен uaartist.ru |

### Обновление бэкенда

```bash
ssh leff@89.232.177.22
cd ~/uaartist
git checkout -- deploy/nginx/conf.d/api.conf   # на сервере лежит https-версия конфига
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
cp deploy/nginx/api-https.conf.example deploy/nginx/conf.d/api.conf
sudo docker compose -f docker-compose.prod.yml restart nginx
```

Миграции и collectstatic выполняются автоматически при старте контейнера backend.

### TLS-сертификат

Let's Encrypt для `api.uaartist.ru`; продлевается автоматически (crontab пользователя
`leff`, понедельник 04:20). Ручное продление:

```bash
sudo docker run --rm -v uaartist_letsencrypt:/etc/letsencrypt \
  -v uaartist_certbot_www:/var/www/certbot certbot/certbot renew \
  --webroot -w /var/www/certbot
sudo docker compose -f ~/uaartist/docker-compose.prod.yml restart nginx
```

### Полезное на сервере

```bash
sudo docker compose -f docker-compose.prod.yml ps            # статус
sudo docker compose -f docker-compose.prod.yml logs backend  # логи Django (и письма: SMTP пока не настроен — console backend)
sudo docker compose -f docker-compose.prod.yml exec backend python manage.py shell
```

### Cloud.ru: грабли

Правила security group применяются к порту ВМ только после **перезагрузки** машины.
Если открыли порт, а трафик не идёт (tcpdump пуст) — `sudo reboot`.

## Деплой витрины (Vercel)

Проект импортируется из этого репозитория, **Root Directory: `frontend`**. Переменные окружения:

```
NEXT_PUBLIC_API_BASE_URL=https://api.uaartist.ru/api/v1
NEXT_PUBLIC_SITE_URL=https://uaartist.ru
```

DNS (зона на NS Selectel): `api` → A `89.232.177.22`; корень и `www` — по инструкции Vercel
при привязке домена.
