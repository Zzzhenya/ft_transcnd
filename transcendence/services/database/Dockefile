FROM node:18-alpine

WORKDIR /app/shared

# Copy shared folder content INTO the image
COPY ../../shared/package*.json ./
COPY ../../shared/database ./database
COPY ../../shared/config ./config
COPY ../../shared/types ./types
COPY ../../shared/utils ./utils

# Install dependencies
RUN npm install

# Set working directory
WORKDIR /app/shared

# Init database and keep container running
CMD ["sh", "-c", "npm run db:init && tail -f /dev/null"]