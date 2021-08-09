import localServer from './localServer'
const port = parseInt( process.argv[2] ) || 3001
const path = process.argv[3] || ''
new localServer ( port, path )
