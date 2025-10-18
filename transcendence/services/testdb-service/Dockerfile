# FROM node:20-alpine AS base
# # Install glibc
# # Install glibc compatibility & build tools
# RUN apk add --no-cache libc6-compat python3 make g++

# RUN mkdir -p /shared/test-db

# WORKDIR /app
# RUN apk add --no-cache curl
# COPY package*.json tsconfig.json ./


# # Install dependencies
# RUN npm ci

# #FROM base AS development
# #RUN npm install
# #COPY . .
# #CMD ["npm", "run", "dev"]

# FROM base AS production
# RUN npm install
# COPY . .

# # Rebuild better-sqlite3 from source to match Alpine environment
# RUN npm rebuild better-sqlite3 --build-from-source

# RUN npm run build
# CMD ["npm", "run", "start"]


# ---- Base image ----
FROM node:20-slim AS base

# Create the shared directory for the SQLite DB
RUN mkdir -p /shared/test-db

# Optional: install curl or other utilities if needed
RUN apt-get update && apt-get install -y curl \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for caching layers)
COPY package*.json tsconfig.json ./

# Install dependencies
# RUN npm ci
RUN npm install

# ---- Development stage (optional) ----
# FROM base AS development
# COPY . .
# CMD ["npm", "run", "dev"]

# ---- Production stage ----
FROM base AS production

# Copy the rest of the source code
COPY . .

# No need to rebuild better-sqlite3 on slim — it works out of the box 👍

# Build TypeScript
RUN npm run build

# Start the app
CMD ["npm", "run", "start"]

