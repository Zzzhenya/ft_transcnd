FROM node:18 as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Force development build with detailed error messages
ENV GENERATE_SOURCEMAP=true
ENV NODE_ENV=development
ENV REACT_APP_ENV=development
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]