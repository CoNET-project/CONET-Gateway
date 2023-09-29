FROM node:alpine
WORKDIR /usr/src
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY . .
RUN npm install
EXPOSE 3001
CMD [ "node", "build/localServer/index" ]