import {Daemon} from './localServer'
const port = parseInt( process.argv[2] ) || 3001
new Daemon ( port, '' )