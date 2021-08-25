FROM node:14-alpine AS build

WORKDIR /opt/node_app

COPY package.json yarn.lock ./
RUN yarn --ignore-optional --network-timeout 100000

ARG NODE_ENV=production

COPY . .
RUN yarn build:app:docker

FROM nginx:1.21-alpine

COPY --from=build /opt/node_app/build /usr/share/nginx/html

HEALTHCHECK CMD wget -q -O /dev/null http://localhost || exit 1
