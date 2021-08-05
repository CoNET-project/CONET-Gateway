
const initMainWorker = () => {
    const baseUrl = self.name + 'utilities/'
    self.importScripts ( baseUrl + 'Buffer.js' )
    self.importScripts ( baseUrl + 'UuidV4.js' )
    self.importScripts ( baseUrl + 'utilities.js' )
    self.importScripts ( baseUrl + 'mainWorkerDoCommand.js' )
    self.importScripts ( baseUrl + 'SubWorkerInWorker.js' )
    self.importScripts ( baseUrl + 'launchAllWorkers.js' )
    
    /**
     *          message from React
     */
    onmessage = e => {
        const jsonData = buffer.Buffer.from ( e.data ).toString()
		let cmd: worker_command
		try {
			cmd = JSON.parse ( jsonData )
		} catch ( ex ) {
			return console.dir ( ex )
		}
        if ( !workerReady ) {
            cmd.err = 'Worker have not ready'
            return returnCommand ( cmd )
        }
        return mainWorkDoCommand ( cmd, allWorkerClass )
    }

    const allWorkerClass = new launchAllWorkers ()

}

initMainWorker ()