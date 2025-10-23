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