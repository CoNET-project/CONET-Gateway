#!/usr/local/bin
import {Daemon} from './localServer/localServer'
import { proxyServer as proxyServer_class } from './localServer/proxyServer'
const yargs = require('yargs')
const argv = yargs(process.argv.slice(2))
    .usage('Usage: yarn run seguro-gateway --port [number] --path [string]')
    .help('h')
    .alias('h', 'help')
    .describe('port', 'Run Seguro Gateway on this port.')
    .describe('path', 'Read worker files on this path.')
    .example('seguro-gateway --port 3001', 'Run Seguro Gateway on PORT 3001')
    .example('seguro-gateway --path ./', 'Read worker files on current directory.')
    .example('seguro-gateway --port 3001 --path ./', 'Read worker files on current directory & run Seguro Gateway on PORT 3001.')
    .check(function (argv: any) {
        if (argv.port) {
            if (typeof argv.port !== 'number') {
                console.log('Invalid port argument.')
                process.exit(1)
            }
        }

        if (argv.path) {
            if (typeof argv.path !== 'string') {
                console.log('Invalid path argument.')
                process.exit(1)
            }
        }
        return true;
    })
    .argv

let PORT = 3001
let PATH = ''

export const launchDaemon = (port: number, path: string) => {
    new Daemon ( port, path )
}

export const proxyServer = (post: string, entryNode: nodes_info, _egressNode: nodes_info, profile: profile) => new proxyServer_class(post, [entryNode], [_egressNode], profile, false, '')

if (argv.port || argv.path) {
    PATH = argv.path
    if (typeof argv.port === 'number') {
        PORT = argv.port
    } else {
        console.log('Invalid PORT, running on PORT 3001.')
    }
    launchDaemon(PORT, PATH)
}