
let passObj: passInit| null = null
let systemInitialization_UUID = ''
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

const responseChannel = new BroadcastChannel('toServiceWroker')
const databaseName = 'CoNET'
const channel = new BroadcastChannel('toMainWroker')
let activeNodes: nodes_info[]|null= null
let Liveness: XMLHttpRequest|null = null

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
	self.importScripts ( baseUrl + 'utilV2.js' )
    workerReady = true
	
	self.addEventListener ('message', encryptWorkerDoCommand)
    channel.addEventListener('message', channelWorkerDoCommand )

	const cmd: worker_command = {
		cmd: 'READY',
		data: []
	}

	responseChannel.postMessage(JSON.stringify(cmd))
	
    await checkStorage ()
	
}


const gettPrimaryProfile = () => {
	if (!CoNET_Data ||!CoNET_Data?.profiles) {
		return ''
	}
	const index = CoNET_Data.profiles.findIndex(n => n.isPrimary)
	const profiles = CoNET_Data.profiles[index]
	return profiles
}

const getAllNodes = async (cmd?: worker_command) => {

	const profile = gettPrimaryProfile()
	
	if (!profile||!profile.keyID) {
		if (cmd) {
			cmd.err = 'NOT_READY'
			returnUUIDChannel (cmd)
		}
		return
	}

	const nodes = await getAllNodesInfo()
	if (!nodes) {
		if (cmd) {
			cmd.err = 'TIMEOUT'
			returnUUIDChannel (cmd)
		}
		return
	}
	
	sendState('nodes', nodes)
	if (cmd) {
		cmd.data = [nodes]
		return returnUUIDChannel (cmd)
	}
	
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

const sendCONET = async (node: nodes_info, amount: string, profile: profile) => {
	const network = getRandomCoNETEndPoint()
	const wallet = node.wallet_addr
	const history = profile.tokens.conet.history

	const {eth} = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(network))
	const sendObj = {
		from     : '0x'+ profile.keyID?.substring(2),
		to       : '0x'+ wallet.substring(2),
		data     : ''
	}

	const balance = (await eth.getBalance(profile.keyID)).toString()


	const gas = (await eth.estimateGas(sendObj)).toString()
	const gasPrice = (await eth.getGasPrice()).toString()
	const totalGas = gas * gasPrice
	sendObj['gas'] = gas
	sendObj['gasPrice'] = gasPrice

	let _amount = parseFloat(amount)* wei - totalGas
	if ( balance < _amount) {
		_amount = balance - totalGas
	}
	sendObj['value'] = _amount.toString()
	const createTransaction = await eth.accounts.signTransaction( sendObj,'0x'+profile.privateKeyArmor.substring(2))
	
	let receipt: CryptoAssetHistory
	try {
		receipt = await eth.sendSignedTransaction (createTransaction.rawTransaction )
	} catch (ex) {
		logger (`sendCONET eth.sendSignedTransaction Error`, ex)
		return node
	}
	receipt.value = _amount/10**18
	receipt.isSend = true
	receipt.time = new Date().toISOString()
	receipt = changeBigIntToString (receipt)
	history.unshift (receipt)
	if (!node.receipt) {
		node.receipt = []
	}
	node.receipt.unshift(receipt)
	return node
}

const getNodeCollect = async (cmd: worker_command) => {
	const uu:regionType = cmd.data[0]
	const profile = gettPrimaryProfile()

	if (!activeNodes?.length || !CoNET_Data || !uu ||!profile ||!profile.keyID) {
		cmd.err = 'NOT_READY'
		return returnUUIDChannel(cmd)
	}
	const conetTokenBalance = profile.tokens.conet.balance
	if (conetTokenBalance <= '0') {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	
	const _nodes = activeNodes
	const k: string[] = []
	if (uu.sp) k.push('ES')
	if (uu.us) k.push ('US')
	if (uu.fr) k.push ('FR')
	if (uu.uk) k.push ('GB')
	if (uu.ge) k.push('DE')
	let SaaSNodes: nodes_info[]
	switch (k.length) {
		
		case 2: {
			SaaSNodes = [...getRandomRegionNode(filterNodes(_nodes, k[0]), 1), ...getRandomRegionNode(filterNodes(_nodes, k[1]), 1)]
			break
		}
		default :
		case 1: {
			SaaSNodes = getRandomRegionNode(filterNodes(_nodes, k[0]), 2)
			break
		}
	}
	const balance = parseFloat(profile.tokens.conet.balance)
	const sendAmount = balance / SaaSNodes.length
	for (let i = 0; i < SaaSNodes.length; i ++) {
		SaaSNodes[i]  = await sendCONET(SaaSNodes[i], sendAmount.toString(), profile)
	}

	profile.network.recipients.unshift(...SaaSNodes)
	cmd.data[0] = profile.network.recipients
	const url = `http://localhost:3001/conet-profile`
	postToEndpoint(url, true, { profile, activeNodes })
	return storeProfile (cmd, () => {
		return returnUUIDChannel (cmd)
	})
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
		//****************************************************************************************** */

		case 'getFaucet' : {
			cmd.data[0] = gettPrimaryProfile ()
			getFaucetCount++
			if (!cmd.data[0] || !cmd.data[0].keyID) {
				cmd.err = 'NO_UUID'
				return returnUUIDChannel (cmd)
			}
			cmd.data[0] = cmd.data[0].keyID
			return getFaucet (cmd, () => {
				logger (`getFaucetCount = [${getFaucetCount}]`)
				returnUUIDChannel (cmd)
			})
		}

        case 'getContainer': {
            return getContainer(cmd)
        }

		case 'setRegion': {
			return getNodeCollect(cmd)
		}

		case 'getRegiestNodes': {
			return getRegiestNodes (cmd)
		}

		case 'getAllNodes': {
			return getAllNodes(cmd)
		}

		case 'encrypt_createPasscode': {
			if ( !cmd.data || cmd.data.length < 2) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel ( cmd )
            }

            delete cmd.err
			const password = cmd.data[0]
			const referrer = cmd.data[2]
            await createNumberPasscode (password)
			await createPlatformFirstProfile ()
			if (CoNET_Data) {
				CoNET_Data.preferences = {
					langurge: cmd.data[1]
				}
			}
			await storage_StoreContainerData ()
			
			const data: encrypt_keys_object = {
				preferences: {
					preferences: {
						language: cmd.data[1]
					}
				},
				passcode: {
					status: 'UNLOCKED'
				},
				profiles: CoNET_Data?.profiles,
				isReady: true,
				clientPool: []
			}
		
			cmd.data = [data]

			return returnUUIDChannel (cmd)
		}

        case 'encrypt_TestPasscode': {

            if ( !cmd.data?.length || !passObj ) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }
			
            passObj.password = cmd.data[0]
			const referrer = cmd.data[1]
            await decodePasscode ()
			let privatekey
            try {
                privatekey = await makeContainerPGPObj()
               
            } catch (ex) {
                logger (`encrypt_TestPasscode get password error!`)
                cmd.err = 'FAILURE'
                return returnUUIDChannel(cmd)
            }
			if (CoNET_Data?.passcode?.status === 'UNLOCKED') {
				if (privatekey.privateKeyObj.isDecrypted()) {
					cmd.data = [CoNET_Data]
            		return returnUUIDChannel(cmd)
				}

                cmd.err = 'FAILURE'
                return returnUUIDChannel(cmd)
			}
			try{
				await decryptCoNET_Data_WithContainerKey ()
			} catch (ex){
				cmd.err = 'FAILURE'
                return returnUUIDChannel(cmd)
			}
			
            delete cmd.err
            if (!CoNET_Data) {
                logger (`encrypt_TestPasscode Error: Empty CoNET_Data!`)
                cmd.err = 'FAILURE'
                return returnUUIDChannel(cmd)
            }

            CoNET_Data.passcode = {
                status: 'UNLOCKED'
            }
        
            // const profiles = CoNET_Data.profiles
            // if ( profiles ) {
            //     for ( let i = 0; i < profiles.length; i++ ) {
			// 		const profile = profiles[i]
					
                    
			// 		// const current = profile.tokens
					
			// 		// current.cntp.balance = parseFloat(data.CNTP_Balance).toFixed(4)
			// 		// current.conet.balance = parseFloat(data.CONET_Balance).toFixed(4)
			// 		// profile.referrer = data.Referee === '0x0000000000000000000000000000000000000000' ? '': data.Referee
            //     }
                    
            // }
            

            cmd.data = [CoNET_Data]
            returnUUIDChannel(cmd)
			
            const profile = gettPrimaryProfile()
            if (activeNodes && activeNodes.length > 0) {
                const url = `http://localhost:3001/conet-profile`
                postToEndpoint(url, true, { profile, activeNodes })
				.then(() => {
					return getAllNodes()
				})
				.catch(ex => {
					logger (`postToEndpoint Error!`, ex)
					return getAllNodes()
				})
                // fetchProxyData(`http://localhost:3001/getProxyusage`, data=> {
                //     logger (`fetchProxyData GOT DATA FROM locathost `, data)
                // })
            }
			if (profile) {
				getProfileAssetsBalance(profile)
				if (!profile.referrer && referrer) {
					await registerReferrer(referrer)
					profile.referrer = referrer
				}
			}
			

			return getAllNodes()
        }

        case 'SaaSRegister': {
            return logger (`processCmd on SaaSRegister`)
        }

		case 'encrypt_deletePasscode': {
            
			cmd.data = [initNullSystemInitialization()]
			returnUUIDChannel (cmd)
			await deleteExistDB()
			
        }

		case 'startProxy': {
			const profile = gettPrimaryProfile()
			if (!activeNodes?.length ) {
				activeNodes = await _getSINodes ('CUSTOMER_REVIEW', 'USA')
				logger (activeNodes)
			}

			if (profile && activeNodes && activeNodes.length > 0) {
				
				const url = `http://localhost:3001/conet-profile`
                await postToEndpoint(url, true, { profile, activeNodes })
                // fetchProxyData(`http://localhost:3001/getProxyusage`, '', data=> {
                //     logger (`fetchProxyData GOT DATA FROM locathost `, data)
                // })
				return returnUUIDChannel(cmd)
			}
			cmd.err = 'FAILURE'
			return returnUUIDChannel(cmd)
		}

		case 'ipaddress': {
			
			const url = `http://localhost:3001/ipaddress`
			cmd.data = [await postToEndpoint(url, false, '')]
			
			return returnUUIDChannel(cmd)
			
		}

		case 'startLiveness': {
			return startLiveness(cmd)
		}

		case 'syncAsset': {
			const profile = gettPrimaryProfile()
			if (profile) {
				return getProfileAssetsBalance(profile)
			}
			
		}

		case 'stopLiveness': {
			return stopLiveness(cmd)
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

		case 'referrerList': {
			return referrerList(cmd)
		}

		case 'isLivenessRunning': {
			cmd.data = []
			if (Liveness) {
				cmd.data = LivenessCurrentData
				LivenessListen.push(cmd)
			}
			return returnUUIDChannel(cmd)
		}

		case 'getAllNodes': {
			cmd.data = [{balance:CNTP_Balance, nodes:allNodes}]
			return returnUUIDChannel(cmd)
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

const rework = () => {
	const hours = 0
	const staking = 900
	const returnRate = 0.5
	const totalMins = 43200
	const hoursRate = returnRate / (totalMins * 12)

}

const returnNullContainerUUIDChannel = async (cmd: worker_command) => {
    delete cmd.err
    initNullSystemInitialization()
    cmd.data = ['NoContainer']
    returnUUIDChannel ( cmd )
}

const getContainer = async (cmd: worker_command) => {
    const database = new PouchDB( databaseName, { auto_compaction: true })
    let doc
	let initData: CoNETIndexDBInit
    try {
		doc = await database.get ('init', {latest: true})
		initData = JSON.parse ( buffer.Buffer.from (doc.title,'base64').toString ())
	} catch (ex) {
        logger (`checkStorage have no CoNET data in IndexDB, INIT CoNET data`)
		return returnNullContainerUUIDChannel (cmd)
	}
    if ( !initData.container || !initData.id ) {
		logger (`checkStorage have not USER profile!`)
		return returnNullContainerUUIDChannel (cmd)
	}

    containerKeyObj = {
		privateKeyArmor: initData.container.privateKeyArmor,
		publicKeyArmor: initData.container.publicKeyArmor
	}

	passObj = initData.id
	preferences = initData.preferences
	systemInitialization_UUID = initData.uuid
	doc = await getUUIDFragments (systemInitialization_UUID)

    CoNET_Data = {
		isReady: false,
		encryptedString: doc.title,
		clientPool: []
	}

	const data: systemInitialization = {
		preferences: preferences,
		passcode: {
			status: 'LOCKED'
		},
	}
	cmd.data = ['ContainerLocked']
	returnUUIDChannel (cmd)
	if (!activeNodes?.length ) {
		activeNodes = await _getSINodes ('CUSTOMER_REVIEW', 'USA')
		logger (activeNodes)
	}
             //already init database
    // fetchProxyData(`http://localhost:3001/connecting`,'', data => {
    //     processCmd (data)
    // })
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

const startLiveness = async (cmd: worker_command) => {
	const profile = gettPrimaryProfile()
	if (!profile) {
		cmd.err = 'NOT_READY'
		return returnUUIDChannel (cmd)
	}
	const referrals = cmd.data[0]
	const message =JSON.stringify({ walletAddress: profile.keyID, referrals })
	const messageHash = CoNETModule.EthCrypto.hash.keccak256(message)
	const signMessage = CoNETModule.EthCrypto.sign( profile.privateKeyArmor, messageHash )
	const request = {
		message, signMessage
	}
	const initBalance = await getProfileAssetsBalance(profile)

	if (initBalance) {
		profile.tokens.conet.balance = initBalance.CONET_Balance
		CNTP_Balance = profile.tokens.cntp.balance = initBalance.CNTP_Balance
	}

	let first = true
	let startCNTP_balance = isNaN(parseFloat(CNTP_Balance))?0:parseFloat(CNTP_Balance)
	let init = false
	let data = null
	let listenServerTimeout:NodeJS.Timeout|0 = 0
	let listenServerTimeoutCount = -1

	const listenServerTimeoutProcess = () => {
		clearTimeout(listenServerTimeout)
		++listenServerTimeoutCount
		logger(`listenServerTimeoutCount =[${listenServerTimeoutCount}]`)
		if (listenServerTimeoutCount<listenServerTimeCountMaximum) {
			return listenServerTimeout = setTimeout(listenServerTimeoutProcess, listenServerTime)
			
		}
		cmd.data = ['DISCONNECT']
		Liveness = null
		returnUUIDChannel(cmd)
		LivenessListen.forEach(n => {
			return returnUUIDChannel(cmd)
		})
	}

	Liveness = postToEndpointSSE(LivenessURL1, true, JSON.stringify(request), async (err, _data) => {
		
		try{
			data = JSON.parse(_data)
		} catch(ex) {
			logger(`Liveness response Unexpected JSON!`, _data)
		}

		if (first) {
			if (err) {
				cmd.data = [err]
				Liveness = null
				return returnUUIDChannel(cmd)
			}
			listenServerTimeoutProcess()
			first = false
			LivenessCurrentData = cmd.data = [CNTP_Balance, "0", data]
            return returnUUIDChannel(cmd)
		}

		clearTimeout(listenServerTimeout)
		listenServerTimeoutCount = -1
		listenServerTimeoutProcess()
		

		const initBalance = await getProfileAssetsBalance(profile)
		if (initBalance) {
			if (getProfileAssetsBalanceResult.lastTime && !init) {
				init = true
				startCNTP_balance = parseFloat(initBalance.CNTP_Balance)
			}
			const current_CNTP_balance = parseFloat(initBalance.CNTP_Balance) - startCNTP_balance
			LivenessCurrentData = [initBalance.CNTP_Balance, current_CNTP_balance.toFixed(4), data]
			profile.tokens.conet.balance = initBalance.CONET_Balance
		}
		LivenessCurrentData[2] = data
	
		cmd.data = LivenessCurrentData
		sendState('cntp-balance', {CNTP_Balance, CONET_Balance: profile.tokens.conet.balance, currentCNTP: LivenessCurrentData[1]})
		returnUUIDChannel(cmd)
		LivenessListen.forEach(n => {
			n.data = LivenessCurrentData
			return returnUUIDChannel(n)
		})
	})
}

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
