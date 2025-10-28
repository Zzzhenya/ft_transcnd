FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g npm@11.6.2
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
