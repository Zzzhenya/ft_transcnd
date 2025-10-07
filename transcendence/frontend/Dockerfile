FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 3004
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "3004"]

FROM base AS production
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3004
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3004"]
