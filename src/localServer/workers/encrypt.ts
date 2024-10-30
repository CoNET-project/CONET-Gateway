
let passObj: passInit| null = null
let workerReady = false
let CoNET_Data: encrypt_keys_object | null = null
let containerKeyObj:keyPair|null = null
let preferences: any = null

const logger = (...argv: any ) => {
    const date = new Date ()
    const dateStrang = `%c [Seguro-worker INFO ${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}]`
	
    return console.log ( dateStrang, 'color: #dcde56',  ...argv)
}

const CoNET_SI_Network_Domain = 'https://openpgp.online:4001'

const conet_DL_getUSDCPrice_Endpoint = `${CoNET_SI_Network_Domain}/api/conet-price`
const conet_DL_getSINodes = `${CoNET_SI_Network_Domain}/api/conet-si-list`;
const conet_DL_authorizeCoNETCashEndpoint = `${CoNET_SI_Network_Domain}/api/authorizeCoNETCash`
const conet_DL_regiestProfile = `${CoNET_SI_Network_Domain}/api/regiestProfileRoute`
const conet_DL_publishGPGKeyArmored = `${CoNET_SI_Network_Domain}/api/publishGPGKeyArmored`
const conet_DL_Liveness = `${CoNET_SI_Network_Domain}/api/livenessListening`
const gasFee = 30000
const wei = 10 ** 18
const gwei = 10 ** 9
const denominator = 1000000000000000000
const gasFeeEth = 0.000526
const GasToEth = 0.00000001
const mintCoNETCashEndpoint = `${CoNET_SI_Network_Domain}/api/mint_conetcash`
const openSourceEndpoint = 'https://s3.us-east-1.wasabisys.com/conet-mvp/router/'
const databaseName = 'CoNET'
let activeNodes = null
let Liveness:XMLHttpRequest|null = null
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
let platform = {
    passcode: 'NONE'
}

const LivenessListen = []

const CoNETModule: CoNET_Module = {
	EthCrypto: null,
    aesGcmEncrypt: async (plaintext, password) => {
        const pwUtf8 = new TextEncoder().encode(password); // encode password as UTF-8
        const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8); // hash the password
        const iv = crypto.getRandomValues(new Uint8Array(12)); // get 96-bit random iv
        const ivStr = Array.from(iv).map(b => String.fromCharCode(b)).join(''); // iv as utf-8 string
        const alg = { name: 'AES-GCM', iv: iv }; // specify algorithm to use
        const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']); // generate key from pw
        const ptUint8 = new TextEncoder().encode(plaintext); // encode plaintext as UTF-8
        const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8); // encrypt plaintext using key
        const ctArray = Array.from(new Uint8Array(ctBuffer)); // ciphertext as byte array
        const ctStr = ctArray.map(byte => String.fromCharCode(byte)).join(''); // ciphertext as string
        return btoa(ivStr + ctStr);
    },
    aesGcmDecrypt: async (ciphertext, password) => {
        const pwUtf8 = new TextEncoder().encode(password); // encode password as UTF-8
        const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8); // hash the password
        const ivStr = atob(ciphertext).slice(0, 12); // decode base64 iv
        const iv = new Uint8Array(Array.from(ivStr).map(ch => ch.charCodeAt(0))); // iv as Uint8Array
        const alg = { name: 'AES-GCM', iv: iv }; // specify algorithm to use
        const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']); // generate key from pw
        const ctStr = atob(ciphertext).slice(12); // decode base64 ciphertext
        const ctUint8 = new Uint8Array(Array.from(ctStr).map(ch => ch.charCodeAt(0))); // ciphertext as Uint8Array
        // note: why doesn't ctUint8 = new TextEncoder().encode(ctStr) work?
        try {
            const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8); // decrypt ciphertext using key
            const plaintext = new TextDecoder().decode(plainBuffer); // plaintext from ArrayBuffer
            return plaintext; // return the plaintext
        }
        catch (e) {
            throw new Error('Decrypt failed');
        }
    }
}

let ClientIDworker = ''
const backGroundPoolWorker: clientPoolWroker[]  = []
self.onhashchange = () => {
    channel.removeEventListener('message', channelWorkerDoCommand)
    self.removeEventListener('message', encryptWorkerDoCommand)
}

const initEncryptWorker = async () => {

    const baseUrl = self.name + '/utilities/'
	const channelLoading = new BroadcastChannel(workerProcessChannel)
	const channelPlatform = new BroadcastChannel(workerReadyChannel)
    self.importScripts ( baseUrl + 'Buffer.js' )
	logger(`workerProcess: [10]`)
	channelLoading.postMessage(10)
    self.importScripts ( 'https://cdn.jsdelivr.net/npm/openpgp@5.11.2/dist/openpgp.min.js' )
    self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/uuid/8.3.2/uuid.min.js' )
	self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/pouchdb/9.0.0/pouchdb.min.js' )
	self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/async/3.2.5/async.min.js' )
	self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' )
	self.importScripts ( 'https://cdnjs.cloudflare.com/ajax/libs/jimp/0.22.12/jimp.min.js')
	logger(`workerProcess: [30]`)
	channelLoading.postMessage(30)
	//self.importScripts ( 'https://cdn.jsdelivr.net/npm/eth-crypto@2.6.0/dist/lib/index.min.js' )

    //self.importScripts ( baseUrl + 'Pouchdb.js' )
    // self.importScripts (  baseUrl + 'PouchdbFind.js' )
    self.importScripts ( baseUrl + 'smartContractABI.js' )
	//self.importScripts(baseUrl + 'CoNETModule.js')
    self.importScripts(baseUrl + 'scrypt.js')
    // self.importScripts ( baseUrl + 'async.js' )

    //self.importScripts(baseUrl + 'forge.all.min.js')

    channelLoading.postMessage(50)
	logger(`workerProcess: [50]`)
    //self.importScripts ( baseUrl + 'openpgp.min.js' )
    self.importScripts(baseUrl + 'utilities.js')
    self.importScripts(baseUrl + 'web3Util.js')
    self.importScripts(baseUrl + 'generatePassword.js')
    self.importScripts(baseUrl + 'storage.js')
    channelLoading.postMessage(70)
	logger(`workerProcess: [70]`)
    // self.importScripts ( baseUrl + 'seguroSetup.js' )
    self.importScripts(baseUrl + 'utilV2.js')
	self.importScripts(baseUrl + 'miningV2.js')
    
    self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js')
    workerReady = true
    channelLoading.postMessage(90)
	logger(`workerProcess: [90]`)
    self.addEventListener('message', encryptWorkerDoCommand)
    channel.addEventListener('message', channelWorkerDoCommand)
    const cmd = {
        cmd: 'READY',
        data: [],
    }
    responseChannel.postMessage(JSON.stringify(cmd))
    provideCONET = new ethers.JsonRpcProvider(conet_rpc)
    await checkStorage(channelPlatform)
    listenProfileVer()
}

const gettPrimaryProfile = () => {
    if (!CoNET_Data || !CoNET_Data?.profiles) {
        return ''
    }
    const index = CoNET_Data.profiles.findIndex(n => n.isPrimary);
    const profiles = CoNET_Data.profiles[index];
    return profiles
}

const returnUUIDChannel = (cmd) => {
    if (!cmd.uuid) {
        return logger(`getPrimaryBalance cmd uuid is null`, cmd);
    }
    const sendChannel = new BroadcastChannel(cmd.uuid)
    sendChannel.postMessage(JSON.stringify(cmd))
    sendChannel.close()
}

const getRandomRegionNode = (nodes, count) => {
    const uu = nodes.slice(0, count)
    return uu
}

const filterNodes = (_nodes, key) => {
    const u = new RegExp(key, 'i')
    const ret = _nodes.filter(n => u.test(n.country))
    return ret
}
const channelWorkerDoCommand = (async (e) => {
    const jsonData = buffer.Buffer.from(e.data).toString()
    let cmd
    try {
        cmd = JSON.parse(jsonData)
    }
    catch (ex) {
        return console.dir(ex)
    }
    if (!workerReady) {
        cmd.err = 'NOT_READY'
        return returnCommand(cmd)
    }
    processCmd(cmd)
})

const responseLocalHost = async (cmd) => {
    const url = `http://localhost:3001/connectingResponse`;
    const connect = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "text/event-stream",
            "Content-Type": 'application/json;charset=UTF-8'
        },
        body: JSON.stringify({ data: cmd }),
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
    })
        .then(value => value.json())
        .then(data => {
        logger(`responseLocalHost =========>`, data);
    })
        .catch(ex => {
        logger(`responseLocalHost Error`, ex);
    });
}

let getFaucetCount = 0

const processCmd = async (cmd: worker_command) => {
    switch (cmd.cmd) {

        case 'startMining': {
            return startMining(cmd)
        }
		
        case 'stopMining': {
			if (miningConn && typeof miningConn?.abort === 'function') {
				miningConn.abort()
				miningConn = null
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
                cmd.err = 'NOT_READY';
                return returnUUIDChannel(cmd)
            }
            const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === _profile.keyID.toLowerCase())
            if (profileIndex < 0) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }
            const profile = profiles[profileIndex]

            returnUUIDChannel(cmd)
            needUpgradeVer = epoch + 25
            return
        }

        case 'guardianPurchase': {
            const [nodes, amount, profile, payAssetName] = cmd.data
            if (!nodes || !amount || !profile || !payAssetName) {
                const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)
            }
            const profiles = CoNET_Data?.profiles
            if (!profiles) {
                const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)
            }

            const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === profile.keyID.toLowerCase())
            if (profileIndex < 0) {
                const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)
            }
			
            const health = await getCONET_api_health()
            if (!health) {
                const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)
            }

            sendState('beforeunload', true)
            const kk = await CONET_guardian_purchase(profile, nodes, amount, payAssetName);
            sendState('beforeunload', false)

            if (kk !== true) {
                const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)
            }
            const cmd1 = {
                cmd: 'purchaseStatus',
                data: [4]
            }
            sendState('toFrontEnd', cmd1)
            return returnUUIDChannel(cmd)
        }

		case 'CONETianPlanPurchase': {
			const [referrer, amount, profile, payAssetName] = cmd.data
			returnUUIDChannel(cmd)

            if (!referrer || amount?.length !== 4 || !profile || !payAssetName) {
				const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)
				
            }

            const profiles = CoNET_Data?.profiles
            if (!profiles) {
                const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)

            }

            const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === profile.keyID.toLowerCase())
            if (profileIndex < 0) {
                const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)
				
            }
			
            const health = await getCONET_api_health()
            if (!health) {
                const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)
            }

            sendState('beforeunload', true)
            const kk = await CONETianPlan_purchase(referrer, profile, amount, payAssetName)
            sendState('beforeunload', false)

            if (kk !== true) {
                const cmd1 = {
					cmd: 'purchaseStatus',
					data: [-1]
				}
				return sendState('toFrontEnd', cmd1)
            }

            const cmd1 = {
                cmd: 'purchaseStatus',
                data: [4]
            }

            return sendState('toFrontEnd', cmd1)

		}

        case 'transferToken': {
            const [amount, sourceProfileKeyID, assetName, toAddress] = cmd.data
            if (!assetName || !toAddress || !amount || !sourceProfileKeyID) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }
            if (!getAddress(toAddress) && !getAddress(sourceProfileKeyID)) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }
            const profiles = CoNET_Data?.profiles
            if (!profiles) {
                cmd.err = 'NOT_READY'
                return returnUUIDChannel(cmd)
            }
            const profileIndex = profiles.findIndex((n) => n.keyID.toLowerCase() === sourceProfileKeyID.toLowerCase())
            if (profileIndex < 0) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }

            const sourceProfile = profiles[profileIndex]
            sendState('beforeunload', true)
            const kk = await CONET_transfer_token(sourceProfile, toAddress, amount, assetName)
            sendState('beforeunload', false)

            if (!!kk !== true) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }

            if (sourceProfile.keyID.toLowerCase() == miningAddress) {
                cCNTPcurrentTotal -= amount
            }

            const cmd1 = {
                cmd: 'tokenTransferStatus',
                data: [4, kk]
            };
            sendState('toFrontEnd', cmd1)
            return returnUUIDChannel(cmd)
        }

        case 'estimateGas': {
            const [amount, sourceProfileKeyID, assetName, toAddress] = cmd.data

            if (!assetName || !toAddress || !amount || !sourceProfileKeyID) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }

            const profiles = CoNET_Data?.profiles

            if (!profiles) {
                cmd.err = 'FAILURE'
                return returnUUIDChannel(cmd)
            }

            const profile = getProfileFromKeyID(sourceProfileKeyID)
			
            if (!profile || !profile?.tokens) {
                cmd.err = 'INVALID_DATA';
                return returnUUIDChannel(cmd)
            }


            const asset = profile.tokens[assetName]


            if (!profile.privateKeyArmor || !asset) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }

            const data: any = await getEstimateGasForTokenTransfer(profile.privateKeyArmor, assetName, amount, toAddress)
            cmd.data = [data.gasPrice, data.fee, true, 5000]
            return returnUUIDChannel(cmd)
        }

        case 'isAddress': {
            const address = cmd.data[0];
            const ret = getAddress(address);
            cmd.data = [ret === '' ? false : true];
            return returnUUIDChannel(cmd);
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
                return returnUUIDChannel(cmd);
            }

            const profile = profiles[profileIndex]

			

            const tx = await burnCCNTP(profile, total)
            if (!tx) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }

            profiles[0].burnCCNTP = tx
            cmd.data = [tx]
            returnUUIDChannel(cmd)
            await storagePieceToLocal()
            await storeSystemData()
            return
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
            await getFaucet(profile)
            const gasFee = await preBurnCCNTP(profile, total)
            if (!gasFee) {
                cmd.err = 'INVALID_DATA'
                return returnUUIDChannel(cmd)
            }
            cmd.data = [gasFee]
            return returnUUIDChannel(cmd)
        }

		case 'startSilentPass': {
			const [profileKeyId, entryRegion, egressRegion] = cmd.data

			if (!profileKeyId || !entryRegion || !egressRegion) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}

			const profiles = CoNET_Data?.profiles
			if (!profiles) {
				cmd.err = 'NOT_READY'
				return returnUUIDChannel(cmd)
			}

			const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === profileKeyId.toLowerCase())
			if (profileIndex < 0) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}
			const profile = profiles[profileIndex]

			var result = await startSilentPass(profile, entryRegion, egressRegion)

			if (result === false) {
				cmd.err = 'FAILURE'
				return returnUUIDChannel(cmd)
			}

			cmd.data = [result]
			return returnUUIDChannel(cmd)
		}

		case 'getGuardianRegion' : {
			const result = await getRegion ()
			cmd.data = [result]
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
			
			const keyID = cmd.data[0]
		
			const profile = getProfileFromKeyID(keyID)
			if (!profile) {
				cmd.err = 'INVALID_DATA'
				return returnUUIDChannel(cmd)
			}

			const result = await getFaucet(profile)

			if (!result) {
				cmd.err='FAILURE'
				return returnUUIDChannel(cmd)
			}
			await getAllProfileAssetsBalance()
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
            return returnUUIDChannel(cmd)
        }

        case 'testPasscode': {
            return testPasscode(cmd)
        }
        case "showLeaderboard": {
            cmd.data[0] = leaderboardData
            return returnUUIDChannel(cmd)
        }

        case 'importWallet': {
            return importWallet(cmd)
        }

        case 'SaaSRegister': {
            return logger(`processCmd on SaaSRegister`)
        }

        case 'encrypt_deletePasscode': {
            cmd.data = [initNullSystemInitialization()]
            returnUUIDChannel(cmd)
            return await deleteExistDB()
        }


		case 'ipaddress': {
			
			const url = `http://localhost:3001/ipaddress`
			cmd.data = [await postToEndpoint(url, false, '')]
			
			return returnUUIDChannel(cmd)
			
		}

		case 'syncAssetV1': {
			const profile = gettPrimaryProfile()
			if (profile) {
				return getProfileAssets_CONET_Balance(profile)
			}
			return
		}

		case 'registerReferrer': {
			const referrer = cmd.data[0]
			if (!referrer) {
				cmd.err='FAILURE'
				returnUUIDChannel(cmd)
			}
			const isAddr = ethers.isAddress(referrer)

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
			const profiles = CoNET_Data?.profiles
			if (!profiles) {
				cmd.err = 'NOT_READY'
				return returnUUIDChannel(cmd)
			}
			cmd.data = [profiles]
			return returnUUIDChannel(cmd)
		}

		case 'getAllOtherAssets': {

			
			const profiles = CoNET_Data?.profiles
			if (!profiles) {
				cmd.err = 'NOT_READY'
				return returnUUIDChannel(cmd)
			}
			await getAllOtherAssets()
			cmd.data = [profiles]
			return returnUUIDChannel(cmd)
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

		case 'isWalletAgent': {
			return isWalletAgent (cmd)
		}

		default: {
			cmd.err = 'INVALID_COMMAND'
			responseChannel.postMessage(JSON.stringify(cmd))
			console.log (`channelWorkerDoCommand unknow command!`, cmd)
			return returnUUIDChannel(cmd)
		}
	}
}

/**
 *
 */
initEncryptWorker()

const fetchProxyData = async (url, data, callBack) => {
    const xhr = new XMLHttpRequest();
    let last_response_len = 0;
    xhr.onprogress = (e) => {
        const req = xhr.response;
        clearTimeout(timeCheck);
        if (xhr.status !== 200) {
            logger(`fetchProxyData get status [${xhr.status}] !== 200 STOP connecting!`);
            xhr.abort();
            return callBack(xhr.status, null);
        }
        const responseText = req.substr(last_response_len);
        last_response_len = req.length;
        responseText.split('\r\n\r\n')
            .filter((n) => n.length)
            .forEach((n, index) => {
            let obj;
            try {
                obj = JSON.parse(n);
            }
            catch (ex) {
                return logger(`fetchProxyData responseText JSON parse Error typeof [${typeof n}]`, n);
            }
            logger(`fetchProxyData Got Stream data typeof data[${typeof obj}][${obj.length}]`, n);
            return callBack(null, obj);
        });
    };
    const timeCheck = setTimeout(() => {
        xhr.abort();
        return callBack('timeout', null);
    }, 10000);
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    //xhttp.setRequestHeader('Accept', 'text/event-stream')
    xhr.send(data);
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

const returnNullContainerUUIDChannel = async (cmd) => {
    delete cmd.err;
    initNullSystemInitialization();
    cmd.data = ['NoContainer'];
    returnUUIDChannel(cmd);
}

//	for production
const LivenessURL1 = 'https://api.openpgp.online:4001/api/livenessListening'
const LivenessStopUrl = `https://api.openpgp.online:4001/api/stop-liveness`
//	for debug
// const LivenessURL1 = 'http://104.152.210.149:4001/api/livenessListening'
// const LivenessStopUrl = `http://104.152.210.149:4001/api/stop-liveness`
let LivenessCurrentData = ['', '', null]
//	Detect interruption of information from the server
const listenServerTime = 6 * 1000
const listenServerTimeCountMaximum = 4
const stopLivenessUrl = 'https://api.openpgp.online:4001/api/livenessStop'