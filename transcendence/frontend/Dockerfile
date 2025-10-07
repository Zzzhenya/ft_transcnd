FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 3004
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3004
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3004"]
