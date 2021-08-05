
const workerCros = ( 
	url: string 
) => {
    const iss = "importScripts('" + url + "');"
    return URL.createObjectURL( new Blob([ iss ], { "type": 'application/javascript' }))
}

class SubWorkerInWorker {
	public worker: Worker
	private cmdArray:  Map < string, ( cmd: worker_command ) => void > = new Map ()
	private catchReturn ( 
		message: string 
	) {
		
		const jsonData = buffer.Buffer.from ( message ).toString()
		let cmd: worker_command
		try {
			cmd = JSON.parse ( jsonData )
		} catch ( ex ) {
			return console.dir ( ex )
		}
		let getCallBack = null
		if ( cmd?.uuid ) {
			getCallBack = this.cmdArray.get ( cmd.uuid )
		}
		
		if ( !getCallBack ) {
			if ( /^ready$/i.test ( cmd.cmd )) {
				return this.readyBack ( cmd.data )
			}
			return console.log ( `SubWorker catch unknow UUID sharedMainWorker Return: ${ cmd } `)
		}

		return getCallBack ( cmd )
	}


	constructor ( 
		url: string,
		private readyBack: ( init: worker_command ) => void 
	) {
		
		const localhost = self.name
		const storageUrlBlob = workerCros ( localhost + url )
		this.worker = new Worker ( storageUrlBlob, { name: localhost })
		URL.revokeObjectURL ( storageUrlBlob )
		this.worker.onmessage = e => {
			return this.catchReturn ( e.data )
		}
		this.worker.onerror = ev => {
			console.log (ev )
		}
	}

	public append (
		message: worker_command,
		CallBack: ( cmd?: worker_command ) => void
	) {
		if ( !message.uuid ) {
			message.err = 'Have no UUID!'
			return CallBack ( message )
		}
		this.cmdArray.set ( message.uuid, CallBack )
		const cmdStream = buffer.Buffer.from ( JSON.stringify ( message ))
		if ( this.worker?.postMessage ) {
			return this.worker.postMessage ( cmdStream.buffer, [ cmdStream.buffer ] )
		}
		return console.log (`SubWorker Error: this.worker have no Object!`)
		
	}
}