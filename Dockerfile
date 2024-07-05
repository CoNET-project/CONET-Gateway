
FROM --platform=$BUILDPLATFORM node:bookworm-slim
WORKDIR /usr/src
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY build/localServer/workers ./workers
COPY build/localServer/*.js ./
RUN yarn install
EXPOSE 3001 3003
CMD [ "node", "index.js" ]
