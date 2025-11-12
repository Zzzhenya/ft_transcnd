# Base stage with common dependencies
FROM node:18-alpine AS base

WORKDIR /app

# Install build dependencies for native modules and curl for health checks
RUN apk add --no-cache python3 make g++ curl wget

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy application code
COPY . .
RUN mkdir -p /app/avatars
COPY avatars/default.jpg /app/avatars/default.jpg


# Create data directory for SQLite
RUN mkdir -p /app/data

# Create shared directory structure
RUN mkdir -p /app/shared/database

EXPOSE 3001

CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Install only production dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create directories
RUN mkdir -p /app/data
RUN mkdir -p /app/shared/database

EXPOSE 3001

CMD ["npm", "start"]