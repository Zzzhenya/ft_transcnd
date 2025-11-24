# Development stage
FROM node:18-alpine AS development
#FROM mybase/node18:latest AS development

WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for development)
RUN npm install

# Copy source code
COPY src ./src

# Install nodemon globally for development hot reloading
RUN npm install -g nodemon

# Expose the port
EXPOSE 3003

# Development command (will be overridden by docker-compose.dev.yml)
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy source code
COPY src ./src

# Expose the port
EXPOSE 3003

# Production command
CMD ["npm", "start"]

# Default to production if no target is specified
FROM production