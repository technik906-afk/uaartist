#!/usr/bin/env bash
# Бэкап прода: дамп Postgres ежедневно + архив медиа по воскресеньям.
# Запускается кроном на VM (см. README «Бэкапы»). Хранение: ~/backups,
# ротация — 14 дампов БД и 4 архива медиа. Offsite-копии пока нет.
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="$HOME/backups"
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%F-%H%M)

# .env нельзя source'ить (значения с пробелами без кавычек) — берём точечно
POSTGRES_USER=$(grep -m1 '^POSTGRES_USER=' .env | cut -d= -f2-)
POSTGRES_DB=$(grep -m1 '^POSTGRES_DB=' .env | cut -d= -f2-)

sudo docker compose -f docker-compose.prod.yml exec -T db \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"
gunzip -t "$BACKUP_DIR/db-$STAMP.sql.gz"

# Медиа (фото товаров) — раз в неделю, по воскресеньям
if [ "$(date +%u)" = 7 ]; then
    sudo docker run --rm -v uaartist_media_data:/media:ro -v "$BACKUP_DIR":/backup \
        alpine tar czf "/backup/media-$STAMP.tar.gz" -C /media .
fi

# Ротация (пустой глоб — не ошибка: ls в подоболочке с || true из-за pipefail)
(ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null || true) | tail -n +15 | xargs -r rm
(ls -1t "$BACKUP_DIR"/media-*.tar.gz 2>/dev/null || true) | tail -n +5 | xargs -r rm

# Offsite: зеркалим в Cloud.ru Object Storage (free tier 15 ГБ).
# sync --delete повторяет локальную ротацию — объём бакета ограничен по построению.
BACKUP_S3_BUCKET=$(grep -m1 '^BACKUP_S3_BUCKET=' .env | cut -d= -f2- || true)
if [ -n "$BACKUP_S3_BUCKET" ]; then
    BACKUP_S3_ENDPOINT=$(grep -m1 '^BACKUP_S3_ENDPOINT=' .env | cut -d= -f2-)
    AWS_ENV=(-e AWS_ACCESS_KEY_ID="$(grep -m1 '^BACKUP_S3_ACCESS_KEY=' .env | cut -d= -f2-)"
             -e AWS_SECRET_ACCESS_KEY="$(grep -m1 '^BACKUP_S3_SECRET_KEY=' .env | cut -d= -f2-)"
             -e AWS_DEFAULT_REGION=ru-central-1)
    sudo docker run --rm "${AWS_ENV[@]}" -v "$BACKUP_DIR":/backups:ro amazon/aws-cli \
        s3 sync /backups "s3://$BACKUP_S3_BUCKET/backups" \
        --endpoint-url "$BACKUP_S3_ENDPOINT" --delete --exclude "backup.log" --no-progress

    # Контроль free tier: перевалили 12 из 15 ГБ — предупреждение в Telegram
    # (шлём через backend-контейнер: у него пин живого IP api.telegram.org)
    SIZE=$(sudo docker run --rm "${AWS_ENV[@]}" amazon/aws-cli \
        s3 ls "s3://$BACKUP_S3_BUCKET" --recursive --summarize \
        --endpoint-url "$BACKUP_S3_ENDPOINT" | awk '/Total Size/ {print $3}')
    if [ "${SIZE:-0}" -gt $((12 * 1024 * 1024 * 1024)) ]; then
        sudo docker compose -f docker-compose.prod.yml exec -T backend python -c "
from apps.orders.notifications import send_telegram_message
send_telegram_message('⚠️ Бэкапы: бакет bucket-uaartist занял ${SIZE} байт (>12 ГБ из 15 бесплатных) — почисти или уменьши ротацию')" || true
    fi
    echo "$(date -Is) offsite ok: $SIZE bytes in s3://$BACKUP_S3_BUCKET"
fi

echo "$(date -Is) backup ok: db-$STAMP.sql.gz ($(du -h "$BACKUP_DIR/db-$STAMP.sql.gz" | cut -f1))"
