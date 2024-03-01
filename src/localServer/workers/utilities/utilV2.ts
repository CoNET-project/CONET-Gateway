
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

const ReferralsAddress = '0x8f6be4704a3735024F4D2CBC5BAC3722c0C8a0BD'

const checkReferee = async (myKeyID:string) => {

	const {eth} = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(getRandomCoNETEndPoint()))
	const referralsContract = new eth.Contract(CONET_ReferralsAbi, ReferralsAddress)
	let result: string
	try {
		result = await referralsContract.methods.getReferrer(myKeyID).call({from:myKeyID})
	} catch (ex) {
		logger (`checkReferee getReferrer Error!`, ex)
		return null
	}
	if (result === '0x0000000000000000000000000000000000000000') {
		return null
	}
	return result
}

const getReferees = async () => {
	const profile = gettPrimaryProfile()
	if (!profile) {
		return []
	}
	const {eth} = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(getRandomCoNETEndPoint()))
	const referralsContract = new eth.Contract(CONET_ReferralsAbi, ReferralsAddress)
	let result: string
	try {
		result = await referralsContract.methods.getReferees(profile.keyID).call({from:profile.keyID })
	} catch (ex) {
		logger (`checkReferee getReferrer Error!`, ex)
		return []
	}
	return result
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
	if (referrer.toUpperCase() === profile.keyID?.toUpperCase()) {
		return false
	}
	const message =JSON.stringify({ walletAddress: profile.keyID, referrer })
	const messageHash = CoNETModule.EthCrypto.hash.keccak256(message)
	const signMessage = CoNETModule.EthCrypto.sign( profile.privateKeyArmor, messageHash )
	const data = {
		message, signMessage
	}
	const conet_DL_endpoint = `${ CoNET_SI_Network_Domain }/api/registerReferrer`
	const result: any = await postToEndpoint(conet_DL_endpoint, true, data)

	profile.referrer = result.referrer
	sendState('system', CoNET_Data)
	sendState('referrer', result.referrer)
	await storeSystemData ()
	return true
}

const referrerList = async (cmd: worker_command) => {
	cmd.data = [await getReferees()]
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
        title: buffer.Buffer.from(CoNET_Data.encryptedString).toString('base64')
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

	const referrerSuccess = await registerReferrer(_referrer)

	if(referrerSuccess) {
		CoNET_Data.preferences = _referrer
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
	const _tempPass = passObj?.password
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
	return returnUUIDChannel(cmd)
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
	
	passObj.passcode = passObj._passcode = passObj.password = ''
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
	return returnUUIDChannel(cmd)
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
	const rootPath = root.path
	const nextPath = rootPath.replace('\/0$',`/${nextIndex}`)
	const newAcc = root.derivePath(nextPath)
	const key = await createGPGKey('', '', '')
	const profile: profile = {
		isPrimary: false,
		keyID: newAcc.address,
		privateKeyArmor: newAcc.chainCode,
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
	await storeSystemData ()
	cmd.data[0] = CoNET_Data.profiles
	return returnUUIDChannel(cmd)
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
	return returnUUIDChannel(cmd)
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
		privateKeyArmor: acc.chainCode,
		hdPath: acc.path,
		index: acc.index,
		network: {
			recipients: []
		}
	}
	CoNET_Data = {
		isReady: true,
		// CoNETCash: {
		// 	Total: 0,
		// 	assets: []
		// },
		mnemonicPhrase: acc.mnemonic.phrase,
		profiles:[profile]
	}
	
}

