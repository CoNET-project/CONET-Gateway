
let passObj: passInit| null = null

let workerReady = false
let CoNET_Data: encrypt_keys_object | null = null
let containerKeyObj: keyPair|null = null
let preferences: any = null
const CoNET_SI_Network_Domain = 'https://openpgp.online:4001'
const conet_DL_endpoint = `${ CoNET_SI_Network_Domain }/api/conet-faucet`
const conet_DL_getUSDCPrice_Endpoint = `${ CoNET_SI_Network_Domain }/api/conet-price`
const conet_DL_getSINodes = `${ CoNET_SI_Network_Domain }/api/conet-si-list`
const conet_DL_authorizeCoNETCashEndpoint = `${ CoNET_SI_Network_Domain }/api/authorizeCoNETCash`
const conet_DL_regiestProfile = `${ CoNET_SI_Network_Domain }/api/regiestProfileRoute`
const conet_DL_publishGPGKeyArmored = `${ CoNET_SI_Network_Domain }/api/publishGPGKeyArmored`
const conet_DL_Liveness = `${ CoNET_SI_Network_Domain }/api/livenessListening`
const gasFee = 30000
const wei = 10**18
const gwei = 10**9
const denominator = 1000000000000000000
const gasFeeEth = 0.000526
const GasToEth = 0.00000001
const mintCoNETCashEndpoint = `${ CoNET_SI_Network_Domain }/api/mint_conetcash`
const openSourceEndpoint = 'https://s3.us-east-1.wasabisys.com/conet-mvp/router/'


const databaseName = 'CoNET'

let activeNodes: nodes_info[]|null= null
let Liveness: XMLHttpRequest|null = null

/**
 * 				CONET Platform
 * 
 */

const workerReadyChannel = 'conet-platform'
const workerProcessChannel = 'workerLoader'
const channelWrokerListenName = 'toMainWroker'
const responseChannel = new BroadcastChannel('toServiceWroker')


const channel = new BroadcastChannel(channelWrokerListenName)
/** */
let platform: conetPlatform = {
	passcode: 'NONE'
}

const LivenessListen: worker_command[] = []

const CoNETModule: CoNET_Module = {
	EthCrypto: null,
	Web3Providers:  null,
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
	
    const baseUrl = self.name + '/utilities/'
	const channelLoading = new BroadcastChannel(workerProcessChannel)
	const channelPlatform = new BroadcastChannel(workerReadyChannel)
    self.importScripts ( baseUrl + 'Buffer.js' )
	channelLoading.postMessage(10)
    self.importScripts ( 'https://cdn.jsdelivr.net/npm/openpgp@5.11.1/dist/openpgp.min.js' )
    self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/uuid/8.3.2/uuid.min.js' )
	self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/pouchdb/8.0.1/pouchdb.min.js' )
	self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/async/3.2.5/async.min.js' )
	self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' )
	self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/jimp/0.22.12/jimp.min.js')
	channelLoading.postMessage(30)
	// self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/forge/1.3.1/forge.min.js' )
    //self.importScripts ( baseUrl + 'Pouchdb.js' )
    // self.importScripts (  baseUrl + 'PouchdbFind.js' )
    // self.importScripts ( baseUrl + 'PouchdbMemory.js' )
    self.importScripts ( baseUrl + 'scrypt.js' )
    // self.importScripts ( baseUrl + 'async.js' )
    self.importScripts ( baseUrl + 'forge.all.min.js' )	
	channelLoading.postMessage(50)
    //self.importScripts ( baseUrl + 'openpgp.min.js' )
    self.importScripts ( baseUrl + 'utilities.js' )
	self.importScripts ( baseUrl + 'web3Util.js' )
    self.importScripts ( baseUrl + 'generatePassword.js' )
    self.importScripts ( baseUrl + 'storage.js' )
	channelLoading.postMessage(70)
    // self.importScripts ( baseUrl + 'seguroSetup.js' )
	self.importScripts ( baseUrl + 'utilV2.js' )
	self.importScripts ( baseUrl + 'CoNETModule.js' )
	self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.12.1/ethers.umd.min.js' )
    workerReady = true
	channelLoading.postMessage(90)
	self.addEventListener ('message', encryptWorkerDoCommand)
    channel.addEventListener('message', channelWorkerDoCommand )

	const cmd: worker_command = {
		cmd: 'READY',
		data: [],

	}

	responseChannel.postMessage(JSON.stringify(cmd))
	
    await checkStorage (channelPlatform)
	
}

const gettPrimaryProfile = () => {
	if (!CoNET_Data ||!CoNET_Data?.profiles) {
		return ''
	}
	const index = CoNET_Data.profiles.findIndex(n => n.isPrimary)
	const profiles = CoNET_Data.profiles[index]
	return profiles
}

const returnUUIDChannel = (cmd: worker_command) => {
	if (!cmd.uuid) {
		return logger(`getPrimaryBalance cmd uuid is null`, cmd)
	}
	const sendChannel = new BroadcastChannel(cmd.uuid)
	sendChannel.postMessage (JSON.stringify(cmd))
	sendChannel.close()
}

const getRandomRegionNode = (nodes: nodes_info[], count: number) => {

	const uu = nodes.slice(0, count)
	return uu
	
}

const filterNodes = (_nodes: nodes_info[], key: string) => {
	const u = new RegExp(key, 'i')
	const ret = _nodes.filter (n => u.test(n.country))
	return ret
}

const getRegiestNodes = (cmd: worker_command) => {
	const profile = gettPrimaryProfile()
	if (!profile) {
		cmd.err = 'NOT_READY'
		return returnUUIDChannel (cmd)
	}
	cmd.data[0] = profile.network.recipients
	return returnUUIDChannel (cmd)
}

const channelWorkerDoCommand = (async e => {
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
    processCmd(cmd)

})

const responseLocalHost = async (cmd: worker_command) => {
    const url = `http://localhost:3001/connectingResponse`
    const connect = await fetch (url, {
        method: "POST",
        headers: {
            Accept: "text/event-stream",
            "Content-Type": 'application/json;charset=UTF-8'
        },
        body: JSON.stringify({data: cmd}),
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
    })
    .then (value => value.json())
    .then(data=> {
        logger(`responseLocalHost =========>`, data)
    })
    .catch (ex=> {
        logger (`responseLocalHost Error`, ex)
    })
}

let getFaucetCount = 0

const processCmd = async (cmd: worker_command) => {
    switch (cmd.cmd) {

		case 'claimToken': {
			const _profile: profile = cmd.data[0]
			const assetName = cmd.data[1]
			if (!_profile ||!assetName||!CoNET_Data?.profiles) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const index = CoNET_Data.profiles.findIndex(n => n.keyID.toLowerCase() ===  _profile.keyID.toLowerCase())
			if (index < 0) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			return claimToken(CoNET_Data.profiles[index], CoNET_Data, assetName, cmd)
		}
		
		case 'urlProxy': {
			return preProxyConnect (cmd)
		}

		case 'startMining': {
			return startMining (cmd)
		}

		case 'stopMining': {
			
			if (miningConn) {
				miningConn.abort()
				Stoping = true
				setTimeout(() => {
					Stoping = false
					return returnUUIDChannel(cmd)
				}, 12000)
				return
			}
			return returnUUIDChannel(cmd)
		}

		case 'unlock_cCNTP': {
			const [_profile] = cmd.data
			if (!_profile) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const profiles = CoNET_Data?.profiles
			if (!profiles) {
				cmd.err = 'NOT_READY'
				return returnUUIDChannel(cmd)
			}
			const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === _profile.keyID.toLowerCase())
			if (profileIndex < 0) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const profile = profiles[profileIndex]
			if (parseFloat(profile.tokens.cCNTP.balance) < 0.001|| profile.tokens.cCNTP?.unlocked) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const result = await unlock_cCNTP(profile)
			if (!result) {
				cmd.err = 'FAILURE'
				return returnUUIDChannel(cmd)
			}
			profile.tokens.cCNTP.unlocked = true
			returnUUIDChannel(cmd)
			await updateProfilesVersion()
		}

		case 'guardianPurchase': {
			const [nodes, amount, profile, payAssetName] = cmd.data

			if (!nodes||!amount||!profile|| !payAssetName) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}

			const profiles = CoNET_Data?.profiles
			if (!profiles) {
				cmd.err = 'NOT_READY'
				return returnUUIDChannel(cmd)
			}

			const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === profile.keyID.toLowerCase())
			if (profileIndex < 0) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}

			const health = await getCONET_api_health()
			if (!health) {
				cmd.err = 'Err_Server_Unreachable'
				return returnUUIDChannel(cmd)
			}

			sendState('beforeunload', true)
			const kk = await CONET_guardian_purchase (profile, nodes, amount, payAssetName)
			sendState('beforeunload', false)
			if (kk !== true) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const cmd1: channelWroker = {
				cmd: 'purchaseStatus',
				data: [4]
			}
			sendState('toFrontEnd', cmd1)
			return returnUUIDChannel(cmd)
		}

		case 'burnCCNTP': {
			const [_profile, total] = cmd.data
			if (!_profile) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const profiles = CoNET_Data?.profiles
			if (!profiles) {
				cmd.err = 'NOT_READY'
				return returnUUIDChannel(cmd)
			}
			const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === _profile.keyID.toLowerCase())
			if (profileIndex < 0) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}

			const profile = profiles[profileIndex]
			if ( !profile.tokens.cCNTP?.unlocked || parseFloat(profile.tokens.cCNTP.balance)< parseFloat(total)) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const tx = burnCCNTP (profile, total)
			if (!tx) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			cmd.data = [tx]
			return returnUUIDChannel(cmd)
		}

		case 'preBurnCCNTP': {
			const [_profile, total] = cmd.data
			if (!_profile) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const profiles = CoNET_Data?.profiles
			if (!profiles) {
				cmd.err = 'NOT_READY'
				return returnUUIDChannel(cmd)
			}
			const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === _profile.keyID.toLowerCase())
			if (profileIndex < 0) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}

			const profile = profiles[profileIndex]
			if ( !profile.tokens.cCNTP?.unlocked || parseFloat(profile.tokens.cCNTP.balance)< parseFloat(total)) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const gasFee = preBurnCCNTP (profile, total)
			if (!gasFee) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			cmd.data = [gasFee]
			return returnUUIDChannel(cmd)
		}

		case 'prePurchase': {
			return prePurchase(cmd)
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

		case 'fx168PrePurchase': {
			return fx168PrePurchase (cmd)
		}

		case 'CONETFaucet': {
			
			const health = await getCONET_api_health()
			if (!health) {
				cmd.err = 'Err_Server_Unreachable'
				return returnUUIDChannel(cmd)
			}
			const keyID = cmd.data[0]
			cmd.data = [await getFaucet(keyID)]
			return returnUUIDChannel(cmd)
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

		case 'showSRP': {
			return showSRP(cmd)
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

		case 'createAccount': {
			return createAccount(cmd)
		}

        case 'getContainer': {
			cmd.data = [platform]
            return returnUUIDChannel ( cmd )
        }

		// case 'setRegion': {
		// 	return getNodeCollect(cmd)
		// }

		case 'getRegiestNodes': {
			return getRegiestNodes (cmd)
		}

		// case 'getAllNodes': {
		// 	return getAllNodes(cmd)
		// }

		case 'testPasscode': {
			
			return testPasscode(cmd)
		}

		case 'importWallet': {
			return importWallet(cmd)
		}

        case 'SaaSRegister': {
            return logger (`processCmd on SaaSRegister`)
        }

		case 'encrypt_deletePasscode': {
            
			cmd.data = [initNullSystemInitialization()]
			returnUUIDChannel (cmd)
			return await deleteExistDB()
			
        }

		case 'startProxy': {
			// const profile = gettPrimaryProfile()
			// const region: string = cmd.data[0]
			// const nodes = await getAllNodesInfo()
			// if (profile && nodes !== null && nodes.node.length ) {
			// 	const activeNodes = nodes.node
			// 	let _activeNodes = JSON.parse(JSON.stringify(nodes.node))
			// 	if (region && region !=='none' ) {
			// 		_activeNodes = nodes.node.filter(n => n.country === region )
			// 	}
			// 	if (_activeNodes?.length) {
			// 		//@ts-ignore
			// 		profile.network.recipients = _activeNodes
					
			// 		const url = `http://localhost:3001/conet-profile`
			// 		await postToEndpoint(url, true, { profile, activeNodes })
			// 		// fetchProxyData(`http://localhost:3001/getProxyusage`, '', data=> {
			// 		//     logger (`fetchProxyData GOT DATA FROM locathost `, data)
			// 		// })
			// 		return returnUUIDChannel(cmd)
			// 	}
				
			// }
			
			cmd.err = 'FAILURE'
			return returnUUIDChannel(cmd)
		}

		case 'ipaddress': {
			
			const url = `http://localhost:3001/ipaddress`
			cmd.data = [await postToEndpoint(url, false, '')]
			
			return returnUUIDChannel(cmd)
			
		}

		case 'startLiveness': {
			return //startLiveness(cmd)
		}

		case 'syncAssetV1': {
			const profile = gettPrimaryProfile()
			if (profile) {
				return getProfileAssetsBalance(profile)
			}
			return
		}

		case 'registerReferrer': {
			const referrer = cmd.data[0]
			if (!referrer) {
				cmd.err='FAILURE'
				returnUUIDChannel(cmd)
			}
			const isAddr = CoNETModule.Web3Eth.utils.isAddress(referrer)

			if (!isAddr) {
				cmd.err='FAILURE'
				return returnUUIDChannel(cmd)
			}
			const result = await registerReferrer(referrer)
			if (result === false)  {
				cmd.err='FAILURE'
				return returnUUIDChannel(cmd)
			}
			return returnUUIDChannel(cmd)
		}

		case 'getRefereesList': {
			return getReferrerList(cmd)
		}

		case 'recoverAccount': {
			return recoverAccount(cmd)
		}

		case 'getAllProfiles': {
			return getAllProfiles(cmd)
		}

		case 'updateProfile': {
			return updateProfile(cmd)
		}

		case 'addProfile': {
			return addProfile (cmd)
		}

		case 'resetPasscode': {
			return resetPasscode (cmd)
		}

		default: {
			cmd.err = 'INVALID_COMMAND'
			responseChannel.postMessage(JSON.stringify(cmd))
			return console.log (`channelWorkerDoCommand unknow command!`, cmd)
		}
	}
}

/**
 * 		
 */


initEncryptWorker()


const fetchProxyData = async (url: string, data: string, callBack: (err, data: any) => void) => {

    const xhr = new XMLHttpRequest()
	
    let last_response_len = 0

	xhr.onprogress = (e) => {
        const req = xhr.response
        clearTimeout(timeCheck)
        if (xhr.status !== 200) {
            logger (`fetchProxyData get status [${xhr.status}] !== 200 STOP connecting!`)
			xhr.abort()
            return callBack(xhr.status, null)
        }
		const responseText = req.substr(last_response_len)
        last_response_len = req.length
        responseText.split('\r\n\r\n')
            .filter((n: string) => n.length)
            .forEach((n: any, index: number) => {
                let obj
                try {
                    obj = JSON.parse(n)
                } catch(ex) {
                    return logger(`fetchProxyData responseText JSON parse Error typeof [${typeof n}]`, n)
                }
                logger (`fetchProxyData Got Stream data typeof data[${typeof obj}][${obj.length}]`, n)
                return callBack (null, obj)
            })
	}

	const timeCheck = setTimeout(() => {     /* vs. a.timeout */
		xhr.abort()
		return callBack('timeout', null)
    }, 10000)

	xhr.open('POST', url, true)
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
	xhr.setRequestHeader('Cache-Control', 'no-cache')
    //xhttp.setRequestHeader('Accept', 'text/event-stream')
    xhr.send(data)
	

    // const connect = await fetch (url, {
    //     method: "POST",
    //     headers: {
    //         Accept: "text/event-stream",
    //         "Content-Type": 'application/json;charset=UTF-8'
    //     },
    //     body: JSON.stringify({data: node.ip_addr}),
    //     cache: 'no-store',
    //     referrerPolicy: 'no-referrer'
    // })
    // .then (value => value.json())
    // .then(data=> {
    //     logger(`fetchData =========>`)
    //     logger (data)
    // })
    // logger (`fetchProxyData [${url}]`)
}


const returnNullContainerUUIDChannel = async (cmd: worker_command) => {
    delete cmd.err
    initNullSystemInitialization()
    cmd.data = ['NoContainer']
    returnUUIDChannel ( cmd )
}


//	for production
const LivenessURL1 = 'https://api.openpgp.online:4001/api/livenessListening'
const LivenessStopUrl = `https://api.openpgp.online:4001/api/stop-liveness`



//	for debug
// const LivenessURL1 = 'http://104.152.210.149:4001/api/livenessListening'
// const LivenessStopUrl = `http://104.152.210.149:4001/api/stop-liveness`

let LivenessCurrentData = ['','',null]


//	Detect interruption of information from the server
const listenServerTime = 6 * 1000
const listenServerTimeCountMaximum = 4

const stopLivenessUrl = 'https://api.openpgp.online:4001/api/livenessStop'
const stopLiveness = async (cmd: worker_command) => {
	const profile = gettPrimaryProfile()
	if (!profile) {
		cmd.err = 'NOT_READY'
		return returnUUIDChannel (cmd)
	}

	if (Liveness && typeof Liveness.abort === 'function') {
		Liveness.abort()
	}
	Liveness = null
	const message =JSON.stringify({ walletAddress: profile.keyID })
	const messageHash = CoNETModule.EthCrypto.hash.keccak256(message)
	const signMessage = CoNETModule.EthCrypto.sign( profile.privateKeyArmor, messageHash )
	const data = {
		message, signMessage
	}
	postToEndpoint(LivenessStopUrl, true, data).then(n => {
		return returnUUIDChannel(cmd)
	}).catch(ex=> {
		return returnUUIDChannel(cmd)
	})
	
}
