
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

#"enr:-MK4QOvdvCY7-DoI-yJ5QyS0MCvxICvez9J6UZlqI3S0aFkZKAwESND0l3pdGFy6Kvg5ke-qbsg20KTkT1It90-FfVSGAYtYc7ALh2F0dG5ldHOIAAAAAAAAAACEZXRoMpBa8xKTIAAAkv__________gmlkgnY0gmlwhKwTAAOJc2VjcDI1NmsxoQN6biCeCtJBlpSwtUYffSSavld3y-qZSvY8PfRKnwBIZ4hzeW5jbmV0cwCDdGNwgjLIg3VkcIIu4A" prefix=p2p
#2023-10-22 10:34:18 time="2023-10-22 17:34:18" level=info msg="Node started p2p server" multiAddr="/ip4/172.19.0.3/tcp/13000/p2p/16Uiu2HAmLtuVCWQvAwGc9jn7Wf4oDjcbaTAVSTwLAjZkg3d5UHKU" prefix=p2p