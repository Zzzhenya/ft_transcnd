FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl python3 make g++
COPY package*.json ./
RUN npm install --omit=dev

FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
COPY . .
CMD ["npm", "start"]
