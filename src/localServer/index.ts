import localServer from './localServer'
const port = parseInt( process.argv[2] ) || 3001
new localServer ( port, '' )
