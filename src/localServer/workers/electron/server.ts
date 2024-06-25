

import {Daemon} from '../../localServer'

const createClientServer = () => {
    return new Promise(async resolve => {

        const port = 3001
        console.log(`attempting to listen on port ${port}`)

        new Daemon(port, '')

        resolve({
            clientServerPort: port
        })
    })
}

module.exports = {
    createClientServer
}