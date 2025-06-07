FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Verwende npm install statt npm ci für erste Installation
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]