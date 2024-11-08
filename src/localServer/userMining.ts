
import {ethers} from 'ethers'
import {logger} from './logger'
import {inspect} from 'node:util'
import {mapLimit} from 'async'
import Colors from 'colors/safe'

import {request as requestHttps} from 'node:https'
import GuardianNodesV2ABI from './CGPNv7New.json'
import NodesInfoABI from './CONET_nodeInfo.ABI.json'
import {createMessage, encrypt, enums, readKey, generateKey, GenerateKeyOptions, readPrivateKey, decryptKey} from 'openpgp'
import {getRandomValues} from 'node:crypto'
import {RequestOptions, request } from 'node:http'

const GuardianNodesInfoV6 = '0x9e213e8B155eF24B466eFC09Bcde706ED23C537a'
const CONET_Guardian_PlanV7 = '0x35c6f84C5337e110C9190A5efbaC8B850E960384'.toLowerCase()
const provider = new ethers.JsonRpcProvider('https://rpc.conet.network')

interface nodeInfo {
	region: string
	ip_addr: string
	armoredPublicKey: string
	nftNumber: number
	domain: string
	lastEposh?: number
}

interface listenClient {
	status: number
	epoch: number
	rate: string
	hash: string
	nodeWallet: string
	online: number
	connetingNodes: number
	nodeDomain: string
	nodeIpAddr: string
	nodeWallets: string []
	minerResponseHash: any
	userWallets: string[]
	isUser: boolean
}


let getAllNodesProcess = false
let Guardian_Nodes: nodeInfo[] = []

const getAllNodes = () => new Promise(async resolve => {
	if (getAllNodesProcess) {
		return resolve (false)
	}
	getAllNodesProcess = true
	const GuardianNodes = new ethers.Contract(CONET_Guardian_PlanV7, GuardianNodesV2ABI, provider)
	let scanNodes = 0
	try {
		const maxNodes: BigInt = await GuardianNodes.currentNodeID()
		scanNodes = parseInt(maxNodes.toString())

	} catch (ex) {
		logger (`getAllNodes currentNodeID Error`, ex)
		return resolve (false)
	}
	if (!scanNodes) {
		logger(`getAllNodes STOP scan because scanNodes == 0`)
		return resolve (false)
	}

	Guardian_Nodes = []

	for (let i = 0; i < scanNodes; i ++) {
		
		Guardian_Nodes.push({
			region: '',
			ip_addr: '',
			armoredPublicKey: '',
			nftNumber: 100 + i,
			domain: ''
		})
	}
	const GuardianNodesInfo = new ethers.Contract(GuardianNodesInfoV6, NodesInfoABI, provider)

	mapLimit(Guardian_Nodes, 5, async (n: nodeInfo) => {

		const nodeInfo = await GuardianNodesInfo.getNodeInfoById(n.nftNumber)
		if (nodeInfo.pgp) {
			n.region = nodeInfo.regionName
			n.ip_addr = nodeInfo.ipaddress
			n.armoredPublicKey = Buffer.from(nodeInfo.pgp,'base64').toString()
			const pgpKey1 = await readKey({ armoredKey: n.armoredPublicKey})
			n.domain = pgpKey1.getKeyIDs()[1].toHex().toUpperCase() + '.conet.network'
		} else {
			logger(`nodeInfo ${n.nftNumber} Error!`)
			throw new Error(`${n.nftNumber}`)
		}

	}, err => {
		if (err) {
			const length = parseInt(err.message) - 100
			logger(`Error at ${length} Guardian_Nodes = ${Guardian_Nodes[length].domain}`)
			Guardian_Nodes.splice(length)
			logger(`Guardian_Nodes length = ${Guardian_Nodes.length} the last node is ${Guardian_Nodes[Guardian_Nodes.length - 1].ip_addr}`)

		}
		logger(`mapLimit finished err = ${err?.message}`)
		getAllNodesProcess = false
		return resolve (true)
	})

	
})
	


const getWallet = async (SRP: string, max: number, __start: number) => {
	await getAllNodes()

	const acc = ethers.Wallet.fromPhrase(SRP)
	const wallets: string[] = []
	if (__start === 0) {
		wallets.push (acc.signingKey.privateKey)
		__start++
	}

	for (let i = __start; i < max; i ++) {
		const sub = acc.deriveChild(i)
		wallets.push (sub.signingKey.privateKey)
	}

	let i = 0

	wallets.forEach(n => {
		 start(n)
	})

}

let startGossipProcess = false

const startGossip = (node: nodeInfo, POST: string, callback?: (err?: string, data?: string) => void) => {

	if (startGossipProcess) {
		return
	}
	startGossipProcess = true

	const relaunch = () => setTimeout(() => {
		
		startGossip(node, POST, callback)
		
	}, 1000)

	const waitingTimeout = setTimeout(() => {
		logger(Colors.red(`startGossip on('Timeout') [${node.ip_addr}:${node.nftNumber}]!`))
		relaunch()
	}, 5 * 1000)

	const option: RequestOptions = {
		host: node.ip_addr,
		port: 80,
		method: 'POST',
		protocol: 'http:',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		},
		path: "/post",
	}

	let first = true

	const kkk = request(option, res => {
		clearTimeout(waitingTimeout)

		let data = ''
		let _Time: NodeJS.Timeout

		startGossipProcess = false

		if (res.statusCode !==200) {
			relaunch()
			return logger(`startGossip ${node.ip_addr} got statusCode = [${res.statusCode}] != 200 error! relaunch !!!`)
		}
		
		res.on ('data', _data => {
			clearTimeout(_Time)
			data += _data.toString()
			
			if (/\r\n\r\n/.test(data)) {
				
				if (first) {
					first = false
					
					try{
						const uu = JSON.parse(data)
						// logger(inspect(uu, false, 3, true))
					} catch(ex) {
						logger(Colors.red(`first JSON.parse Error`), data)
					}
					data = ''
					return
				}

				data = data.replace(/\r\n/g, '')
				if (typeof callback === 'function') {
					callback ('', data)
				}
				
				data = ''

				_Time = setTimeout(() => {
					logger(Colors.red(`startGossip [${node.ip_addr}] has 2 EPOCH got NONE Gossip Error! Try to restart! `))
					kkk.destroy()
				}, 24 * 1000)
			}
		})

		res.once('error', err => {
			relaunch()
			logger(Colors.red(`startGossip [${node.ip_addr}] res on ERROR! Try to restart! `), err.message)
		})

		res.once('end', () => {

			kkk.destroy()
			if (typeof callback === 'function') {
				logger(Colors.red(`startGossip [${node.ip_addr}] res on END! Try to restart! `))
				relaunch()
			}
			
		})
		
	})

	kkk.on('error', err => {
		logger(Colors.red(`startGossip on('error') [${node.ip_addr}] requestHttps on Error! no call relaunch`), err.message)
	})

	kkk.end(POST)

}

const getRandomNodeV2 = (index = -1) => { 
	const totalNodes = Guardian_Nodes.length - 1
	if (!totalNodes ) {
		return null
	}

	const nodoNumber = Math.floor(Math.random() * totalNodes)
	if (index > -1 && nodoNumber === index) {
		logger(Colors.grey(`getRandomNodeV2 nodoNumber ${nodoNumber} == index ${index} REUNING AGAIN!`))
		return getRandomNodeV2(index)
	}

	const node = Guardian_Nodes[nodoNumber]
	if (!node) {
		logger(Colors.blue(`getRandomNodeV2 index ${nodoNumber} has no data try again`))
		return getRandomNodeV2 (index)
	}
	return {node, nodoNumber}
}

const sendToUsedNode = async ( wallet: ethers.Wallet, data: listenClient, validatorNode: nodeInfo) => {

	const key = Buffer.from(getRandomValues(new Uint8Array(16))).toString('base64')
	const command = {
		command: 'mining_validator',
		walletAddress: wallet.address.toLowerCase(),
		algorithm: 'aes-256-cbc',
		Securitykey: key,
		requestData: data
	}

	const message =JSON.stringify(command)
	const signMessage = await wallet.signMessage(message)

	const encryptObj = {
		message: await createMessage({text: Buffer.from(JSON.stringify ({message, signMessage})).toString('base64')}),
		encryptionKeys: await readKey({armoredKey: validatorNode.armoredPublicKey}),
		config: { preferredCompressionAlgorithm: enums.compression.zlib } 		// compress the data with zlib
	}

	const _postData = await encrypt (encryptObj)
	logger(Colors.grey(`validator [${wallet.address.toLowerCase()}] post to ${validatorNode.ip_addr} epoch ${data.epoch} total miner [${data.online}]`))
	postToUrl(validatorNode, JSON.stringify({data: _postData}))

}

const connectToGossipNode = async ( wallet: ethers.Wallet, miningNode: nodeInfo, index: number) => {
	
	const key = Buffer.from(getRandomValues(new Uint8Array(16))).toString('base64')
	
	const command = {
		command: 'mining',
		walletAddress: wallet.address.toLowerCase(),
		algorithm: 'aes-256-cbc',
		Securitykey: key,
	}
	
	const message =JSON.stringify(command)
	const signMessage = await wallet.signMessage(message)

	const encryptObj = {
        message: await createMessage({text: Buffer.from(JSON.stringify ({message, signMessage})).toString('base64')}),
		encryptionKeys: await readKey({armoredKey: miningNode.armoredPublicKey}),
		config: { preferredCompressionAlgorithm: enums.compression.zlib } 		// compress the data with zlib
    }
	

	const postData = await encrypt (encryptObj)
	logger(Colors.blue(`connectToGossipNode ${miningNode.domain}:${miningNode.ip_addr}, wallet = ${wallet.signingKey.privateKey}:${wallet.address.toLowerCase()}`))


	startGossip(miningNode, JSON.stringify({data: postData}), async (err, _data ) => {
		if (!_data) {
			return logger(Colors.magenta(`connectToGossipNode ${miningNode.ip_addr} push ${_data} is null!`))
		}

		if (!SaaSNodes.size) {
			return
		}

		let data: listenClient
		try {
			data = JSON.parse(_data)
		} catch (ex) {
			logger(Colors.red(`${miningNode.ip_addr} => \n${_data}`))
			return logger(Colors.red(`connectToGossipNode JSON.parse(_data) Error!`))
		}

		
		data.minerResponseHash = await wallet.signMessage(data.hash)
		data.isUser = true
		data.userWallets = data.nodeWallets = []

		SaaSNodes.forEach(async (v, key) => {
			await sendToUsedNode(wallet, data, v)
		})
		

	})
}


let SaaSNodes: Map<string, nodeInfo> = new Map()

const start = (privateKeyArmor: string) => new Promise(async resolve => {
	await getAllNodes()
	const wallet = new ethers.Wallet(privateKeyArmor)
	
	const miningNode = getRandomNodeV2()
	if (!miningNode) {
		return logger(`start has Error!`)
	}
	Guardian_Nodes.splice(miningNode.nodoNumber, 1)
	connectToGossipNode(wallet, miningNode.node, miningNode.nodoNumber)
})

const postToUrl = (node: nodeInfo, POST: string) => {
	const option: RequestOptions = {
		host: node.ip_addr,
		port: 80,
		method: 'POST',
		protocol: 'http:',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		},
		path: "/post",
	}

	const waitingTimeout = setTimeout(() => {
		logger(Colors.red(`postToUrl on('Timeout') [${node.ip_addr}:${node.nftNumber}]!`))
	}, 5 * 1000)

	const kkk = request(option, res => {
		clearTimeout(waitingTimeout)

		res.once('end', () => {
			if (res.statusCode !==200) {
				return logger(`postToUrl ${node.ip_addr} statusCode = [${res.statusCode}] != 200 error!`)
			}
		})
		
	})

	kkk.once('error', err => {
		logger(Colors.red(`startGossip on('error') [${node.ip_addr}] requestHttps on Error! no call relaunch`), err.message)
	})

	kkk.end(POST)
}

export class miningV2_Class {

	private init = (privateKeyArmor: string) => {
		start (privateKeyArmor)
	}

	constructor(privateKeyArmor: string) {
		this.init(privateKeyArmor)
	}

	public changeUsedNodes (region: string) {
		SaaSNodes = new Map()
		const nodes = Guardian_Nodes.filter(n => n.region.split('.')[1] === region)

		if (!nodes.length) {
			return null
		}

		const exportNodes: nodeInfo[] = []

		do {
			const index = Math.floor(Math.random() * nodes.length)
			const node = nodes[index]
			const isExisting = exportNodes.findIndex(n => n.ip_addr === node.ip_addr)
			if (node && isExisting < 0) {
				exportNodes.push(node)
			}
		} while (exportNodes.length < 10 && exportNodes.length < nodes.length)

		exportNodes.forEach(n => {
			SaaSNodes.set(n.ip_addr, n)
		})

		return exportNodes
	}
}

