#!/bin/sh
set -e

# Provide safe defaults for templated variables
export SERVER_NAME="${SERVER_NAME:-localhost}"
export GATEWAY_HOST="${GATEWAY_HOST:-gateway}"
export GATEWAY_PORT="${GATEWAY_PORT:-3000}"
export CLIENT_MAX_BODY_SIZE="${CLIENT_MAX_BODY_SIZE:-10M}"

# Render nginx config from template, restrict substitutions to our env vars
if [ -f /etc/nginx/templates/nginx.conf.template ]; then
  envsubst '${SERVER_NAME} ${GATEWAY_HOST} ${GATEWAY_PORT} ${CLIENT_MAX_BODY_SIZE}' < /etc/nginx/templates/nginx.conf.template > /tmp/nginx.conf
  echo "[run-nginx] Generated /tmp/nginx.conf"
  head -n 80 /tmp/nginx.conf || true
else
  echo "[run-nginx] Missing template /etc/nginx/templates/nginx.conf.template" >&2
  exit 1
fi

# Start nginx with the generated config
exec nginx -g 'daemon off;' -c /tmp/nginx.conf
