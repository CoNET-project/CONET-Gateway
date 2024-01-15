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
	if (!profile) {
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
	await storage_StoreContainerData ()
	return true
}

const referrerList = async (cmd: worker_command) => {
	cmd.data = [await getReferees()]
	returnUUIDChannel(cmd)
}


const adminCNTP= '0x44d1FCCce6BAF388617ee972A6FB898b6b5629B1'
const referrerCNTP= '0x63377154F972f6FC1319e382535EC9691754bd18'

let nodesGetBalance = []
const getAllNodesInfo = () => new Promise(resolve=> {

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
					if (!isNaN(balance)) {
						getProfileAssetsBalanceResult.CNTP_Balance = current.cntp.balance = CNTP_Balance = balance.toFixed(4)
						getProfileAssetsBalanceResult.lastTime = date
					}
					
				}
				return postToEndpoint(url1, false, '')})
			.then( async response => {
				//@ts-ignore
				const data: blockscout_address = response
				if (data?.coin_balance) {
					const balance = parseFloat(data.coin_balance)
					if (!isNaN(balance)) {
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

// const postMessageWaitingRespon = (cmd: worker_command) => new Promise(resolve => {
// 	const channel = new BroadcastChannel('systemWaiting')
    
//     const kk = (e: any) => {
//         listeningChannel(e.data)
//     }

// 	const listenChannel = cmd.uuid ? new BroadcastChannel(cmd.uuid): null

//     const listeningChannel = (data: any) => {
// 		logger(`postMessageWaitingRespon GOT response uuid = [${cmd.uuid}]`)

// 		if (listenChannel) {
// 			listenChannel.close()
// 		}
		
       
// 		return resolve(data)

//     }

// 	if (listenChannel){
		
//     	listenChannel.addEventListener('message', kk)
// 	}

//     channel.postMessage(JSON.stringify(cmd))
//     channel.close()
// })
    
   
// const checkBalance = async () => {
	
// 	const provider = new CoNETModule.Web3Eth(CoNETNet[0])
// 	const eth = new CoNETModule.Web3Eth(provider)
// 	const contract = new eth.eth.Contract(minERC20ABI, CNTP_Address)
// 	const ba1 = await contract.methods.balanceOf(adminCNTP).call()
// 	const ba2 = await contract.methods.balanceOf(referrerCNTP).call()
// 	const ss1 = weiToEther(eth.utils.fromWei(ba1,'ether'), 0)
// 	const ss2 = weiToEther(eth.utils.fromWei(ba2,'ether'), 0)

// 	async.forEachOf(nodes, async (n: nodeType, index, next ) => {
// 		const ba = await contract.methods.balanceOf(n.minerAddr).call()
// 		n.balance = weiToEther(eth.utils.fromWei(ba,'ether'), 0)
// 		next()
// 	}, () => {
// 		const balance = 100000000 - parseFloat(ss1) - parseFloat(ss2)
// 		allNodes = nodes
// 		CNTP_Balance = balance
// 		sendState('cntp-balance', {balance, nodes})
		
// 		logger(`checkBalance balance = ${balance}`)
		
// 	})
	
// }