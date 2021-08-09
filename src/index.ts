#! /usr/bin/env node

import LocalServer from './localServer/localServer'

let PORT = 3001
let PATH = ''
if (process.argv.includes('--port')) {
    const idx = process.argv.indexOf('--port')
    const port = process.argv[idx + 1]
    PATH = process.argv[idx + 2];
    try {
        PORT = parseInt(port)
    } catch {
        console.log('Invalid port')
    }
}

const startSeguroGateway = () => {
    new LocalServer ( PORT, PATH )
}

startSeguroGateway();

