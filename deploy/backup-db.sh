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

echo "$(date -Is) backup ok: db-$STAMP.sql.gz ($(du -h "$BACKUP_DIR/db-$STAMP.sql.gz" | cut -f1))"
