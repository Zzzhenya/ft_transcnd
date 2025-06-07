FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Set to development and start dev server
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
ENV WDS_SOCKET_HOST=localhost
ENV WDS_SOCKET_PORT=3000

CMD ["npm", "start"]