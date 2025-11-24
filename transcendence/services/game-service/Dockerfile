FROM node:18-alpine AS base
#FROM mybase/node18:latest AS base
WORKDIR /app
RUN apk add --no-cache curl wget python3 make g++
COPY package*.json ./
RUN npm install --omit=dev

FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
COPY . .
CMD ["npm", "start"]
