FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./

FROM base AS development
RUN npm install
RUN npm install -g ts-node
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "start"]
