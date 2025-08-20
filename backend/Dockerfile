FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first (for better caching)
COPY package.json ./

# Install dependencies individually to avoid version conflicts
RUN npm install express@^4.18.2
RUN npm install pg@^8.11.3  
RUN npm install bcrypt@^5.1.1
RUN npm install jsonwebtoken@^9.0.2
RUN npm install cors@^2.8.5
RUN npm install dotenv@^16.3.1

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 5000

# Simple health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start with simple node command (no npm script)
CMD ["node", "src/app.js"]