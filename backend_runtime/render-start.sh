#!/usr/bin/env bash
set -e

if [ -z "${APP_KEY:-}" ] || [[ "${APP_KEY:-}" != base64:* ]]; then
  export APP_KEY="$(php artisan key:generate --show)"
fi

if [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
  export APP_URL="$RENDER_EXTERNAL_URL"
fi

php artisan config:clear
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link || true

php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
