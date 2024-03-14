
declare const ethers
declare const uuid
const CONET_ReferralsAbi = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "referee",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "referrer",
				"type": "address"
			}
		],
		"name": "addReferrer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "referrer",
				"type": "address"
			}
		],
		"name": "getReferees",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "referees",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "referee",
				"type": "address"
			}
		],
		"name": "getReferrer",
		"outputs": [
			{
				"internalType": "address",
				"name": "referrer",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]
const conet_storageAbi=[
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "data",
                "type": "string"
            }
        ],
        "name": "FragmentsStorage",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "data",
                "type": "string"
            }
        ],
        "name": "_storageFragments",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "count",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "data",
                "type": "string"
            }
        ],
        "name": "storageFragments",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const conet_rpc = 'https://rpc.conet.network'
const api_endpoint = `https://api.conet.network`
const ReferralsAddress = '0x8f6be4704a3735024F4D2CBC5BAC3722c0C8a0BD'


const checkReferee = async (myKeyID:string) => {
	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	const CNTP_Referrals = new ethers.Contract(ReferralsAddress, CONET_ReferralsAbi, provideNewCONET)
	let referrer: string
	try {
		referrer = await CNTP_Referrals.getReferrer(myKeyID)
	} catch (ex) {
		return logger(`checkReferee Error!`, ex)
	}
	const add = referrer.toLowerCase()
	if (add === '0x0000000000000000000000000000000000000000') {
		return null
	}
	return add
	// const {eth} = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(conet_rpc))
	// const referralsContract = new eth.Contract(CONET_ReferralsAbi, ReferralsAddress)
	// let result: string
	// try {
	// 	result = await referralsContract.methods.getReferrer(myKeyID).call({from:myKeyID})
	// } catch (ex) {
	// 	logger (`checkReferee getReferrer Error!`, ex)
	// 	return null
	// }
	// if (result === '0x0000000000000000000000000000000000000000') {
	// 	return null
	// }
	// return result
}

const getReferees = async (wallet: string, CNTP_Referrals) => {
	

	let result: string[] = []
	try {
		result = await CNTP_Referrals.getReferees(wallet)
	} catch (ex) {
		logger (`checkReferee getReferrer Error!`, ex)
		return []
	}
	return result
}

const getAllReferees = async (_wallet: string, CNTP_Referrals) => {

	const firstArray: string[] = await getReferees(_wallet, CNTP_Referrals)
	if (!firstArray.length) {
		return []
	}
	const ret: any = []
	const getData = async (wallet: string) => {
		const kkk = await getReferees(wallet, CNTP_Referrals)
		const data = JSON.parse(`{"${wallet}": ${JSON.stringify(kkk)}}`)
		return data
	}
	for (let i = 0; i < firstArray.length; i++) {
		const kk = await getReferees(firstArray[i], CNTP_Referrals)
		const ret1: any[] = []

		if (kk.length) {
			
			for (let j = 0; j < kk.length; j ++) {
				ret1.push(await getData(kk[j]))
			}

		}
		const data = `{"${firstArray[i]}": ${JSON.stringify(ret1)}}`
		const k = JSON.parse(data)
		ret.push(k)
	}
	
	return ret
}

const sendState = (state: listenState, value: any) => {
	const sendChannel = new BroadcastChannel(state)
	sendChannel.postMessage (JSON.stringify(value))
	sendChannel.close()
}

const registerReferrer = async (referrer: string) => {
	const profile = gettPrimaryProfile()
	if (!profile||!referrer) {
		return false
	}

	if (referrer.toLowerCase() === profile.keyID?.toLowerCase() || profile?.referrer) {
		return false
	}

	const message =JSON.stringify({ walletAddress: profile.keyID, referrer })
	const messageHash = CoNETModule.EthCrypto.hash.keccak256(message)
	const signMessage = CoNETModule.EthCrypto.sign( profile.privateKeyArmor, messageHash )
	const data = {
		message, signMessage
	}
	const conet_DL_endpoint = `${ api_endpoint }/api/registerReferrer`
	const result: any = await postToEndpoint(conet_DL_endpoint, true, data)
	if (result?.referrer) {
		profile.referrer = result.referrer
		sendState('system', CoNET_Data)
		sendState('referrer', result.referrer)
		return true
	}
	return false
	
}

const getReferrerList = async (cmd: worker_command) => {
	const _authorization_key: string = cmd.data[0]
	const referrer = cmd.data[1]
	if (authorization_key !== _authorization_key) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	const CNTP_Referrals = new ethers.Contract(ReferralsAddress, CONET_ReferralsAbi, provideNewCONET)
	cmd.data = [await getAllReferees(referrer, CNTP_Referrals)]
	returnUUIDChannel(cmd)
}

const adminCNTP= '0x44d1FCCce6BAF388617ee972A6FB898b6b5629B1'
const referrerCNTP= '0x63377154F972f6FC1319e382535EC9691754bd18'

let nodesGetBalance = []
const getAllNodesInfo: () => Promise<node|null> = () => new Promise(resolve=> {

	return fetch('https://openpgp.online:4001/api/conet-nodes', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		},
		cache: 'no-store',
		referrerPolicy: 'no-referrer'
	})
	.then ( async res => {
		return res.json()
	}).then((data: node) => {
		allNodes = data
		resolve(data)
	}).catch(ex=> {
		resolve(null)
	})

})

let allNodes: node
let CNTP_Balance = '0'
let currentCNTP = '0'
let getProfileAssetsBalanceLocked = false
let authorization_key = ''

let getProfileAssetsBalanceResult: getBalanceAPIresult = {CNTP_Balance: '0', CONET_Balance: '0', Referee: '0', lastTime: 0}
let scanPoint = 0
const scanSide =['https://scannew.conet.network/', 'https://scanapi.conet.network/', 'https://scan.conet.network/']
const getscanUrl = (path: string) => {
	
	if (++scanPoint > scanSide.length-1) {
		scanPoint = 0
	}
	return `${scanSide[scanPoint]}${path}`
}

const getProfileAssetsBalance = async (profile: profile) => {

	const date = new Date().getTime()
	if (date - getProfileAssetsBalanceResult.lastTime < 12 * 1000) {
		return getProfileAssetsBalanceResult
	}
	if (getProfileAssetsBalanceLocked) {
		return logger (`getProfileAssetsBalance running!`)
	}
	const key = profile.keyID
	if (key) {
		getProfileAssetsBalanceLocked = true
		const current = profile.tokens
		if (!current?.cntp) {
			current.cntp = {
				balance: '0',
				history: []
			}
		}
		// const message =JSON.stringify({ walletAddress: profile.keyID })
		// const messageHash = CoNETModule.EthCrypto.hash.keccak256(message)
		// const signMessage = CoNETModule.EthCrypto.sign( profile.privateKeyArmor, messageHash )
		// const data = {
		// 	message, signMessage
		// }

		const url = getscanUrl(`api/v2/addresses/${key.toLowerCase()}/tokens?type=ERC-20`)
		const url1 = getscanUrl(`api/v2/addresses/${key.toLowerCase()}`)
		
		return postToEndpoint(url, false, '')
			.then (response => {
				
				//@ts-ignore
				const data: blockscout_result = response
				if (data?.items) {

					const balance = parseFloat(data.items[0].value)/10**18
					const beforeBalance = parseFloat(getProfileAssetsBalanceResult.CNTP_Balance)
					if (!isNaN(balance) && balance - beforeBalance > 0 ) {
						getProfileAssetsBalanceResult.CNTP_Balance = current.cntp.balance = CNTP_Balance = balance.toFixed(4)
						getProfileAssetsBalanceResult.lastTime = date
					}
					
				}
				return postToEndpoint(url1, false, '')})
			.then( async response => {
				//@ts-ignore
				const data: blockscout_address = response
				
				if (data?.coin_balance ) {
					const balance = parseFloat(data.coin_balance)
					const beforeBalance = parseFloat(getProfileAssetsBalanceResult.CONET_Balance)
					if (!isNaN(balance) && balance -beforeBalance >0) {
						getProfileAssetsBalanceResult.CONET_Balance = current.conet.balance = balance.toFixed(4)
						getProfileAssetsBalanceResult.lastTime = date
					}
				}
				
				// if (profile.referrer) {
				// 	await registerReferrer(profile.referrer)
				// } else if (!profile.referrer && referrals) {
				// 	await registerReferrer(referrals)
				// 	profile.referrer = referrals
				// }
				
				sendState('cntp-balance', {CNTP_Balance: CNTP_Balance, CONET_Balance: profile.tokens.conet.balance, currentCNTP: currentCNTP})
				const ret = {
					CNTP_Balance,
					CONET_Balance: profile.tokens.conet.balance,
					Referee: profile.referrer
				}
				getProfileAssetsBalanceLocked = false
				return ret
			})
			.catch (ex => {
				getProfileAssetsBalanceLocked = false
				return null
			})
		
		
	}
	return false
}

const storeSystemData = async () => {
	if (!CoNET_Data||! passObj?.passcode) {
		return
	}

	const password = passObj.passcode.toString()
	CoNET_Data.encryptedString = await CoNETModule.aesGcmEncrypt (buffer.Buffer.from(JSON.stringify (CoNET_Data)).toString('base64'), password)
	if (!CoNET_Data.encryptedString) {
		return logger(`encryptStoreData aesGcmEncrypt Error!`)
	}
    const putData = {
        title: CoNET_Data.encryptedString
    }
	const database = new PouchDB( databaseName, { auto_compaction: true  })
	sendState('beforeunload', true)
	const doc = await database.post( putData )
	await CoNET_initData_save (database, doc.id)
	sendState('beforeunload', false)
}

const createAccount = async (cmd: worker_command) => {
	const passcode: string = cmd.data[0]
	const _referrer = cmd.data[1]
	//	create passObj
	await createNumberPasscode (passcode)
	//	create GPG OBJ
	await initCoNET_Data ()
	//	Error
	if (!CoNET_Data) {
		cmd.data[0] = ''
		return returnUUIDChannel (cmd)
	}
	CoNET_Data.preferences = _referrer

	if (_referrer) {
		const referrer = await registerReferrer(_referrer)
		if (!referrer) {
			logger(`createAccount referrer dosen't regirst!`)
		}
	}

	
	// storage Data
	await storeSystemData ()
	cmd.data[0] = CoNET_Data.mnemonicPhrase
	returnUUIDChannel (cmd)
	
}

const testPasscode = async (cmd: worker_command) => {
	const passcode: string = cmd.data[0]
	const referrer = cmd.data[1]
	if ( !passcode || !passObj ) {
		cmd.err = 'INVALID_DATA'
		return returnUUIDChannel(cmd)
	}
	passObj.password = passcode
	await decodePasscode ()
	try {
		await decryptSystemData ()
	} catch (ex) {
		logger (`encrypt_TestPasscode get password error!`)
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	authorization_key = cmd.data[0] = uuid.v4()
	returnUUIDChannel(cmd)

	if ( referrer ) {
		const profile = gettPrimaryProfile()
		if (profile && !profile?.referrer) {
			await registerReferrer (referrer)
		}

		// const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
		// const CNTP_Referrals = new ethers.Contract(ReferralsAddress, CONET_ReferralsAbi, provideNewCONET)
		// const kkk = await getAllReferees('0x04441E4BC3A8842473Fe974DB4351f0b126940be', CNTP_Referrals)
		// logger(kkk)
	}
	
	await checkUpdateAccount()
}

const createKeyHDWallets = () => {
	let root
	try {
		root = ethers.Wallet.createRandom()
	} catch (ex) {
		return null
	}
	return root
}

const decryptSystemData = async () => {
	//	old version data

	if (containerKeyObj) {
		const privatekey = await makeContainerPGPObj()
		if (CoNET_Data?.passcode?.status === 'UNLOCKED') {
			if (privatekey.privateKeyObj.isDecrypted()) {
				return 
			}

			throw new Error(`Password Error!`)
		}
		await decryptCoNET_Data_WithContainerKey()
		await storeSystemData()
	} else {
		const password = passObj?.passcode.toString()
		if (!password) {
			throw new Error(`Password Error!`)
		}
		const objText = await CoNETModule.aesGcmDecrypt (buffer.Buffer.from(CoNET_Data?.encryptedString).toString(), password)
		if(CoNET_Data?.passcode?.status === 'UNLOCKED') {
			return
		}
		CoNET_Data = JSON.parse(buffer.Buffer.from( objText,'base64').toString())
		
	}
}

const showSRP = (cmd: worker_command) => {
	const _authorization_key: string = cmd.data[0]
	if (!CoNET_Data || authorization_key!== _authorization_key) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}

	cmd.data = [CoNET_Data.mnemonicPhrase]
	return returnUUIDChannel(cmd)
}

const getAllProfiles = (cmd: worker_command) => {
	const _authorization_key: string = cmd.data[0]
	if (!CoNET_Data || authorization_key!== _authorization_key) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	cmd.data = [CoNET_Data.profiles]
	return returnUUIDChannel(cmd)
}

const CoNET_initData_save = async (database, systemInitialization_uuid: string) => {
	if ( !CoNET_Data || !passObj ) {
		const msg = `storeUUID_Fragments Error: encrypted === null`
		
		return logger (msg)
	}
	
	
	let preferences = {}
	if (CoNET_Data.preferences) {
		preferences =  {
			language: CoNET_Data.preferences?.langurge,
			theme: CoNET_Data.preferences?.theme
		}
	}
	

	const CoNETIndexDBInit: CoNETIndexDBInit = {
		id: passObj,
		uuid: systemInitialization_uuid,
		preferences: preferences	
	}
	let doc
	try {
		doc = await database.get ('init', {latest: true})
		
	} catch (ex) {
		logger (`database.get 'init' error! keep next`, ex)
		
	}
    const putData = {
        _id: 'init',
        title: buffer.Buffer.from(JSON.stringify (CoNETIndexDBInit)).toString ('base64')
    }
	
	if (doc?._rev) {
		putData['_rev']= doc._rev
	}
	sendState('beforeunload', true)
	const uu = await database.put( putData )
	logger(`storeCoNET_initData database.put return [${uu}]`)
	sendState('beforeunload', false)

}

const importWallet = async (cmd: worker_command) => {
	const _authorization_key: string = cmd.data[0]
	const privateKey = cmd.data[1]
	const data = cmd.data[2]
	cmd.data = []
	if (!CoNET_Data || !CoNET_Data?.profiles || authorization_key !== _authorization_key) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	let wallet
	try {
		wallet = new ethers.Wallet(privateKey)
	} catch (ex) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	const key = await createGPGKey('', '', '')

	const profile: profile = {
		isPrimary: false,
		keyID: wallet.address,
		privateKeyArmor: privateKey,
		hdPath: '',
		index: -1,
		pgpKey: {
			privateKeyArmor: key.privateKey,
			publicKeyArmor: key.publicKey
		},
		referrer: null,
		network: {
			recipients: []
		},
		tokens: initProfileTokens(),
		data
	}
	CoNET_Data.profiles.push(profile)
	await storeSystemData ()
	cmd.data[0] = CoNET_Data.profiles
	return returnUUIDChannel(cmd)

}

const updateProfile = async (cmd: worker_command) => {
	const _authorization_key: string = cmd.data[0]
	const _profile:profile = cmd.data[1]
	if (!CoNET_Data || !CoNET_Data?.profiles|| !_profile.keyID || authorization_key !== _authorization_key) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	const index = CoNET_Data.profiles.findIndex(n => n.keyID === _profile.keyID)
	if(index < 0) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	CoNET_Data.profiles[index].data = _profile.data
	await storeSystemData ()
	cmd.data[0] = CoNET_Data.profiles
	returnUUIDChannel(cmd)
	updateProfiles()
}

const addProfile =  async (cmd: worker_command) => {
	const _authorization_key: string = cmd.data[0]
	if (!CoNET_Data || !CoNET_Data?.profiles|| authorization_key !== _authorization_key) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	const UIData = cmd.data[1]
	const indexMap = CoNET_Data.profiles.map(n=> n.index)
	const nextIndex = indexMap.sort((a,b) => b-a)[0] + 1
	const root = ethers.Wallet.fromPhrase(CoNET_Data.mnemonicPhrase)
	const newAcc = root.deriveChild(nextIndex)
	const key = await createGPGKey('', '', '')
	const profile: profile = {
		isPrimary: false,
		keyID: newAcc.address,
		privateKeyArmor: newAcc.signingKey.privateKey,
		hdPath: newAcc.path,
		index: newAcc.index,
		pgpKey: {
			privateKeyArmor: key.privateKey,
			publicKeyArmor: key.publicKey
		},
		referrer: null,
		network: {
			recipients: []
		},
		tokens: initProfileTokens(),
		data: UIData
	}

	CoNET_Data.profiles.push(profile)
	++CoNET_Data.ver
	await storeSystemData ()
	cmd.data[0] = CoNET_Data.profiles
	returnUUIDChannel(cmd)
	updateProfiles()
}

const resetPasscode = async (cmd: worker_command) => {
	const oldPasscode: string = cmd.data[0]
	const newPasscode: string = cmd.data[1]
	if ( !oldPasscode || !passObj ) {
		cmd.err = 'INVALID_DATA'
		return returnUUIDChannel(cmd)
	}
	passObj.password = oldPasscode
	await decodePasscode ()
	try {
		await decryptSystemData ()
	} catch (ex) {
		logger (`encrypt_TestPasscode get password error!`)
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	await createNumberPasscode (newPasscode)
	await storeSystemData()
	authorization_key = cmd.data[0] = uuid.v4()
	return returnUUIDChannel(cmd)
}

const recoverAccount = async (cmd: worker_command) => {
	const SRP: string = cmd.data[0]
	const passcode: string = cmd.data[1]
	let acc
	try {
		acc = ethers.Wallet.fromPhrase(SRP)
	} catch (ex) {
		logger(`recoverAccount Phrase SRP Error! [${SRP}]`)
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	initSystemDataV1(acc)
	await createNumberPasscode (passcode)
	await storeSystemData ()
	authorization_key = cmd.data[0] = uuid.v4()
	returnUUIDChannel(cmd)
	checkUpdateAccount()
}

const initCoNET_Data = async ( passcode = '' ) => {
	
    //const acc = createKey (1)
	const acc = createKeyHDWallets()
	if (!acc) {
		return 
	}
	await initSystemDataV1(acc)
}

const initSystemDataV1 = async (acc) => {
	
	const key = await createGPGKey('', '', '')

	const profile: profile = {
		tokens: initProfileTokens(),
		publicKeyArmor: acc.publicKey,
		keyID: acc.address,
		isPrimary: true,
		referrer: null,
		pgpKey: {
			privateKeyArmor: key.privateKey,
			publicKeyArmor: key.publicKey
		},
		privateKeyArmor: acc.signingKey.privateKey,
		hdPath: acc.path,
		index: acc.index,
		network: {
			recipients: []
		}
	}
	CoNET_Data = {
		mnemonicPhrase: acc.mnemonic.phrase,
		profiles:[profile],
		ver: 0,
		isReady: true
	}
	
}


const conet_storage_contract_address = `0x30D870224419226eFcEA57B920a2e67929893DbA`

const checkCoNET_DataVersion = async (callback?: (ver: number) => void) => {
	if (!CoNET_Data?.mnemonicPhrase||!CoNET_Data?.profiles) {
		return logger (`regiestAccount CoNET_Data object null Error! Stop process!`)
	}
	const profile = CoNET_Data.profiles[0]
	const provide = new ethers.JsonRpcProvider(conet_rpc)
	const wallet = new ethers.Wallet(profile.privateKeyArmor, provide)
	const conet_storage = new ethers.Contract(conet_storage_contract_address, conet_storageAbi, wallet)
	
	try{
		const count = await	conet_storage.count(profile.keyID)
		if (callback) {
			const _count = parseInt(count)
			return callback (_count)
		}
	} catch (ex) {
		logger(`checkCoNET_DataVersion error!`, ex)
		return checkCoNET_DataVersion(callback)
	}
}

const cloudStorageEndpointUrl = 'https://s3.us-east-1.wasabisys.com/conet-mvp/storage/'

const checkUpdateAccount = () => {
	logger(`checkUpdateAccount`)
	checkCoNET_DataVersion( async _ver => {
		logger(`checkUpdateAccount checkCoNET_DataVersion ver [${_ver}]`)
		if (!CoNET_Data || !CoNET_Data.profiles?.length) {
			return logger(`checkUpdateAccount CoNET_Data or CoNET_Data.profiles hasn't ready Error!`)
		}
		const profile = CoNET_Data.profiles[0]

		if (_ver > CoNET_Data.ver) {
			logger (`checkUpdateAccount current account [${CoNET_Data.ver}] version is old! Update it`)
			const privateKeyHash = ethers.id(profile.keyID)
			const filename = '0x' + (BigInt(privateKeyHash) + BigInt(_ver)).toString(16)
			const fileUrl = cloudStorageEndpointUrl + `${profile.keyID}/${filename}`
			return fetchWithTimeout (fileUrl, 
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json;charset=UTF-8',
						'Connection': 'close',
					},
					cache: 'no-store',
					referrerPolicy: 'no-referrer'
				}).then ( res => {
					if (res.status!== 200) {
						logger(`checkUpdateAccount can't get new version profiles ${_ver} Error!`)
						return ''
					}
					return res.text()
				}).then( async text => {
					logger(`checkUpdateAccount got new Profile [${_ver}] [${fileUrl}]`)
					if (text) {
						if (!CoNET_Data) {
							return logger(`checkUpdateAccount CoNET_Data or CoNET_Data.profiles hasn't ready Error!`)
						}
						const pass = ethers.id(CoNET_Data.mnemonicPhrase)
						
						try {
							const decryptedData = await CoNETModule.aesGcmDecrypt(text, pass)
							CoNET_Data.profiles = JSON.parse(decryptedData)
							CoNET_Data.ver = _ver

						} catch (ex) {
							return logger(`checkUpdateAccount decrypt & JSON.parse profiles Error!`, ex)
						}
						await storeSystemData ()
						
					}	
					
				}).catch(ex=> {
					logger(`checkUpdateAccount updated file[${fileUrl}] Error!`, ex)
				})
		}
	})
}

const updateProfiles = () => {
	logger(`updateProfiles`)
	checkCoNET_DataVersion( async ver=> {
		logger(`updateProfiles checkCoNET_DataVersion ver [${ver}]`)
		const url = `${ api_endpoint }/api/storageFragments`

		if (!CoNET_Data?.mnemonicPhrase||!CoNET_Data?.profiles) {
			return logger (`regiestAccount CoNET_Data object null Error! Stop process!`)
		}
		//			password used mnemonicPhrase's hash
		const pass = ethers.id(CoNET_Data.mnemonicPhrase)
		const contant = JSON.stringify(CoNET_Data.profiles)

		const _data = await CoNETModule.aesGcmEncrypt(contant, pass)
		const profile = CoNET_Data.profiles[0]
		const privateKeyHash = ethers.id(profile.keyID)
		const hash = '0x' + (BigInt(privateKeyHash) + BigInt(ver+1)).toString(16)
		const message =JSON.stringify({ walletAddress: profile.keyID, data: _data, hash})
		const messageHash = ethers.id(message)

		const signMessage = CoNETModule.EthCrypto.sign(profile.privateKeyArmor, messageHash)

		const sendData = {
			message, signMessage
		}
		const result: any = await postToEndpoint(url, true, sendData)
		logger(`updateProfiles got result [${result}] from conet api server!`)
		
	})
	
	//	version contral with 
}
