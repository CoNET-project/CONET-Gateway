
FROM node:bookworm-slim
WORKDIR /usr/src
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm install
COPY build/localServer/workers ./workers
COPY build/localServer/*.js ./
EXPOSE 3001
CMD [ "node", "index.js" ]