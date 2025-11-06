
FROM node:18-alpine

WORKDIR /app/shared

# Copy shared folder content INTO the image
COPY ../../shared/package*.json ./
COPY ../../shared/database ./database
COPY ../../shared/config ./config
COPY ../../shared/types ./types
COPY ../../shared/utils ./utils

# Testdata
# COPY ../database/test_db_data.sh test_db_data.sh
# COPY ../database/clear_db.sh clear_db.sh
# Make scripts executable
# RUN chmod +x test_db_data.sh && \
#     chmod +x clear_db.sh

# Install dependencies
RUN npm install

# Set working directory
WORKDIR /app/shared

# Init database and keep container running
CMD ["sh", "-c", "npm run db:init && tail -f /dev/null"]




# FROM node:18-alpine

# WORKDIR /app/shared

# # Copy package files first for better caching
# COPY ./shared/package*.json ./

# # Install main dependencies
# RUN npm install

# # Copy the rest of shared folder content (excluding node_modules)
# COPY ./shared/config ./config
# COPY ./shared/types ./types
# COPY ./shared/utils ./utils

# # Copy database folder structure (without node_modules)
# COPY ./shared/database/package*.json ./database/
# COPY ./shared/database/*.js ./database/
# COPY ./shared/database/*.sql ./database/
# COPY ./shared/database/migrations/ ./database/migrations/

# # Install database-specific dependencies in the correct directory
# WORKDIR /app/shared/database
# RUN npm install --only=production

# # Return to main directory
# WORKDIR /app/shared

# # Set working directory
# WORKDIR /app/shared

# # Init database and keep container running
# CMD ["sh", "-c", "cd database && node init-db.js && tail -f /dev/null"]