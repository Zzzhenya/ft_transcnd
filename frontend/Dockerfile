FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Set to development and start dev server
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
ENV HOST=0.0.0.0
ENV WDS_SOCKET_HOST=ft_transcendence
ENV WDS_SOCKET_PORT=443
ENV WDS_SOCKET_PATH=/ws

CMD ["npm", "start"]