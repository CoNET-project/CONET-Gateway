"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const conet_proxy_1 = require("@conet.project/conet-proxy");
const createClientServer = () => {
    return new Promise(async (resolve) => {
        const port = 3001;
        console.log(`attempting to listen on port ${port}`);
        (0, conet_proxy_1.Daemon)(port, '');
        resolve({
            clientServerPort: port
        });
    });
};
module.exports = {
    createClientServer
};
