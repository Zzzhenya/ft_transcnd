FROM node:20-bullseye AS base

WORKDIR /app

# Install build tools (optional but safe)
RUN apt-get update && apt-get install -y \
    build-essential python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
COPY . .
CMD ["npm", "start"]


