#!/bin/sh
set -e

# Render nginx.conf from template using environment variables (write to /tmp to avoid RO FS)
if [ -f /etc/nginx/templates/nginx.conf.template ]; then
  envsubst < /etc/nginx/templates/nginx.conf.template > /tmp/nginx.conf
  echo "[entrypoint] Generated /tmp/nginx.conf from template"
else
  echo "[entrypoint] Template /etc/nginx/templates/nginx.conf.template not found" >&2
fi

# Optionally print first lines for debugging
head -n 80 /tmp/nginx.conf || true
