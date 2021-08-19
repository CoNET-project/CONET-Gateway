const storageWorkDoCommand = ( cmd: worker_command ) => {

    switch ( cmd.cmd ) {
        
        default: {
            return console.log (``)
        }
    }
}

const initStorage = () => {
    const baseUrl = self.name + 'utilities/'
    self.importScripts ( baseUrl + 'Buffer.js' )
    self.importScripts ( baseUrl + 'Pouchdb.js' )
    self.importScripts ( baseUrl + 'PouchdbFind.js' )
    self.importScripts ( baseUrl + 'PouchdbMemory.js' )
    self.importScripts ( baseUrl + 'UuidV4.js' )
    self.importScripts ( baseUrl + 'utilities.js' )

    checkStorage ()
    onmessage = e => {
        const jsonData = buffer.Buffer.from ( e.data ).toString()
		let cmd: worker_command
		try {
			cmd = JSON.parse ( jsonData )
		} catch ( ex ) {
			return console.dir ( ex )
		}
        if ( !workerReady ) {
            cmd.err = 'NOT_READY'
            return returnCommand ( cmd )
        }
        return storageWorkDoCommand ( cmd )
    }
}


const checkStorage = ( ) => {
    const db = new PouchDB('SEGURO')
    const cmd: worker_command = {
        cmd: 'READY'
    }
    db.get ( 'init' ).then (( doc: Object ) => {
        cmd.data = doc
        console.log (`init doc = [${ doc }]`)
        returnCommand ( cmd )
    }).catch ((ex: Error )=> {
        cmd.data = ''
        returnCommand ( cmd )
    })

}
initStorage ()