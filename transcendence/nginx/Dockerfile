# Multi-stage Nginx image that embeds the built frontend

# Stage 1: Build frontend artifacts
FROM node:18-alpine AS build
WORKDIR /app

# Copy only package files first for better layer caching
COPY transcendence/frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

# Copy the rest of the frontend source
COPY transcendence/frontend/ .

# Ensure production build and bake Vite env vars used by the app
ENV NODE_ENV=production
# Inline API/Gateway/WS bases expected by the app at build-time
ENV VITE_API_BASE=/api
ENV VITE_GATEWAY_BASE=/api
ENV VITE_WS_BASE=/ws
# If you serve under a subpath, expose it via BASE_PATH and read it in vite.config.ts
# ENV BASE_PATH=/

RUN npm run build

# Stage 2: Nginx runtime serving the SPA
FROM nginx:1.25-alpine

# Install envsubst (gettext) and openssl for self-signed certs
RUN apk add --no-cache gettext openssl \
    && mkdir -p /etc/nginx/ssl

# Copy nginx template and custom entrypoint that renders then starts nginx
COPY transcendence/nginx/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY transcendence/nginx/run-nginx.sh /usr/local/bin/run-nginx.sh
RUN chmod +x /usr/local/bin/run-nginx.sh \
    && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
         -subj "/CN=localhost" \
         -keyout /etc/nginx/ssl/private.key \
         -out /etc/nginx/ssl/certificate.crt

# Copy built frontend into web root
COPY --from=build /app/frontend/dist/ /usr/share/nginx/html/

# Reasonable permissions
RUN chmod -R 755 /usr/share/nginx/html /etc/nginx/ssl

EXPOSE 80 443
# Use our entrypoint script to render config then start nginx
ENTRYPOINT ["/usr/local/bin/run-nginx.sh"]
