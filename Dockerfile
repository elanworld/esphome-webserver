FROM node:lts-alpine3.16
WORKDIR /app
ADD package.json .
RUN apk add xdg-utils && npm install
ADD ./ .
EXPOSE 8081
CMD npm run dev