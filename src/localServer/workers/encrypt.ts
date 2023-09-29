
let passObj: passInit| null = null
let systemInitialization_UUID = ''
let workerReady = false
let CoNET_Data: encrypt_keys_object | null = null
let containerKeyObj: keyPair|null = null
let preferences: any = null
const CoNET_SI_Network_Domain = 'openpgp.online'
const conet_DL_endpoint = `https://${ CoNET_SI_Network_Domain }/api/conet-faucet`
const conet_DL_getUSDCPrice_Endpoint = `https://${ CoNET_SI_Network_Domain }/api/conet-price`
const conet_DL_getSINodes = `https://${ CoNET_SI_Network_Domain }/api/conet-si-list`
const conet_DL_authorizeCoNETCashEndpoint = `https://${ CoNET_SI_Network_Domain }/api/authorizeCoNETCash`
const conet_DL_regiestProfile = `https://${ CoNET_SI_Network_Domain }/api/regiestProfileRoute`
const conet_DL_publishGPGKeyArmored = `https://${ CoNET_SI_Network_Domain }/api/publishGPGKeyArmored`
const gasFee = 30000
const wei = 1000000000000000000
const denominator = 1000000000000000000
const gasFeeEth = 0.000526
const GasToEth = 0.00000001
const USDC_exchange_Addr = '0xD493391c2a2AafEd135A9f6164C0Dcfa9C68F1ee'
const buyUSDCEndpoint = `https://${ CoNET_SI_Network_Domain }/api/exchange_conet_usdc`
const mintCoNETCashEndpoint = `https://${ CoNET_SI_Network_Domain }/api/mint_conetcash`
const openSourceEndpoint = 'https://s3.us-east-1.wasabisys.com/conet-mvp/router/'



const responseChannel = new BroadcastChannel('toServiceWroker')
const databaseName = 'CoNET'
const channel = new BroadcastChannel('toMainWroker')
let activeNodes: nodes_info[]|null= null
const CoNETModule: CoNET_Module = {
	EthCrypto: null,
	Web3HttpProvider:  null,
	Web3EthAccounts: null,
	Web3Eth: null,
	Web3Utils: null,
	forge: null,
	aesGcmEncrypt: async (plaintext: string, password: string) => {
		const pwUtf8 = new TextEncoder().encode(password)                                 // encode password as UTF-8
		const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8)                      // hash the password
	
		const iv = crypto.getRandomValues(new Uint8Array(12))                             // get 96-bit random iv
		const ivStr = Array.from(iv).map(b => String.fromCharCode(b)).join('')            // iv as utf-8 string
	
		const alg = { name: 'AES-GCM', iv: iv }                                           // specify algorithm to use
	
		const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']) // generate key from pw
	
		const ptUint8 = new TextEncoder().encode(plaintext)                               // encode plaintext as UTF-8
		const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8)                   // encrypt plaintext using key
	
		const ctArray = Array.from(new Uint8Array(ctBuffer))                              // ciphertext as byte array
		const ctStr = ctArray.map(byte => String.fromCharCode(byte)).join('')             // ciphertext as string
	
		return btoa(ivStr+ctStr)   
	},

	aesGcmDecrypt: async (ciphertext: string, password: string) => {
		const pwUtf8 = new TextEncoder().encode(password)                                 // encode password as UTF-8
		const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8)                      // hash the password

		const ivStr = atob(ciphertext).slice(0,12)                                        // decode base64 iv
		const iv = new Uint8Array(Array.from(ivStr).map(ch => ch.charCodeAt(0)))          // iv as Uint8Array

		const alg = { name: 'AES-GCM', iv: iv }                                           // specify algorithm to use

		const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']) // generate key from pw

		const ctStr = atob(ciphertext).slice(12)                                          // decode base64 ciphertext
		const ctUint8 = new Uint8Array(Array.from(ctStr).map(ch => ch.charCodeAt(0)))     // ciphertext as Uint8Array
		// note: why doesn't ctUint8 = new TextEncoder().encode(ctStr) work?

		try {
			const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8)            // decrypt ciphertext using key
			const plaintext = new TextDecoder().decode(plainBuffer)                       // plaintext from ArrayBuffer
			return plaintext                                                              // return the plaintext
		} catch (e) {
			throw new Error('Decrypt failed')
		}
	}
}
let ClientIDworker = ''
const backGroundPoolWorker: clientPoolWroker[] = []

self.onhashchange = () => {
	channel.removeEventListener('message', channelWorkerDoCommand)
	self.removeEventListener ('message', encryptWorkerDoCommand)
}

const initEncryptWorker = async () => {
	
    const baseUrl = self.name + 'utilities/'
    self.importScripts ( baseUrl + 'Buffer.js' )
    self.importScripts ( baseUrl + 'openpgp.min.js' )
    self.importScripts ( baseUrl + 'UuidV4.js' )
    self.importScripts ( baseUrl + 'Pouchdb.js' )
    self.importScripts ( baseUrl + 'PouchdbFind.js' )
    self.importScripts ( baseUrl + 'PouchdbMemory.js' )
    self.importScripts ( baseUrl + 'scrypt.js' )
    self.importScripts ( baseUrl + 'async.js' )
    self.importScripts ( baseUrl + 'forge.all.min.js' )	
    self.importScripts ( baseUrl + 'jszip.min.js' )
    self.importScripts ( baseUrl + 'utilities.js' )
	self.importScripts ( baseUrl + 'web3.js' )

    self.importScripts ( baseUrl + 'generatePassword.js' )
    self.importScripts ( baseUrl + 'storage.js' )
    self.importScripts ( baseUrl + 'seguroSetup.js' )
    workerReady = true
	
	self.addEventListener ('message', encryptWorkerDoCommand)
    channel.addEventListener('message', channelWorkerDoCommand )

	const cmd: worker_command = {
		cmd: 'READY',
		data: []
	}
	responseChannel.postMessage(JSON.stringify(cmd))
	
    checkStorage ()
}

const channelWorkerDoCommand = (e => {
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

	switch (cmd.cmd) {
		case 'urlProxy': {
			return preProxyConnect (cmd)
		}
		case 'saveDomain': {
			const domain: URL = cmd.data[0]
			const id = cmd.data[1]
			const node = cmd.data[2]
			const index = backGroundPoolWorker.findIndex(n => n.id === id)
			if (index > -1) {
				backGroundPoolWorker.splice(index)
			}
			return backGroundPoolWorker.push({id, domain, node})
		}
	
		case 'getDomain': {
			const id = cmd.data[0]
			if (id) {
				const index = backGroundPoolWorker.findIndex(n => n.id === id)
				if (index > -1) {
					cmd.data[1] = backGroundPoolWorker[index]
				} else {
					cmd.err = 'UNKNOW_ERROR'
				}
			} else {
				cmd.data[1] = backGroundPoolWorker[backGroundPoolWorker.length - 1]
				if (!cmd.data[1]) {
					cmd.err = 'INVALID_DATA'
				}
			}
			
			return responseChannel.postMessage(JSON.stringify(cmd))
		}
	
		case 'READY': {
			ClientIDworker = cmd.data[0]
			return logger (`Worker encryptWorkerDoCommand got READY ClientIDworker [${ClientIDworker}]`)
		}
	
		case 'getWorkerClientID' : {
			cmd.data = [ClientIDworker]
			logger (`Worker encryptWorkerDoCommand got getWorkerClientID ClientIDworker = [${ClientIDworker}]`)
			return responseChannel.postMessage(JSON.stringify(cmd))
		}
	
		default: {
			cmd.err = 'INVALID_COMMAND'
			responseChannel.postMessage(JSON.stringify(cmd))
			return console.log (`channelWorkerDoCommand unknow command!`)
		}
	}

})

/**
 * 		
 */


initEncryptWorker()

