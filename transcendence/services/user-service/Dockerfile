FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (this will compile native modules for the container architecture)
RUN npm install --only=production

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Create shared directory structure
RUN mkdir -p /app/shared/database

EXPOSE 3001

CMD ["npm", "start"]