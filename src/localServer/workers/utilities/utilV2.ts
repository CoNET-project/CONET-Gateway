const conet_rpc = 'https://rpc.conet.network'
const api_endpoint = `https://api.conet.network/api/`
const apiv2_endpoint = `https://apiv2.conet.network/api/`
const cloudStorageEndpointUrl = 'https://s3.us-east-1.wasabisys.com/conet-mvp/storage/FragmentOcean/'
const blast_sepoliaRpc = 'https://sepolia.blast.io'
const _ethRpc: string[] = ['https://rpc.ankr.com/eth','https://eth.llamarpc.com','https://ethereum-rpc.publicnode.com']


const blast_mainnet1 = ['https://blast.din.dev/rpc', 'https://rpc.ankr.com/blast', 'https://blastl2-mainnet.public.blastapi.io', 'https://blast.blockpi.network/v1/rpc/public']
const bsc_mainchain = 'https://bsc-dataseed.binance.org/'

const ReferralsAddressV3 = '0x8f6be4704a3735024F4D2CBC5BAC3722c0C8a0BD'.toLowerCase()
const conet_storage_old_address = `0x7d9CF1dd164D6AF82C00514071990358805d8d80`.toLowerCase()

const adminCNTP= '0x44d1FCCce6BAF388617ee972A6FB898b6b5629B1'
const referrerCNTP= '0x63377154F972f6FC1319e382535EC9691754bd18'

const CNTPV1 = '0x1A73E00cE25E5D56DB1b5DD7B2dcDF8ec9F208D2'.toLowerCase()



const blast_mainnet_CNTP = '0x0f43685B2cB08b9FB8Ca1D981fF078C22Fec84c5'
//const CNTPB_contract = '0x6056473ADD8bC89a95325845F6a431CCD7A849bb'
const eth_usdt_contract = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const blast_usdb_contract = '0x4300000000000000000000000000000000000003'

const bnb_wbnb_contract = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const bnb_usdt_contract = '0x55d398326f99059fF775485246999027B3197955'

const conet_dWETH = '0x84b6d6A6675F830c8385f022Aefc9e3846A89D3B'
const conet_dUSDT = '0x0eD55798a8b9647f7908c72a0Ce844ad47274422'
const conet_dWBNB = '0xd8b094E91c552c623bc054085871F6c1CA3E5cAd'

const Claimable_BNBUSDT = '0xC06D98B3185D3de0dF02b8a7AfD1fF9cB3c9399a'.toLowerCase()
const Claimable_BlastUSDB = '0x53Aee1f4c9b0ff76781eFAC6e20eAe4561e29E8A'.toLowerCase()
//const Claimable_BlastETH = '0x47A10d4BBF904BCd550200CcBB6266fB88EB9804'.toLowerCase()
// const Claimable_BNB = '0x8E7B1D5f6DF4B0d7576B7430ECB1bEEE0b612382'.toLowerCase()
// const Claimable_ETH = '0x6Eb683B666310cC4E08f32896ad620E5F204c8f8'.toLowerCase()
const Claimable_ETHUSDT = '0x95A9d14fC824e037B29F1Fdae8EE3D9369B13915'.toLowerCase()

const CONET_Guardian_Nodes1 = '0x5e4aE81285b86f35e3370B3EF72df1363DD05286'
const CONET_Guardian_NodesV3 = '0x453701b80324C44366B34d167D40bcE2d67D6047'.toLowerCase()
const CONET_Guardian_NodeInfo = '0xD6C30e7a1527cBDaF0e83930e643E32e7B30c1b4'
const fx168OrderContractAddress = '0x9aE6D3Bd3029C8B2A73817b9aFa1C029237E3e30'

const FragmentNameDeriveChildIndex = 65536

const blast_mainnet = () => blast_mainnet1[Math.round(Math.random()*(blast_mainnet1.length-1))]

const ethRpc = () => _ethRpc[Math.round(Math.random()*(_ethRpc.length-1))]
let allNodes: node
let authorization_key = ''



//	******************************************************************
const cCNTP_new_Addr = '0x530cf1B598D716eC79aa916DD2F05ae8A0cE8ee2'.toLocaleLowerCase()
const profile_ver_addr = '0x556bB96fC4C1316B2e5CEaA133f5D4157Eb05681'.toLowerCase()
//	******************************************************************

const getAddress = (addr: string) => {
	let ret = ''
	try {
		ret = ethers.getAddress(addr)
	} catch (ex) {
		return ret
	}
	return ret
}

const getReferrerList = async (cmd: worker_command) => {

	cmd.data = [RefereesList]
	returnUUIDChannel(cmd)
}

const createAccount = async (cmd: worker_command) => {
	const passcode: string = cmd.data[0]
	const _referrer = cmd.data[1]

	//	create passObj
	await createNumberPasscode (passcode)
	//	create GPG OBJ
	await initCoNET_Data ()
	//	Error
	if (!CoNET_Data?.profiles) {
		cmd.data[0] = ''
		return returnUUIDChannel (cmd)
	}

	const mainProfile = CoNET_Data.profiles[0]
	CoNET_Data.preferences = cmd.data[2] || null

	const tx = await getFaucet (mainProfile.keyID)
	logger(tx)
	await storeSystemData ()
	await storagePieceToLocal()
	cmd.data[0] = CoNET_Data.mnemonicPhrase
	return returnUUIDChannel (cmd)
}

let referrer
let RefereesList: any[]|null

const testPasscode = async (cmd: worker_command) => {
	const passcode: string = cmd.data[0]
	referrer = cmd.data[1]
	if ( !passcode || !passObj ) {
		cmd.err = 'INVALID_DATA'
		return returnUUIDChannel(cmd)
	}

	passObj.password = passcode
	await decodePasscode ()

	try {
		await decryptSystemData ()
		await recoverProfileFromSRP()
	} catch (ex) {
		logger (`encrypt_TestPasscode get password error!`)
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}

	if (!CoNET_Data?.profiles) {
		cmd.err = 'FAILURE'
		returnUUIDChannel(cmd)
		return logger(`testPasscode CoNET_Data?.profiles Empty error!`)
	}
	

	CoNET_Data.profiles.forEach(n => {
		n.keyID = n.keyID.toLocaleLowerCase()
		if ( !CoNET_Data?.upgradev2 ) {
			n.tokens.cCNTP.unlocked = false
		}
	})
	
	if (!CoNET_Data?.upgradev2) {
		CoNET_Data.upgradev2 = true
	}
	
	const profiles = CoNET_Data.profiles[0]

	authorization_key = cmd.data[0] = uuid.v4()
	returnUUIDChannel(cmd)
	await getAllProfileAssetsBalance()
	await getAllReferrer()
	await testFunction(cmd)
	await checkGuardianNodes ()

}


const showSRP = async (cmd: worker_command) => {
	const passcode: string = cmd.data[0]
	if (!CoNET_Data || !passObj) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}

	passObj.password = passcode
	await decodePasscode ()

	try {
		await decryptSystemData ()
		await recoverProfileFromSRP()
	} catch (ex) {
		logger (`encrypt_TestPasscode get password error!`)
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	
	cmd.data = [CoNET_Data.mnemonicPhrase]
	return returnUUIDChannel(cmd)
}

let getAllProfilesCount = 0
let lastTimeGetAllProfilesCount = 0
const minTimeStamp = 1000 * 15
let pushedCurrentProfileVersion = 0
let referralsRate
let getAllProfilesRunning = false
let didGetBalance = false


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
	const profiles = CoNET_Data.profiles
	const checkIndex = profiles.findIndex(n => n.keyID.toLowerCase() === wallet.address.toLowerCase())
	if (checkIndex > -1) {
		cmd.data[0] = CoNET_Data.profiles
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
		isNode: false,
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
	cmd.data[0] = CoNET_Data.profiles
	returnUUIDChannel(cmd)
	await updateProfilesVersionToIPFSAndLocal()
	

}

const updateProfile = async (cmd: worker_command) => {
	const _authorization_key: string = cmd.data[0]
	const _profile:profile = cmd.data[1]
	if (!CoNET_Data || !CoNET_Data?.profiles|| !_profile.keyID || authorization_key !== _authorization_key) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	const ketID = _profile.keyID.toLowerCase()
	const index = CoNET_Data.profiles.findIndex(n => n.keyID.toLowerCase() === ketID)
	if(index < 0) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	const profileImg = _profile?.data?.profileImg
	if (profileImg) {
		const resized: any = await resizeImage(profileImg, 180, 180)
		_profile.data.profileImg = 'data:image/png;base64,' + resized.rawData
	}
	CoNET_Data.profiles[index].data = _profile.data
	
	cmd.data[0] = CoNET_Data.profiles
	returnUUIDChannel(cmd)

	await storeSystemData ()
	await updateProfilesVersionToIPFSAndLocal()
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
	const profileImg = UIData?.data?.profileImg
	if (profileImg) {
		const resized: any = await resizeImage(profileImg, 180, 180)
		UIData.data.profileImg = 'data:image/png;base64,' + resized.rawData
	}
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
		isNode: false,
		referrer: null,
		network: {
			recipients: []
		},
		tokens: initProfileTokens(),
		data: UIData
	}

	CoNET_Data.profiles.push(profile)
	
	await updateProfilesVersionToIPFSAndLocal()
	cmd.data[0] = CoNET_Data.profiles
	returnUUIDChannel(cmd)
	
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
	

	if (CoNET_Data) {
		await checkOldVersion (CoNET_Data)
	}

	await storeSystemData ()
	
	authorization_key = cmd.data[0] = uuid.v4()
	returnUUIDChannel(cmd)
}

const prePurchase = async (cmd: worker_command) => {
	const [nodes, amount, purchaseProfile, payAssetName] = cmd.data

	if (!nodes||!amount||!purchaseProfile|| !payAssetName) {
		cmd.err = 'INVALID_DATA'
		return returnUUIDChannel(cmd)
	}
	const profiles = CoNET_Data?.profiles
	if (!profiles) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === purchaseProfile.keyID.toLowerCase())
	if (profileIndex < 0) {
		cmd.err = 'INVALID_DATA'
		return returnUUIDChannel(cmd)
	}

	const profile = profiles[profileIndex]
	const asset: CryptoAsset = profile.tokens[payAssetName]
	if (!profile.privateKeyArmor||!asset||!CONET_guardian_Address(payAssetName)) {
		cmd.err = 'INVALID_DATA'
		return returnUUIDChannel(cmd)
	}

	const data: any = await getEstimateGas (profile.privateKeyArmor, payAssetName, amount, profile.keyID)

	cmd.data = [data.gasPrice, data.fee, true, 5000]
	return returnUUIDChannel(cmd)
}

const checkOldVersion = async (CoNET_Data: encrypt_keys_object) => {
	const profile = CoNET_Data?.profiles
	if (!profile) {
		return logger(`checkOldVersion profile is none Error, STOP!`)
	}
	const [ver, oldVer] = await checkOldProfileVersion (profile[0].keyID)
	let getVer = ver <= oldVer ? oldVer : ver
	if (!ver) {
		return 
	}
	
	await getDetermineVersionProfile(getVer, CoNET_Data)
	await updateProfilesVersionToIPFSAndLocal()
}

const nodePrice = 1250

// const getAmountOfNodes: (nodes: number, assetName: string) => Promise<number> = (nodes, assetName) => new Promise(async resolve => {
// 	const assetPrice = await getAPIPrice ()
// 	if (typeof assetPrice === 'boolean') {
// 		return resolve(0)
// 	}
// 	const totalUsdt = nodes * nodePrice
// 	const asssetSymbol = new RegExp (/usd/i.test(assetName) ? 'usd' : /bnb/i.test(assetName) ? 'bnb' : 'eth', 'i')
// 	const index = assetPrice.findIndex(n => asssetSymbol.test(n.currency_name))
// 	if (index < 0) {
// 		return resolve(totalUsdt)
// 	}
// 	const rate = parseFloat(assetPrice[index].usd_price)
// 	return resolve (totalUsdt/rate)
// })


/**
 * 				OldVersion
 */


// const getAllNodesInfo: () => Promise<node|null> = () => new Promise(resolve=> {

// 	return fetch('https://openpgp.online:4001/api/conet-nodes', {
// 		method: 'GET',
// 		headers: {
// 			'Content-Type': 'application/json;charset=UTF-8',
// 			'Connection': 'close',
// 		},
// 		cache: 'no-store',
// 		referrerPolicy: 'no-referrer'
// 	})
// 	.then ( async res => {
// 		return res.json()
// 	}).then((data: node) => {
// 		allNodes = data
// 		resolve(data)
// 	}).catch(ex=> {
// 		resolve(null)
// 	})

// })

const claimAdmin = '0x418833b70F882C833EF0F0Fcee3FB9d89C79d47C'

const getClaimableAddress = (CONET_claimableName: string) => {
	switch(CONET_claimableName) {
		case 'cUSDB': {
			return '0x53Aee1f4c9b0ff76781eFAC6e20eAe4561e29E8A'
		}
		case 'cBNBUSDT': {
			return '0xC06D98B3185D3de0dF02b8a7AfD1fF9cB3c9399a'
		}
		case 'cUSDT': {
			return '0x95A9d14fC824e037B29F1Fdae8EE3D9369B13915'
		}
		default : {
			return ''
		}
	}
}

const getCONET_api_health = async () => {
	const url = `${apiv2_endpoint}health`
	const result: any = await postToEndpoint(url, false, null)
	return result?.health
}


const claimToken = async (profile: profile, CoNET_Data: encrypt_keys_object, assetName: string, cmd: worker_command) => {
	const asset: CryptoAsset = profile.tokens[assetName]
	let balance
	if (!asset|| parseFloat(balance = asset.balance) < 0.0001) {
		cmd.err = 'INVALID_DATA'
		return returnUUIDChannel(cmd)
	}

	const health = await getCONET_api_health()
	if (!health) {
		cmd.err = 'Err_Server_Unreachable'
		return returnUUIDChannel(cmd)
	}

	const rpc = getNetwork(assetName)
	const contractAddr = getClaimableAddress(assetName)

	if (!rpc|| !contractAddr) {
		cmd.err = 'INVALID_DATA'
		return returnUUIDChannel(cmd)
	}

	const conetProvider = new ethers.JsonRpcProvider(conet_rpc)
	const wallet = new ethers.Wallet(profile.privateKeyArmor, conetProvider)

	const contractObj = new ethers.Contract(contractAddr, claimableContract, wallet)

	try {
		const _balance = await contractObj.balanceOf(profile.keyID)
		const tx = await contractObj.approve(claimAdmin, _balance)
		await tx.wait()
		logger(tx)
	} catch (ex) {
		cmd.err = 'Err_Existed'
		return returnUUIDChannel(cmd)
	}

	const data = {
		tokenName: assetName,
		network: asset.network,
		amount: balance
	}

	const message =JSON.stringify({ walletAddress: profile.keyID, data})
	const messageHash = ethers.id(message)
	const signMessage = CoNETModule.EthCrypto.sign(profile.privateKeyArmor, messageHash)

	const sendData = {
		message, signMessage
	}
	logger(sendData)
	const url = `${ apiv2_endpoint }claimToken`
	const result: any = await postToEndpoint(url, true, sendData)
	if (!result) {
		cmd.data = [false]
		return returnUUIDChannel(cmd)
	}
	cmd.data = [true]
	return returnUUIDChannel(cmd)
}

const unlock_cCNTP = async (profile: profile) => {
	const message =JSON.stringify({ walletAddress: profile.keyID})
	const messageHash = ethers.id(message)
	const signMessage = CoNETModule.EthCrypto.sign(profile.privateKeyArmor, messageHash)
	const sendData = {
		message, signMessage
	}
	const url = `${ apiv2_endpoint }unlockCONET`
	const result: any = await postToEndpoint(url, true, sendData)
	return result
}

const getReferralsRate = async (wallet: string) => {
	if (!wallet) {
		return null
	}
	const url = `${apiv2_endpoint}leaderboardData`
	try {
		const result: any = await postToEndpoint(url, true, {wallet})
		return result
	} catch (ex) {
		return null
	}
	
}


const testFunction = async (cmd: worker_command) => {
	
	
	const profiles = CoNET_Data?.profiles
	if (!profiles) {
		return
	}

	
	const profile = profiles[0]

	//await checkProfileVersion (profile.keyID)
	// const wallet = await unlock_cCNTP(profile)
	const wallet1 = '0xD8b12054612119e9E45d5Deef40EDca38d54D3b5'
	// const result = await preBurnCCNTP (profile, '1')
	// const result1 = await burnCCNTP (profile, '1')
	// const result = await getRegion ()
	// const wallet = await getReferralsRate(wallet1)
	// if (wallet?.privateKeyArmor) {
		if (CoNET_Data) {
			// claimToken(wallet, CoNET_Data, 'cUSDB', cmd)
		}
		

		// _startMining(cmd, wallet)
		// cmd.data = [5]
		// fx168PrePurchase(cmd)
		// setTimeout(async () => {
		// 	const assetPrice = await getAPIPrice()
		// }, 15000)
		// const assetPrice = await getAPIPrice()
		//logger(assetPrice)
		// const uu = await getEstimateGas(wallet.privateKeyArmor, 'usdt', '8', wallet.keyID)
		// logger(uu)

		//const kk = await transferAssetToCONET_guardian(wallet.privateKeyArmor, wallet.tokens.dUSDT, '10')
		//await CONET_guardian_purchase(wallet.tokens.dWBNB, 1, 1250, 'dWBNB')
		
		// const oo = await getAmountOfNodes(5, 'dWETH')
		// const kk = await getAmountOfNodes(5, 'dUSDT')
		// const pp = await getAmountOfNodes(5, 'dWBNB')
		// logger(oo)
		// logger(pp)
		// logger(kk)
		// const uuu = await CONET_guardian_purchase (wallet, 5, 6250, 'dUSDT')
	// }

	// const referrer = '0x848b08302bF95DE9a1BF6be988c9D9Ef5616c4eF'
	// const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	// const CNTP_Referrals = new ethers.Contract(ReferralsAddressV2, CONET_ReferralsAbi, provideNewCONET)
	// const kkk = await getAllReferees(referrer, CNTP_Referrals)
	// logger(kkk)
}

