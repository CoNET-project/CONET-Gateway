
const encryptWorkerDoCommand = ( cmd: worker_command ) => {

    switch ( cmd.cmd ) {
        case 'encrypt_InitSeguroData': {
            return initSeguroData ( cmd, data => {
                return returnCommand ( data )
            })
        }
        default: {
            return console.log (``)
        }
    }
}

const initEncrypt = () => {
    const baseUrl = self.name + 'utilities/'
    self.importScripts ( baseUrl + 'Buffer.js' )
    self.importScripts ( baseUrl + 'openpgp.js' )
    self.importScripts ( baseUrl + 'UuidV4.js' )
    self.importScripts ( baseUrl + 'utilities.js' )
    self.importScripts ( baseUrl + 'generatePassword.js' )


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

        return encryptWorkerDoCommand ( cmd )
    }


    const _cmd: worker_command = {
        cmd: 'READY'
    }

    returnCommand ( _cmd )
    return workerReady = true
}

const initSeguroData = ( cmd: worker_command, CallBack: (cmd: worker_command) => void ) => {

    const ret = {
        containerKeyPair: {
            publicKeyArmor: '',
            privateKeyArmor: '',
            
        },
        data: {
            deviceKeyPair: {
                publicKeyArmor: null,
                privateKeyArmor: null
            },
            seguroAccountKeyPair: {
                publicKeyArmor: null,
                privateKeyArmor: null
            }
        },
        password: generatePassword ( 32 + Math.round( Math.random () * 32 ))
    }
    createKey( ret.password || '', 'Seguro Container', '')
    .then (( data: any ) => {
        ret.containerKeyPair.publicKeyArmor = data.publicKey
        ret.containerKeyPair.privateKeyArmor = data.privateKey
        return createKey ('', 'Seguro Device', '')
    }).then (( data: any) => {
        ret.data.deviceKeyPair.publicKeyArmor = data.publicKey
        ret.data.deviceKeyPair.privateKeyArmor = data.privateKey
        return createKey ('', 'Seguro Account','')
    }).then (( data: any ) => {
        ret.data.seguroAccountKeyPair.publicKeyArmor = data.publicKey
        ret.data.seguroAccountKeyPair.privateKeyArmor = data.publicKey
        cmd.data = ret
        return CallBack ( cmd )
    }).catch (( ex: any ) => {
        cmd.err = ex
        return CallBack ( cmd )
    })
}

let containerKeyObj = {
    publicKeyArmor: '',
    privateKeyArmor: ''
}

const createKey = ( passwd: string, name: string, email: string ) => {
	const userId = {
		name: name,
		email: email
	}
	const option = {
		passphrase: passwd,
		userIDs: [ userId ],
		curve: "ed25519"
	}

	return openpgp.generateKey ( option )
}

const makeContainerKeyObject = () => {

}

const encryptWithContainer = () => {

}

initEncrypt ()
