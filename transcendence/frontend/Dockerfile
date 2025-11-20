# Base
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./

# Make lock file not rely on dependencies
RUN npm install --package-lock-only --ignore-scripts

# 개발용: HMR
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3004
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "3004"]

# 운영용: 빌드 + 프리뷰(또는 nginx/serve)
FROM base AS production
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3004
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3004"]
