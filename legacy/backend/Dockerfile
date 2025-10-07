FROM node:18-alpine

# Install build dependencies for native modules like bcrypt
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with better error handling
RUN npm ci --only=production --no-audit || \
    (echo "npm ci failed, trying npm install..." && npm install --only=production --no-audit) || \
    (echo "npm install failed, trying without bcrypt..." && npm install --only=production --no-audit --ignore-scripts)

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/avatars

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))" || exit 1

# Start application
CMD ["npm", "start"]