FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "run", "start"]
