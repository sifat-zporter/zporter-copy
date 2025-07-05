FROM node:12
ENV PORT 3000

ARG MY_ENV
ARG ELASTIC
ARG FIREBASE
ARG NEW_RELIC
ARG SENDGRID
ARG TYPEORM
ARG FIREBASE_PRIVATE_KEY

RUN mkdir -p /usr/src/app/server
WORKDIR /usr/src/app/server/

# create env variables
RUN echo "$MY_ENV" >> /usr/src/app/server/.env
RUN echo "$ELASTIC" >> /usr/src/app/server/.env
RUN echo "$FIREBASE" >> /usr/src/app/server/.env
RUN echo "$FIREBASE_PRIVATE_KEY" >> /usr/src/app/server/.env
RUN echo "$NEW_RELIC" >> /usr/src/app/server/.env
RUN echo "$SENDGRID" >> /usr/src/app/server/.env
RUN echo "$TYPEORM" >> /usr/src/app/server/.env

# Installing dependencies
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copying source files
COPY . /usr/src/app/server

RUN cat /usr/src/app/server/.env

# Building app
RUN npm run build
EXPOSE 3000

# Running the app
CMD ["node", "dist/main.js"]
