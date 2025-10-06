# Base stage with common dependencies
FROM node:18-alpine AS base

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Create shared directory structure
RUN mkdir -p /app/shared/database

EXPOSE 3001

CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Install only production dependencies
RUN npm install --only=production

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Create shared directory structure
RUN mkdir -p /app/shared/database

EXPOSE 3001

CMD ["npm", "start"]