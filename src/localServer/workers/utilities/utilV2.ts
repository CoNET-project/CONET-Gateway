
declare const ethers
declare const uuid
declare const Jimp

const CONET_ReferralsAbi = [
    {
        "inputs": [
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
                "name": "refere",
                "type": "address"
            },
            {
                "internalType": "address[]",
                "name": "referees",
                "type": "address[]"
            }
        ],
        "name": "checkReferees",
        "outputs": [
            {
                "internalType": "bool",
                "name": "hasAddress",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
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

const conet_storageAbi = [
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
        "name": "versionUp",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "ver",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const blast_CNTPAbi = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "allowance",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "needed",
                "type": "uint256"
            }
        ],
        "name": "ERC20InsufficientAllowance",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "balance",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "needed",
                "type": "uint256"
            }
        ],
        "name": "ERC20InsufficientBalance",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "approver",
                "type": "address"
            }
        ],
        "name": "ERC20InvalidApprover",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "receiver",
                "type": "address"
            }
        ],
        "name": "ERC20InvalidReceiver",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "sender",
                "type": "address"
            }
        ],
        "name": "ERC20InvalidSender",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "ERC20InvalidSpender",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
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
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "allowance",
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
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
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
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address[]",
                "name": "_addresses",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "_amounts",
                "type": "uint256[]"
            }
        ],
        "name": "multiTransferToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
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
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const blast_usdbAbi = [
	{
		"inputs":[{"internalType":"address","name":"_admin","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
		{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},
		{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},
		{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},
		{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},
		{"inputs":[{"internalType":"address","name":"_admin","type":"address"}],"name":"changeAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},
		{"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},
		{"inputs":[{"internalType":"address","name":"_implementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},
		{"inputs":[{"internalType":"address","name":"_implementation","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}
]


const conet_rpc = 'https://rpc.conet.network'
const api_endpoint = `https://api.conet.network`
const FragmentNameDeriveChildIndex = 65536

const cloudStorageEndpointUrl = 'https://s3.us-east-1.wasabisys.com/conet-mvp/storage/FragmentOcean/'
const blast_sepoliaRpc = 'https://sepolia.blast.io'
const ethRpc = 'https://rpc.ankr.com/eth'
const blast_mainnet = 'https://rpc.blast.io'
const bsc_mainchain = 'https://bsc-dataseed.binance.org/'

const ReferralsAddress = '0x8f6be4704a3735024F4D2CBC5BAC3722c0C8a0BD'
const ReferralsAddressV2 = '0x64Cab6D2217c665730e330a78be85a070e4706E7'
const conet_storage_contract_address = `0x7d9CF1dd164D6AF82C00514071990358805d8d80`
const adminCNTP= '0x44d1FCCce6BAF388617ee972A6FB898b6b5629B1'
const referrerCNTP= '0x63377154F972f6FC1319e382535EC9691754bd18'

const blast_CNTP = '0x53634b1285c256aE64BAd795301322E0e911153D'
const CNTPB_contract = '0x6056473ADD8bC89a95325845F6a431CCD7A849bb'
const eth_usdt_contract = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const blast_usdb_contract = '0x4300000000000000000000000000000000000003'

const bnb_wbnb_contract = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const bnb_usdt_contract = '0x55d398326f99059fF775485246999027B3197955'

const checkRefereeV1 = async () => {
	if (!CoNET_Data?.profiles) {
		return logger(`registerReferrer CoNET_Data?.profiles Empty error!`)
	}
	const mainProfile = CoNET_Data.profiles[0]
	if (mainProfile.referrer) {
		return
	}

	const myKeyID = mainProfile.keyID
	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	const CNTP_Referrals = new ethers.Contract(ReferralsAddress, CONET_ReferralsAbi, provideNewCONET)
	let referrer: string
	try {
		referrer = await CNTP_Referrals.getReferrer(myKeyID)
	} catch (ex) {
		return logger(`checkRefereeV1 Error!`, ex)
	}
	const add = referrer.toLowerCase()
	if (add === '0x0000000000000000000000000000000000000000') {
		return
	}
	mainProfile.referrer = referrer
}

const getReferees = async (wallet: string, CNTP_Referrals) => {
	

	let result: string[] = []
	try {
		result = await CNTP_Referrals.getReferees(wallet)
	} catch (ex) {
		logger(`getReferees [${wallet}] Error! try again!`)
		return await getReferees (wallet, CNTP_Referrals)
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
	if (!CoNET_Data?.profiles) {
		return logger(`registerReferrer CoNET_Data?.profiles Empty error!`)
	}

	const profile = CoNET_Data.profiles[0]
	if (!profile||!referrer) {
		return false
	}

	if (referrer.toLowerCase() === profile.keyID.toLowerCase() || profile.referrer) {
		return false
	}

	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	const wallet = new ethers.Wallet(profile.privateKeyArmor, provideNewCONET)
	const CNTP_Referrals = new ethers.Contract(ReferralsAddressV2, CONET_ReferralsAbi, wallet)

	try {
		await CNTP_Referrals.addReferrer(referrer)
	} catch (ex: any) {
		if (/sender already has referrer/.test(ex.message)) {
			return false
		}
		logger(`registerReferrer Error`, ex)
		return false
	}
	profile.referrer = referrer
	return true
}

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

	const referrer = getAddress(cmd.data[0])||getAddress(cmd.data[1])
	if (!referrer) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}

	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	const CNTP_Referrals = new ethers.Contract(ReferralsAddressV2, CONET_ReferralsAbi, provideNewCONET)
	cmd.data = [await getAllReferees(referrer, CNTP_Referrals)]
	returnUUIDChannel(cmd)
}

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
let authorization_key = ''

let getProfileAssetsBalanceResult: getBalanceAPIresult = {CNTP_Balance: '0', CONET_Balance: '0', Referee: '0', lastTime: 0}
let scanPoint = 0

let runningGetAllProfileAssetsBalance = false
const getAllProfileAssetsBalanceWaitingList: any [] = []
let lastAllProfileAssetsBalanceTimeStamp = 0
const minCheckTimestamp = 1000 * 12 		//			must big than 12s

const getAllProfileAssetsBalance = async () => {
	return new Promise(async resolve => {
		if (!CoNET_Data?.profiles) {
			logger(`getAllProfileAssetsBalance Error! CoNET_Data.profiles empty!`)
			return resolve (false)
		}

		const timeStamp = new Date().getTime()
		if (timeStamp - lastAllProfileAssetsBalanceTimeStamp < minCheckTimestamp) {
			return resolve (true)
		}

		if (runningGetAllProfileAssetsBalance) {
			return getAllProfileAssetsBalanceWaitingList.push (resolve)
		}
		runningGetAllProfileAssetsBalance = true
		

		for (let profile of CoNET_Data.profiles) {
			await getProfileAssetsBalance(profile)
		}
		resolve (true)
		
		const callbakWaitingList = () => {
			if (!getAllProfileAssetsBalanceWaitingList.length) {
				return
			}
			const callback = getAllProfileAssetsBalanceWaitingList.pop()
			if (callback) {
				callback(true)
			}
			return callbakWaitingList()
		}
		callbakWaitingList()
		runningGetAllProfileAssetsBalance = false
	})
	
}

const getProfileAssetsBalance = async (profile: profile) => {

	const key = profile.keyID
	
	if (key) {
		const current = profile.tokens
		checkTokenStauct(current)

		const provideETH = new ethers.JsonRpcProvider(ethRpc)
		const provideBlast = new ethers.JsonRpcProvider(blast_sepoliaRpc)
		const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
		const provideBlastMainChain = new ethers.JsonRpcProvider(blast_mainnet)
		const provideBNB = new ethers.JsonRpcProvider(bsc_mainchain)
		// const walletETH = new ethers.Wallet(profile.privateKeyArmor, provideETH)
		const [balanceCNTP, balanceCNTPB, balanceUSDT, ETH, blastETH, usdb, wbnb, wusdt, conet_Holesky] = await Promise.all([
			scanCNTP (key, provideBlast),
			scanCNTPB (key, provideCONET),
			scanUSDT (key, provideETH),
			scanETH (key, provideETH),
			scanBlastETH (key, provideBlast),
			scanUSDB (key, provideBlastMainChain),
			scanWUSDT (key,provideBNB),
			scanWBNB (key,provideBNB),
			scanCONETHolesky(key, provideCONET)
		])
		

		current.cntp.balance = balanceCNTP === BigInt(0) ? '0' : parseFloat(ethers.formatEther(balanceCNTP)).toFixed(4)
		current.cntpb.balance = balanceCNTPB === BigInt(0) ? '0' : parseFloat(ethers.formatEther(balanceCNTPB)).toFixed(4)
		current.usdt.balance = balanceUSDT === BigInt(0) ? '0' : parseFloat(ethers.formatEther(balanceUSDT)).toFixed(4)
		current.eth.balance = ETH === BigInt(0) ? '0' : parseFloat(ethers.formatEther(ETH)).toFixed(4)
		current.blastETH.balance = blastETH === BigInt(0) ? '0' : parseFloat(ethers.formatEther(blastETH)).toFixed(4)
		current.usdb.balance = usdb === BigInt(0) ? '0' : parseFloat(ethers.formatEther(usdb)).toFixed(4)
		current.wbnb.balance = wbnb === BigInt(0) ? '0' : parseFloat(ethers.formatEther(wbnb)).toFixed(4)
		current.wusdt.balance = wusdt === BigInt(0) ? '0' : parseFloat(ethers.formatEther(wusdt)).toFixed(4)
		current.conet.balance = conet_Holesky === BigInt(0) ? '0' : parseFloat(ethers.formatEther(conet_Holesky)).toFixed(4)

		//current.usdb.balance = balanceUSDB === BigInt(0) ? '0' : parseFloat(ethers.formatEther(balanceUSDB)).toFixed(4)


		// return postToEndpoint(url, false, '')
		// 	.then (response => {
				
		// 		//@ts-ignore
		// 		const data: blockscout_result = response
		// 		if (data?.items) {

		// 			const balance = parseFloat(data.items[0].value)/10**18
		// 			const beforeBalance = parseFloat(getProfileAssetsBalanceResult.CNTP_Balance)
		// 			if (!isNaN(balance) && balance - beforeBalance > 0 ) {
		// 				getProfileAssetsBalanceResult.CNTP_Balance = current.cntp.balance = CNTP_Balance = balance.toFixed(4)
		// 				getProfileAssetsBalanceResult.lastTime = date
		// 			}
					
		// 		}
		// 		return postToEndpoint(url1, false, '')})
		// 	.then( async response => {
		// 		//@ts-ignore
		// 		const data: blockscout_address = response
				
		// 		if (data?.coin_balance ) {
		// 			const balance = parseFloat(data.coin_balance)
		// 			const beforeBalance = parseFloat(getProfileAssetsBalanceResult.CONET_Balance)
		// 			if (!isNaN(balance) && balance -beforeBalance >0) {
		// 				getProfileAssetsBalanceResult.CONET_Balance = current.conet.balance = balance.toFixed(4)
		// 				getProfileAssetsBalanceResult.lastTime = date
		// 			}
		// 		}
				
		// 		// if (profile.referrer) {
		// 		// 	await registerReferrer(profile.referrer)
		// 		// } else if (!profile.referrer && referrals) {
		// 		// 	await registerReferrer(referrals)
		// 		// 	profile.referrer = referrals
		// 		// }
				
		// 		sendState('cntp-balance', {CNTP_Balance: CNTP_Balance, CONET_Balance: profile.tokens.conet.balance, currentCNTP: currentCNTP})
		// 		const ret = {
		// 			CNTP_Balance,
		// 			CONET_Balance: profile.tokens.conet.balance,
		// 			Referee: profile.referrer
		// 		}
		// 		getProfileAssetsBalanceLocked = false
		// 		return ret
		// 	})
		// 	.catch (ex => {
		// 		getProfileAssetsBalanceLocked = false
		// 		return null
		// 	})
		

	}

	return false
}

const storeSystemData = async () => {

	if (!CoNET_Data||! passObj?.passcode) {
		return
	}
	const password = passObj.passcode.toString()
	const data = {
		mnemonicPhrase: CoNET_Data.mnemonicPhrase,
		dammy: buffer.Buffer.allocUnsafeSlow( 1024 * ( 20 + ( Math.random()*20)))
	}

	const waitEntryptData = buffer.Buffer.from(JSON.stringify(data))
	
	const filenameIterate1 = ethers.id(password)
	const filenameIterate2 = ethers.id(filenameIterate1)
	const filenameIterate3 = ethers.id(ethers.id(ethers.id(filenameIterate2)))

	const encryptIterate1 = await CoNETModule.aesGcmEncrypt (waitEntryptData, password)
	const encryptIterate2 = await CoNETModule.aesGcmEncrypt (encryptIterate1, filenameIterate1)
	const encryptIterate3 = await CoNETModule.aesGcmEncrypt (encryptIterate2, filenameIterate2)
	
	const filename =  filenameIterate3

	CoNET_Data.encryptedString = encryptIterate3
	
	if (!CoNET_Data.encryptedString) {
		return logger(`encryptStoreData aesGcmEncrypt Error!`)
	}
	passObj.passcode = passObj.password = passObj._passcode = ''

	const CoNETIndexDBInit: CoNETIndexDBInit = {
		id: passObj,
		preferences: CoNET_Data.preferences
	}


	sendState('beforeunload', true)

	try {
		await storageHashData ('init', buffer.Buffer.from(JSON.stringify (CoNETIndexDBInit)).toString ('base64'))
		await storageHashData (filename, CoNET_Data.encryptedString)
	} catch (ex) {
		logger(`storeSystemData storageHashData Error!`, ex)
	}

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
	if (!CoNET_Data?.profiles) {
		cmd.data[0] = ''
		return returnUUIDChannel (cmd)
	}

	const mainProfile = CoNET_Data.profiles[0]
	CoNET_Data.preferences = cmd.data[2] || null

	const faucetResult = await getFaucet (mainProfile.keyID)
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
	await getAllProfileAssetsBalance()

	const mainProfile = CoNET_Data.profiles[0]
	const gasBalance = parseFloat(mainProfile.tokens.conet.balance)
	if (gasBalance > 0.01) {
		if ( referrer ) {
			const kk = await registerReferrer (referrer)
			if (kk) {
				//await storeSystemData ()
				await updateProfilesVersion()
			}
		}
	}
	
	authorization_key = cmd.data[0] = uuid.v4()
	returnUUIDChannel(cmd)
	//	reflash all balance
	
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

		if (!CoNET_Data||!passObj) {
			return new Error(`decryptSystemData Have no CoNET_Data Error!`)
		}

		const password = passObj.passcode.toString()

		if (!password) {
			throw new Error(`decryptSystemData Password Empty Error!`)
		}

		const filenameIterate1 = ethers.id(password)
		const filenameIterate2 = ethers.id(filenameIterate1)
		const filenameIterate3 = ethers.id(ethers.id(ethers.id(filenameIterate2)))
	

		const filename =  filenameIterate3
		const encryptedObj = await getHashData(filename)

		
		const encryptIterate3 = await CoNETModule.aesGcmDecrypt (encryptedObj, filenameIterate2)
		
		const encryptIterate2 = await CoNETModule.aesGcmDecrypt (encryptIterate3, filenameIterate1)
		const encryptIterate1 = await CoNETModule.aesGcmDecrypt (encryptIterate2, password)
		
		const obj = JSON.parse(encryptIterate1)
		CoNET_Data.mnemonicPhrase = obj.mnemonicPhrase
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

let getAllProfilesCount = 0
let lastTimeGetAllProfilesCount = 0
const minTimeStamp = 1000 * 15

const getAllProfiles = async (cmd: worker_command) => {
	const _authorization_key: string = cmd.data[0]
	if (!CoNET_Data || authorization_key!== _authorization_key) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	logger(`getAllProfiles connecting count [${++getAllProfilesCount}]!`)
	const timeStamp = new Date().getTime()
	if (timeStamp - lastTimeGetAllProfilesCount < minTimeStamp) {
		--getAllProfilesCount
		cmd.data = [CoNET_Data.profiles]
		return returnUUIDChannel(cmd)
	}

	await checkUpdateAccount()
	await getAllProfileAssetsBalance()
	cmd.data = [CoNET_Data.profiles]
	--getAllProfilesCount
	lastTimeGetAllProfilesCount = timeStamp
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
	await updateProfilesVersion()
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
	const profileImg = _profile?.data?.profileImg
	if (profileImg) {
		const resized: any = await resizeImage(profileImg, 180, 180)
		_profile.data.profileImg = 'data:image/png;base64,' + resized.rawData
	}
	CoNET_Data.profiles[index].data = _profile.data
	await updateProfilesVersion()
	cmd.data[0] = CoNET_Data.profiles
	returnUUIDChannel(cmd)
	
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
		referrer: null,
		network: {
			recipients: []
		},
		tokens: initProfileTokens(),
		data: UIData
	}

	CoNET_Data.profiles.push(profile)
	
	await updateProfilesVersion()
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
	await storeSystemData ()
	await checkUpdateAccount()
	
	
	authorization_key = cmd.data[0] = uuid.v4()
	returnUUIDChannel(cmd)
}

const initCoNET_Data = async ( passcode = '' ) => {
	
    //const acc = createKey (1)
	const acc = createKeyHDWallets()
	if (!acc) {
		return 
	}
	await initSystemDataV1(acc)
}

const checkTokenStauct = (token: any) => {
	if (!token?.cntp) {
		token.cntp = {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: blast_CNTP
		}
	}
	if (!token?.cntpb) {
		token.cntpb = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: CNTPB_contract
		}
	}
	if (!token?.usdt) {
		token.usdt = {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 6,
			contract: eth_usdt_contract
		}
	}
	if (!token?.usdb) {
		token.usdb = {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: eth_usdt_contract
		}
	}
	if (!token?.eth) {
		token.eth = {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 18,
			contract: ''
		}
	}
	if (!token?.blastETH) {
		token.blastETH = {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: ''
		}
	}
	if (!token?.conet) {
		token.conet = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: ''
		}
	}
	if (!token?.wbnb) {
		token.wbnb = {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_wbnb_contract
		}
	}
	if (!token?.wusdt) {
		token.wusdt = {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_usdt_contract
		}
	}
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

const regiestAccount = async () => {
	const url = `${api_endpoint}/api/storageFragments`
	if (!CoNET_Data?.mnemonicPhrase||!CoNET_Data?.profiles) {
		return logger (`regiestAccount CoNET_Data object null Error! Stop process!`)
	}
	const pass = CoNETModule.EthCrypto.hash.keccak256(CoNET_Data.mnemonicPhrase)
	const data = await CoNETModule.aesGcmEncrypt(buffer.Buffer.from(JSON.stringify(CoNET_Data)).toString('base64'), pass)
	const profile = CoNET_Data.profiles[0]
	const message =JSON.stringify({ walletAddress: profile.keyID, data})
	const messageHash = CoNETModule.EthCrypto.hash.keccak256(message)
	const wallet = new ethers.Wallet(profile.privateKeyArmor)
	const wallet_sign = await wallet.signMessage(messageHash)
	const signMessage = CoNETModule.EthCrypto.sign( profile.privateKeyArmor, messageHash )
	const sendData = {
		message, signMessage
	}
	const result: any = await postToEndpoint(url, true, sendData)

}

const checkCoNET_DataVersion = async (callback) => {

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

let checkcheckUpdateLock = false
let lastCheckcheckUpdateTimeStamp = 0

const checkUpdateAccount = () => {

	return new Promise(resolve=> {
		if (!CoNET_Data || !CoNET_Data.profiles?.length) {
			resolve(false)
			return logger(`checkUpdateAccount CoNET_Data or CoNET_Data.profiles hasn't ready Error!`)
		}
		const currentTimestamp = new Date().getTime()
		if (currentTimestamp - lastCheckcheckUpdateTimeStamp < minCheckTimestamp) {
			return resolve(false)
		}
		if (checkcheckUpdateLock) {
			return resolve(false)
		}
		checkcheckUpdateLock = true
		
		return checkCoNET_DataVersion( async _ver => {
			
			if (!CoNET_Data) {
				checkcheckUpdateLock = false
				logger(`checkUpdateAccount CoNET_Data is empty Error!`)
				return resolve(false)
			}
			lastCheckcheckUpdateTimeStamp = currentTimestamp
			logger(`checkUpdateAccount profile ver is [${_ver}] Local ver is [${CoNET_Data.ver}]`)

			if (_ver > CoNET_Data.ver) {

				logger (`checkUpdateAccount current ver [${CoNET_Data.ver}] is old! remote is [${_ver}] Update it`)

				const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
				const partEncryptPassword = encryptPasswordIssue(_ver, passward, 0)
				const firstFragmentName = createFragmentFileName(_ver, passward, 0)
				
				const firstFragmentEncrypted = await getFragmentsFromPublic(firstFragmentName)
				if (!firstFragmentEncrypted) {
					logger(`checkUpdateAccount update error! cant get the first Fragment of ver number${_ver} `)
					checkcheckUpdateLock = false
					return resolve(false)
				}

				logger(`checkUpdateAccount fetch ${_ver} first Fragment [${firstFragmentName}] with passward [${partEncryptPassword}]`)

				let firstFragmentObj
				try{
					const firstFragmentdecrypted = await CoNETModule.aesGcmDecrypt (firstFragmentEncrypted, partEncryptPassword)
					firstFragmentObj = JSON.parse(firstFragmentdecrypted)
				} catch (ex) {
					logger(`checkUpdateAccount update create firstFragmentObj error!`, ex)
					checkcheckUpdateLock = false
					return resolve(false)
				}

				const totalFragment = firstFragmentObj.totalFragment
				let clearData: string = firstFragmentObj.data
				const series: any[] = []

				for (let i = 1; i < totalFragment; i ++) {
					const stage = next => {
						getNextFragmentIPFS(_ver, passward, i)
						.then(text=> {
							if (!text) {
								return next (`getNextFragment [${i}] return NULL Error`)
							}
							clearData += text
							return next(null)
						})
					}
					series.push(stage)
				}

				return async.series(series)
					.then (async () => {
						let profile
						try{
							profile = JSON.parse(clearData)
						} catch(ex){
							logger(`getLocalProfile JSON.parse(clearData) Error`, ex)
							checkcheckUpdateLock = false
							return resolve(false)
						}

						if (CoNET_Data) {
							CoNET_Data.profiles = profile
							CoNET_Data.ver = _ver
						}
						await storagePieceToLocal()
						checkcheckUpdateLock = false
						return resolve(true)
					}).catch ( ex=> {
						checkcheckUpdateLock = false
						logger(`async.series catch ex`, ex)
						return resolve(false)
					})
			}
			checkcheckUpdateLock = false
			return resolve(false)
		})
	})
	
}


const getNextFragmentIPFS = async (ver: number, passObjPassword: string, i) => {
	const nextEncryptPassword = encryptPasswordIssue(ver, passObjPassword, i)
	const nextFragmentHash = createFragmentFileName(ver, passObjPassword, i)
	const nextFragmentText = await getFragmentsFromPublic(nextFragmentHash)
	logger(`getNextFragmentIPFS [${nextFragmentHash}] length = ${nextFragmentText.length}`)
	if (!nextFragmentText) {
		logger(`getNextFragmentIPFS Fetch [${nextFragmentHash}] got remote null Error!`)
		return ''
	}
	try {
		const decryptedText = await CoNETModule.aesGcmDecrypt (nextFragmentText, nextEncryptPassword)
		const decryptedFragment = JSON.parse(decryptedText)
		return decryptedFragment.data
	} catch (ex) {
		logger(`getNextFragmentIPFS aesGcmDecrypt [${nextFragmentText}] error!`, ex)
	}
}

const getFragmentsFromPublic: (hash: string) => Promise<string> = (hash) => {
	const fileUrl = cloudStorageEndpointUrl + `${hash}`
	return new Promise(resolve=> {fetchWithTimeout (fileUrl, 
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
				logger(`getFragmentsFromPublic can't get hash ${hash} Error!`)
				return ''
			}
			return res.text()
		}).then( async text => {
			return resolve(text)
		})
	})
}

const updateFragmentsToIPFS = async (encryptData: string, hash: string, keyID: string, privateKeyArmor: string) => {

		
	const url = `${ api_endpoint }/api/storageFragments`
	
	const message =JSON.stringify({ walletAddress: keyID, data: encryptData, hash})
	const messageHash = ethers.id(message)

	const signMessage = CoNETModule.EthCrypto.sign(privateKeyArmor, messageHash)

	const sendData = {
		message, signMessage
	}
	const result: any = await postToEndpoint(url, true, sendData)
	logger(`updateProfiles got result [${result}] from conet api server!`)
}

const initProfileTokens = () => {
	return {
		conet: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: ''
		},
		cntp: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: blast_CNTP
		},
		cntpb: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: CNTPB_contract
		},
		usdt: {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 6,
			contract: eth_usdt_contract
		},
		usdb: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: eth_usdt_contract
		},
		eth: {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 18,
			contract: ''
		},
		blastETH: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: ''
		},
		wbnb: {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_wbnb_contract
		},
		wusdt: {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_usdt_contract
		}
	}
}

const resizeImage = ( mediaData: string, imageMaxWidth: number, imageMaxHeight: number ) => {
	return new Promise(resolve => {
		const media = mediaData.split(',')
		const _media = buffer.Buffer.from ( media[1], 'base64')
		
		const ret = {
			total_bytes: media[1].length,
			media_type: 'image/png',
			rawData: media[1],
			media_id_string: null
		}
		
		
		//if ( mediaData.length > maxImageLength) {
		const exportImage = ( _type, img ) => {
			return img.getBuffer ( _type, ( err, _buf: Buffer ) => {
				if ( err ) {
					return resolve ( false )
				}
				ret.rawData = _buf.toString( 'base64' )
				ret.total_bytes = _buf.length
	
				return resolve ( ret )
			})
		}
	
		return Jimp.read ( _media, ( err, image ) => {
			if ( err ) {
				return resolve ( false )
			}
			const uu = image.bitmap
	
			if ( uu.height +  uu.width > imageMaxHeight + imageMaxWidth ) {
				if ( uu.height > uu.widt ) {
					image.resize ( Jimp.AUTO, imageMaxHeight )
				} else {
					image.resize ( imageMaxWidth, Jimp.AUTO )
				}
			
			}
			//		to PNG
	
			return image.deflateStrategy ( 2, () => {
				return exportImage ( ret.media_type, image )
			})
			
		})
	})

	
}

const getAssetsPrice = (cmd: worker_command) => {
	cmd.data =[]
	const url = 'https://min-api.cryptocompare.com/data/pricemulti?fsyms=usdt,bnb,ETH&tsyms=USD'
	return fetch(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		},
		cache: 'no-store',
		referrerPolicy: 'no-referrer'
	}).then ( async res => {
		if (res.status!== 200) {
			getAssetsPrice(cmd)
			return logger(`getPrice [${url}] response not 200 Error! try again!`)
		}
		return res.json()
	}).then((data) => {
		cmd.data = [data]
		returnUUIDChannel(cmd)
	}).catch(ex=> {
		logger(`getPrice [${url}] catch err`, ex)
		cmd.err = 'FAILURE'
		returnUUIDChannel(cmd)
	})
	
}

let getFaucetRoop = 0
const getFaucet = async (keyID: string) => {
	return new Promise (async resolve => {
		if (++getFaucetRoop > 6) {
			getFaucetRoop = 0
			logger(`getFaucet Roop > 6 STOP process!`)
			return resolve(null)
		}
		const url = `${api_endpoint}/api/conet-faucet`
		let result
		try {
			result = await postToEndpoint(url, true, { walletAddr: keyID })
		} catch (ex) {
			logger (`getFaucet postToEndpoint [${url}] error! `, ex)
			return setTimeout(() => {
				return getFaucet (keyID)
			}, 500)
		}
		getFaucetRoop = 0
		return resolve(result)
	})

}

const getCurrentProfileVer = async (storageVer: any, address: string) => {
	let rc
	try {
		rc = await storageVer.count(address)
	} catch(ex) {
		logger(`getCurrentVer error! try again`, ex)
		return -1
	}

	return parseInt(rc)
	
}

let updateChainVersionCount = 0
const updateChainVersion = async (storageVer: any) => {
	if (++updateChainVersionCount > 6) {
		updateChainVersionCount = 0
		return
	}

	let rc
	try {
		const tx = await storageVer.versionUp('0x0')
		rc = await tx.wait ()
	} catch(ex) {
		logger(`updateChainVersion error! try again`, ex)
		return await updateChainVersion (storageVer)
	}
	const logs = rc.logs[0]
	let ver = -1
	if (logs?.args) {
		ver = parseInt(logs.args[2])
	}
	return ver
}

/**
 * 
 * 		
 */
interface fragmentsObj {
	localEncryptedText: string
	remoteEncryptedText: string
	fileName: string
}

const getLocalProfile = async (ver: number) => {
	if (!CoNET_Data?.profiles || !passObj) {
		return logger(`updateProfilesVersion !CoNET_Data[${!CoNET_Data}] || !passObj[${!passObj}] === true Error! Stop process.`)
	}
	
	const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
	const partEncryptPassword = encryptPasswordIssue(ver, passward, 0)
	const firstFragmentName = createFragmentFileName(ver, passward, 0)

	let firstFragmentObj
	try{
		const firstFragmentEncrypted = await getHashData (firstFragmentName)
		const firstFragmentdecrypted = await CoNETModule.aesGcmDecrypt (firstFragmentEncrypted, partEncryptPassword)
		firstFragmentObj = JSON.parse(firstFragmentdecrypted)
	} catch (ex){
		return logger(`getLocalProfile JSON.parse(firstFragmentdecrypted) Error!`)
	}
	logger(`getLocalProfile ver [${ver}] first Fragment [${firstFragmentName}] with password [${partEncryptPassword}]`)
	const totalFragment = firstFragmentObj.totalFragment
	let clearData: string = firstFragmentObj.data
	const series: any[] = []
	for (let i = 1; i < totalFragment; i ++) {
		const stage = next => {
			getNextFragmentLocal(ver, passward, i).then(text=> {
				if (!text) {
					return next (`getNextFragment return NULL Error`)
				}
				clearData += text
				return next(null)
			})
		}
		series.push(stage)
	}

	return async.series(series).then (() => {
		sendState('beforeunload', false)
		try{
			const profile = JSON.parse(clearData)
			if (CoNET_Data) {
				CoNET_Data.profiles = profile
				CoNET_Data.ver = ver
			}
			
		} catch(ex){
			logger(`getLocalProfile JSON.parse(clearData) Error`, ex)
		}
	}).catch (ex=> {
		sendState('beforeunload', false)
		logger(`async.series catch ex`, ex)
	})
}

const getNextFragmentLocal = async (ver: number, passObjPassword: string, i) => {
	const nextEncryptPassword = encryptPasswordIssue(ver, passObjPassword, i)
	const nextFragmentName = createFragmentFileName(ver, passObjPassword, i)
	
	try {
		const EncryptedText = await getHashData (nextFragmentName)
		logger(`getNextFragmentLocal get nextFragment [${nextFragmentName}] length = ${EncryptedText.length}`)
		const decryptedText = await CoNETModule.aesGcmDecrypt (EncryptedText, nextEncryptPassword)
		const decryptedFragment = JSON.parse(decryptedText)
		return decryptedFragment.data
	} catch (ex) {
		logger(`getNextFragment error!`, ex)
		return ''
	}
}

const updateProfilesVersion = async () => {
	if (!CoNET_Data?.profiles || !passObj) {
		return logger(`updateProfilesVersion !CoNET_Data[${!CoNET_Data}] || !passObj[${!passObj}] === true Error! Stop process.`)
	}
	const profile = CoNET_Data.profiles[0]
	const privateKeyArmor = profile.privateKeyArmor || ''
	const localCurrentVer = CoNET_Data.ver
	
	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	
	const checkVer = new ethers.Contract(conet_storage_contract_address, conet_storageAbi, provideNewCONET)
	const currentVer = await getCurrentProfileVer(checkVer, profile.keyID)
	if (currentVer < 0) {
		return logger(`storeFragmentToIPFS CONET RPC Error! STOP process`)
	}

	if (localCurrentVer < currentVer) {
		return logger(`local profiles Version less then global version. Local need update first!`)
	}

	++CoNET_Data.ver
	sendState('beforeunload', true)
	const chainVer = currentVer + 1
	const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
	const profilesClearText = JSON.stringify(CoNET_Data.profiles)
	const fileLength = Math.round(1024 * (10 + Math.random() * 20))
	const chearTextFragments = splitTextLimitLength(profilesClearText, fileLength)

	const series: any[] = []
	
	chearTextFragments.forEach((n, index)=> {
		const stage = next => storagePieceToLocalAndIPFS(passward, n, index, chearTextFragments.length, 
				fileLength, chainVer, privateKeyArmor, profile.keyID).then (() => {
			logger(`piece ${index} finished! goto next!`)
			return next(null,null)
		})
		series.push(stage)
	})
	async.series(series).then (async () => {
		
		const wallet = new ethers.Wallet(profile.privateKeyArmor, provideNewCONET)
		const storageVer = new ethers.Contract(conet_storage_contract_address, conet_storageAbi, wallet)
		await updateChainVersion(storageVer)
		
		sendState('beforeunload', false)
		logger(`async.series finished`)
	}).catch (ex=> {
		sendState('beforeunload', false)
		logger(`async.series catch ex`, ex)
	}) 

}

const storagePieceToLocal = () => {
	
	return new Promise(resolve => {
		if (!CoNET_Data||! CoNET_Data.profiles) {
			logger(`storagePieceToLocal empty CoNET_Data Error!`)
			return resolve (false)
		}
		const profile = CoNET_Data.profiles[0]
		const fileLength = Math.round(1024 * (10 + Math.random() * 20))
		const profilesClearText = JSON.stringify(CoNET_Data.profiles)
		const chearTextFragments = splitTextLimitLength(profilesClearText, fileLength)
		const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
		const privateKeyArmor = profile.privateKeyArmor||''
		const chainVer = CoNET_Data.ver
	
		const series: any[] = []
	
		chearTextFragments.forEach((n, index)=> {
			const stage = next => _storagePieceToLocal(passward, n, index, chearTextFragments.length, 
					fileLength, chainVer, privateKeyArmor, profile.keyID ).then (() => {
				logger(`piece ${index} finished! goto next!`)
				return next(null,null)
			})
			series.push(stage)
		})
	
		return async.series(series).then (async () => {
			
			sendState('beforeunload', false)
			logger(`async.series finished`)
			resolve(true)
		}).catch (ex=> {
			sendState('beforeunload', false)
			logger(`async.series catch ex`, ex)
			resolve(false)
		}) 
	})


}


const _storagePieceToLocal = (mnemonicPhrasePassword: string, fragment: string, index: number,
	totalFragment: number, targetFileLength: number, ver: number, privateArmor: string, keyID: string
) => new Promise( async resolve=> {

	const partEncryptPassword = encryptPasswordIssue(ver, mnemonicPhrasePassword, index)
	const localData = {
		data: fragment,
		totalFragment: totalFragment,
		index
	}
	const piece = {
		localEncryptedText: await CoNETModule.aesGcmEncrypt (JSON.stringify(localData), partEncryptPassword),
		fileName: createFragmentFileName(ver, mnemonicPhrasePassword, index),
	}
	logger(`storage version ${ver} fragment  No.[${index}] [${piece.fileName}] with password ${partEncryptPassword}`)
	async.parallel([
		next => storageHashData (piece.fileName, piece.localEncryptedText).then(()=> next(null)),
	], err=> {
		logger(`async.parallel finished err = [${err}]`)
		resolve(false)
	})
})

const storagePieceToLocalAndIPFS = ( mnemonicPhrasePassword: string, fragment: string, index: number,
		totalFragment: number, targetFileLength: number, ver: number, privateArmor: string, keyID:string
	) => {
	return new Promise(async resolve=> {
		
		const _dummylength = targetFileLength - fragment.length > 1024 * 5 ? targetFileLength - totalFragment : 0
		const dummylength = (totalFragment === 2 && _dummylength )
			? Math.round((targetFileLength - fragment.length) * Math.random()) : 0
		const dummyData = buffer.Buffer.allocUnsafeSlow( dummylength)
		const partEncryptPassword = encryptPasswordIssue(ver, mnemonicPhrasePassword, index)
		const localData = {
			data: fragment,
			totalFragment: totalFragment,
			index
		}
		const IPFSData = {
			data: fragment,
			totalFragment: totalFragment,
			index,
			dummyData: dummyData
		}
		const piece: fragmentsObj = {
			localEncryptedText: await CoNETModule.aesGcmEncrypt (JSON.stringify(localData), partEncryptPassword),
			remoteEncryptedText: await CoNETModule.aesGcmEncrypt (JSON.stringify(IPFSData), partEncryptPassword),
			fileName: createFragmentFileName(ver, mnemonicPhrasePassword, index),
		}
		logger(`storage version ${ver} fragment  No.[${index}] [${piece.fileName}] with password ${partEncryptPassword}`)
		async.parallel([
			next => storageHashData (piece.fileName, piece.localEncryptedText).then(()=> next(null)),
			next => updateFragmentsToIPFS(piece.remoteEncryptedText, piece.fileName, keyID, privateArmor).then(()=> next(null))
		], err=> {
			logger(`async.parallel finished err = [${err}]`)
			resolve(null)
		})
		
	})

}

const encryptPasswordIssue = (ver: number, passcode: string, part: number) => {
	const password =  ethers.id('0x' + (BigInt(ethers.id(ver.toString())) + BigInt(ethers.id(passcode))).toString(16))
	let _pass = ethers.id(password)
	for (let i = 0; i < part; i++) {
		_pass = ethers.id(_pass)
	}
	return _pass.substring(2)
}

const createFragmentFileName = (ver: number, password: string, part: number) => {
	return ethers.id(ethers.id(ethers.id(ethers.id(ver.toString()) + ethers.id(password) + ethers.id(part.toString()))))
}

const splitTextLimitLength: (test: string, limitLength: number) => string[] = (test, limitLength) => {
	const ret: string[] = []
	let start = 0
	let _limitLength = test.length > limitLength ? limitLength : test.length/2
	const split = () => {

		
		const price = test.substring(start, _limitLength + start)
		if (price.length) {

			ret.push(price)

			start+=_limitLength
			
		}
		if (start < test.length) {
			return split()
		}
		return ret
	}
	return split()
}

const recoverProfileFromSRP = () => {
	return new Promise((resolve, reject) => {
		if (!CoNET_Data || !CoNET_Data?.mnemonicPhrase) {
			const errMessage = 'recoverProfileFromSRP CoNET_Data.mnemonicPhrase is null Error!'
			return reject(new Error(errMessage))
		}
		const SRP = CoNET_Data.mnemonicPhrase
		let acc
		try {
			acc = ethers.Wallet.fromPhrase(SRP)
		} catch (ex) {
			logger(`recoverAccount Phrase SRP Error! [${SRP}]`)
			return reject (ex)
		}

		const privateKey = acc.signingKey.privateKey
		const publicKey = acc.address

		return checkProfileVersion(publicKey, async ver => {
			
			//		network error!
			if (ver < 0) {
				const errMessage =`recoverProfileFromSRP checkProfileVersion RoopCount > 5! Stop trying!`
				return reject (new Error(errMessage))
			}
			//		init
			await initSystemDataV1(acc)
			if (ver === 0) {
				// await getFaucet (publicKey)
				return resolve(true)
			}
			
			logger(`recoverProfileFromSRP has update file in IPFS!`)
			await getLocalProfile(ver)

			return resolve(true)
			//const firstprice = getFirstFragmentName(SRP, ver)
			
		})
	})

}

let checkProfileVersionRoopCount = 0

const checkProfileVersion = (publicKeyID: string, callback: (ver: number) => void) => {
	if (++checkProfileVersionRoopCount > 5) {
		return callback(-1)
	}
	const provide = new ethers.JsonRpcProvider(conet_rpc)
	const conet_storage = new ethers.Contract(conet_storage_contract_address, conet_storageAbi, provide)
	conet_storage.count(publicKeyID)
	.then (count => {
		checkProfileVersionRoopCount = 0
		return callback (parseInt(count.toString()))
	}).catch (ex => {
		logger(`checkCoNET_DataVersion error! Try again! roop = [${checkProfileVersionRoopCount}]`, ex)
		return setTimeout(() => {
			return checkProfileVersion(publicKeyID, callback)
		}, 1000)
		
	})
}

//*		scan assets
		const scanCONETHolesky = async (walletAddr: string, privideCONET: any) => {
			try{
				const ret = privideCONET.getBalance(walletAddr)
				return ret
			} catch (ex) {
				logger(`scanCONETHolesky [${walletAddr}] try Again!`, ex)
				return setTimeout(async () => {
					return await scanCONETHolesky(walletAddr, privideCONET)
				}, 500)
			}
			
		}

		const scanCNTP = async (walletAddr: string, privideCONET: any) => {
			
			const CNTP = new ethers.Contract(blast_CNTP, blast_CNTPAbi, privideCONET)
			try {
				const ret = await CNTP.balanceOf(walletAddr)
				return ret
			} catch (ex) {
				logger(`scanCNTP [${walletAddr}]`, ex)
				return setTimeout(async () => {
					return await scanCNTP(walletAddr, privideCONET)
				}, 500)
			}

		}

		const scanCNTPB =  async (walletAddr: string, provideCONET: any) => {
			
			const CNTPB = new ethers.Contract(CNTPB_contract, blast_CNTPAbi, provideCONET)
			try {
				const ret = await CNTPB.balanceOf(walletAddr)
				return ret

			} catch (ex) {
				logger(`scanCNTPB Error, try again!`)
				return setTimeout(async () => {
					return await scanCNTPB(walletAddr, provideCONET)
				}, 1000)
				
			}
		}

		const scanUSDT = async (walletAddr: string, provideETH: any) => {
			
			const usdt = new ethers.Contract(eth_usdt_contract, blast_CNTPAbi, provideETH)
			try {
				return await usdt.balanceOf(walletAddr)

			} catch (ex) {
				logger(`scanUSDT [${walletAddr}]`, ex)
				return setTimeout(async () => {
					return await scanUSDT(walletAddr, provideETH)
				}, 500)
			}
		}

		const scanUSDB = async (walletAddr: string, provideBlast: any) => {

			const usdb = new ethers.Contract(blast_usdb_contract, blast_CNTPAbi, provideBlast)
			try {
				return await usdb.balanceOf(walletAddr)

			} catch (ex) {
				logger(`scanUSDB [${walletAddr}]`, ex)
				return setTimeout(async () => {
					return await scanUSDB(walletAddr, provideBlast)
				}, 500)
				
			}
		}

		const scanETH = async (walletAddr: string, provideETH: any) => {
			try {
				return await provideETH.getBalance(walletAddr)

			} catch (ex) {
				logger(`scanETH Error! try again!`)
				return setTimeout(async () => {
					return await scanETH(walletAddr, provideETH)
				}, 1000)
				
			}
		}

		const scanBlastETH = async (walletAddr: string, provideBlast: any) => {
			try {
				return await provideBlast.getBalance(walletAddr)

			} catch (ex) {
				logger(`scanBlastETH Error!`, ex)
				return setTimeout(async () => {
					return await scanBlastETH(walletAddr, provideBlast)
				}, 1000)
				
			}
		}

		const scanWBNB = async (walletAddr: string, provideBNB: any) => {
			const wbnb = new ethers.Contract(bnb_wbnb_contract, blast_CNTPAbi, provideBNB)
			try {
				return await wbnb.balanceOf(walletAddr)

			} catch (ex) {
				logger(`scanWBNB Error! try again!`)
				return setTimeout(async () => {
					return await scanWBNB(walletAddr, provideBNB)
				}, 1000)
			}
		}

		const scanWUSDT = async (walletAddr: string, provideBNB: any) => {
			const wusdt = new ethers.Contract(bnb_usdt_contract, blast_CNTPAbi, provideBNB)
			try {
				return await wusdt.balanceOf(walletAddr)

			} catch (ex) {
				logger(`scanWUSDT Error!`)
				return setTimeout(async () => {
					return await scanWUSDT(walletAddr, provideBNB)
				}, 1000)
			}
		}
//