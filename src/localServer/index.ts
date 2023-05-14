import localServer from './localServer'
const port = parseInt( process.argv[2] ) || 3001
const path = process.argv[3] || '../seguro_platform/build'
new localServer ( port, path )
