import Colors, { green } from 'colors/safe'
import Net from 'node:net'
import {getRandomValues} from 'node:crypto'
import { Transform, pipeline, Writable} from 'node:stream'
import { inspect } from 'node:util'
import * as Socks from './socks'
import { request as requestHttps } from 'node:https'
import HttpProxyHeader from './httpProxy'
import {request as requestHttp} from 'node:http'
import {logger, hexDebug} from './logger'
import * as res from './res'
import type {RequestOptions} from 'node:https'
import * as openpgp from 'openpgp'
import { TransformCallback } from 'stream'
import { ethers } from 'ethers'
import EthCrypto from 'eth-crypto'

const getRandomSaaSNode = (saasNodes: nodes_info[], allNodes: nodes_info[]) => {
	if (!saasNodes.length || !allNodes.length) {
		return null
	}
	logger (`getRandomSaaSNode saasNodes length [${saasNodes.length}] allNodes length [${allNodes}]`)
	const ramdom = Math.trunc((saasNodes.length - 1 ) * Math.random())
	const _ret = saasNodes[ramdom]
	const index = allNodes.findIndex(n => n.ip_addr === _ret.ip_addr)

	if (index === -1 ) {
		saasNodes = saasNodes.filter(n => n.ip_addr !== _ret.ip_addr)
		if (saasNodes.length < 1)  {
			return null
		}
		return getRandomSaaSNode (saasNodes, allNodes)
	}
	return allNodes[index]
}

const getRandomNode = (activeNodes: nodes_info[], saasNode: nodes_info) => {

	const nodes = activeNodes.filter(n => n.ip_addr!== saasNode.ip_addr)
	// return getNodeByIpaddress ('108.175.5.112', activeNodes)
	const ramdom = Math.round((nodes.length - 1 ) * Math.random())
	
	
	const ret = nodes[ramdom]
	logger (Colors.grey(`getRandomNode nodes.length= [${nodes.length}] ramdom = [${ramdom}]`))
	logger (Colors.grey(`getRandomNode ${ret.ip_addr} saasNode ${saasNode?.ip_addr}`))
	return ret
}
const CoNET_SI_Network_Domain = 'openpgp.online'
const conet_DL_getSINodes = `https://${ CoNET_SI_Network_Domain }:4001/api/conet-si-list`

const getPac = ( hostIp: string, port: string, http: boolean, sock5: boolean ) => {

	const FindProxyForURL = `function FindProxyForURL ( url, host )
	{
		if ( isInNet ( dnsResolve( host ), "0.0.0.0", "255.0.0.0") ||
		isInNet( dnsResolve( host ), "172.16.0.0", "255.240.255.0") ||
		isInNet( dnsResolve( host ), "127.0.0.0", "255.255.255.0") ||
		isInNet ( dnsResolve( host ), "192.168.0.0", "255.255.0.0" ) ||
		isInNet ( dnsResolve( host ), "10.0.0.0", "255.0.0.0" ) ||
		dnsDomainIs( host, "conet.network") || dnsDomainIs( host, "openpgp.online")
		) {
			return "DIRECT";
		}
		return "${ http ? 'PROXY': ( sock5 ? 'SOCKS5' : 'SOCKS' ) } ${ hostIp }:${ port }";
	
	}`
	//return "${ http ? 'PROXY': ( sock5 ? 'SOCKS5' : 'SOCKS' ) } ${ hostIp }:${ port.toString() }; ";
	return res.Http_Pac ( FindProxyForURL )
}

const makePrivateKeyObj = async ( privateArmor: string, password = '' ) => {

	if  (!privateArmor) {
		const msg = `makePrivateKeyObj have no privateArmor Error!`
		return logger (msg)
	}

	let privateKey = await openpgp.readPrivateKey ({armoredKey: privateArmor})

	if (!privateKey.isDecrypted()) {
		privateKey = await openpgp.decryptKey({
			privateKey,
			passphrase: password
		})
	}

	return privateKey
}

const getNodeByIpaddress = (ipaddress: string, activeNodes: nodes_info[] ) => {

	const index = activeNodes.findIndex(n => n.ip_addr === ipaddress)
	if (index > -1) {
		return activeNodes[index]
	}
	logger (Colors.red(`proxyServer getNodeByIpaddress [${ipaddress}] hasn't include at activeNodes list!`))
	
}

const encrypt_Message = async (encryptionKeys, message: any) => {
	const encryptObj = {
        message: await openpgp.createMessage({text: Buffer.from(JSON.stringify (message)).toString('base64')}),
        encryptionKeys,
		config: { preferredCompressionAlgorithm: openpgp.enums.compression.zlib }, 		// compress the data with zlib
    }
	return await openpgp.encrypt
		//@ts-ignore
		(encryptObj)
}


const createSock5ConnectCmd = async (currentProfile: profile, SaaSnode: nodes_info, requestData: any[]) => {
	if (!currentProfile.pgpKey|| !SaaSnode.armoredPublicKey ) {
		logger (Colors.red(`currentProfile?.pgpKey[${currentProfile?.pgpKey}]|| !SaaSnode?.armoredPublicKey[${SaaSnode?.armoredPublicKey}] Error`))
		return null
	}

	if  (!SaaSnode?.publicKeyObj) {
		SaaSnode.publicKeyObj = await openpgp.readKey ({ armoredKey: SaaSnode.armoredPublicKey })
	}
	const key = Buffer.from(getRandomValues(new Uint8Array(16))).toString('base64')
	const command: SICommandObj = {
		command: 'SaaS_Sock5',
		algorithm: 'aes-256-cbc',
		Securitykey: key,
		requestData,
		walletAddress: currentProfile.keyID.toLowerCase()
	}
	logger(Colors.blue(`createSock5ConnectCmd`))
	const message =JSON.stringify(command)
	const messageHash = ethers.id(message)
	const signMessage = EthCrypto.sign(currentProfile.privateKeyArmor, messageHash)


	const encryptedCommand = await encrypt_Message( SaaSnode.publicKeyObj, {message, signMessage})
	command.requestData = [encryptedCommand, '', key]
	return (command)
}

const otherRequestForNet = ( data: string, host: string, port: number, UserAgent: string,  ) => {

	return 	`POST /post HTTP/1.1\r\n` +
			`Host: ${ host }${ port !== 80 ? ':'+ port : '' }\r\n` +
			`User-Agent: ${ UserAgent ? UserAgent : 'Mozilla/5.0' }\r\n` +
			`Content-Type: application/json;charset=UTF-8\r\n` +
			`Connection: keep-alive\r\n` +
			`Content-Length: ${ data.length }\r\n\r\n` +
			data + '\r\n\r\n'
}


class transferCount extends Transform {
	public data  =''
	constructor(private upload: boolean, private info: ITypeTransferCount) {
		super()
	}
	_transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
		if (this.upload) {
			this.info.upload += chunk.length
		} else {
			this.data += chunk.toString()
			this.info.download += chunk.length
		}
		callback(null, chunk)
	}
}


const sendTransferDataToLocalHost = (infoData: ITypeTransferCount) => {
	return new Promise(resolve => {
		const option: RequestOptions = {
			host: 'localhost',
			method: 'POST',
			port: '3001',
			path: '/proxyusage',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8',
				'Connection': 'close',
			}
		}
		const req = requestHttp(option, res => {
			if (res.statusCode !==200) {
				return logger (Colors.red(`sendTransferDataToLocalHost res.statusCode [${res.statusCode}] !== 200 ERROR`))
			}
			logger (Colors.blue(`sendTransferDataToLocalHost SUCCESS`))
			res.destroy()
			resolve(null)
		})
	
		req.on('error', err => {
			logger (Colors.red(`sendTransferDataToLocalHost on Error!`), err)
		})
	
		req.end(JSON.stringify({data:infoData}))
	})

}

const ConnectToProxyNode = (cmd : SICommandObj, SaaSnode: nodes_info, nodes: nodes_info[], socket: Net.Socket, uuuu: VE_IPptpStream, server: proxyServer) => {

	const entryNode = getRandomNode(nodes, SaaSnode) //getNodeByIpaddress('18.183.80.90', nodes)//
	if (!entryNode) {
		return logger(Colors.red(`ConnectToProxyNode Error! getRandomNode return null nodes!`))
	}
	
	const connectID = Colors.gray('Connect to [') + Colors.green(`${uuuu.host}:${uuuu.port}`)+Colors.gray(']')

	const data = otherRequestForNet(JSON.stringify({data: cmd.requestData[0]}), entryNode.ip_addr, 80, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36')
	const infoData: ITypeTransferCount = {
		hostInfo: `${uuuu.host}:${uuuu.port}`,
		ssl: uuuu.ssl,
		startTime: new Date().getTime(),
		download: 0,
		upload: 0,
		nodeIpaddress: SaaSnode.ip_addr,
		endTime: 0
	}

	const upload = new transferCount (true, infoData)
	const download = new transferCount (false, infoData)
	const remoteSocket = Net.createConnection(80, entryNode.ip_addr, () => {
		//	remoteSocket.setNoDelay(true)
		
		logger(Colors.blue(`ConnectToProxyNode connect to ${connectID}`))
		remoteSocket.pipe(download).pipe(socket).pipe(upload).pipe(remoteSocket)

	})

	remoteSocket.on('error', err => {
		logger (Colors.red(`ConnectToProxyNode remote [${entryNode.ip_addr}:${80}] on Error ${err.message} `))
	})

	remoteSocket.once('close', async () => {
		logger (Colors.magenta(`ConnectToProxyNode remote [${entryNode.ip_addr}:${80}] on Close `))
		await sendTransferDataToLocalHost(infoData)
	})

	socket.once ('close', () => {
		const res = download.data
		if (/^HTTP\/1\.1\ 402\ Payment/i.test(res)) {
			logger(Colors.red(`Proxy Payment`))
			server.SaaS_payment = false
		}

		remoteSocket.end().destroy()
		infoData.endTime=new Date().getTime()
		
	})

	socket.once ('error', err => {
		logger(Colors.magenta(`Proxy client on Error [${err.message}]! STOP connecting`))
		remoteSocket.end().destroy()
	})

	remoteSocket.write(data)

}


export class proxyServer {
	private hostLocalIpv4: { network: string, address: string } []= []
	private hostLocalIpv6 =''
	private hostGlobalIpV4 = ''
	private hostGlobalIpV6 = ''
	private network = false
	public SaaS_payment = true
	private getGlobalIpRunning = false
	private server: Net.Server|null = null
	//public gateway = new gateWay ( this.multipleGateway, this.debug )
	public whiteIpList = []
	public domainBlackList = []
	public domainListPool = new Map ()
	public checkAgainTimeOut = 1000 * 60 * 5
	public connectHostTimeOut = 1000 * 5
	public useGatWay = true
	public clientSockets: Set<Net.Socket> = new Set()

	private startLocalProxy = async () => {

		let socks
		this.server = Net.createServer ( socket => {
			const ip = socket.remoteAddress
			this.clientSockets.add (socket)
			const isWhiteIp = this.whiteIpList.find ( n => { return n === ip }) ? true : false
			let agent = 'Mozilla/5.0'
				//	windows 7 GET PAC User-Agent: Mozilla/5.0 (compatible; IE 11.0; Win32; Trident/7.0)

			//		proxy auto setup support
			socket.once ( 'data', ( data: Buffer ) => {
				const dataStr = data.toString()
				
				if ( /^GET \/pac/i.test ( dataStr )) {
					const httpHead = new HttpProxyHeader ( data )
					agent = httpHead.headers['user-agent']
					const sock5 = /Firefox|Windows NT|WinHttp-Autoproxy-Service|Darwin/i.test ( agent ) && ! /CFNetwork|WOW64/i.test ( agent )
					
					
					const ret = getPac ( httpHead.host, this.proxyPort, /pacHttp/.test( dataStr ), sock5 )
					logger ( Colors.blue(`Local Proxy Server got GET /pac from :[${ socket.remoteAddress }] sock5 [${ sock5 }] agent [${ agent }] httpHead.headers [${ Object.keys( httpHead.headers )}] dataStr = [${dataStr}]`))
					logger(Colors.green(`Local Proxy Server response to client [${ret}]`))

					return socket.end ( ret )
				}
				
				switch ( data.readUInt8 ( 0 )) {

					case 0x4: {
						return socks = new Socks.sockt4 ( socket, data, agent, this )
					}
						
					case 0x5: {
						return socks = new Socks.socks5 ( socket, data, agent, this )
					}
						
					default: {
						//return httpProxy ( socket, data, this.gateway, this.debug )
					}
				}
			})

			socket.on ( 'error', err => {
				socks = null
			})

			socket.once ( 'end', () => {
				this.clientSockets.delete(socket)
				socks = null
			})
			
		})

		this.server.on ( 'error', err => {
			logger ( Colors.red(`proxy server ERROR: ${ err.message }` ))
		})

		this.server.maxConnections = 65536

		this.server.listen ( this.proxyPort, () => {
			return logger ( Colors.blue(`Proxy SERVER success on port : [${ this.proxyPort }] active nodes =[${this._nodes.length}] Saas nodes = [${this.egressNodes.length}]`))
		})

		if (!this.currentProfile?.keyObj) {
			this.currentProfile.keyObj = {
				privateKeyObj: null,
				publicKeyObj: null
			}
		}
		if (this.currentProfile.pgpKey?.privateKeyArmor) {
			this.currentProfile.keyObj.privateKeyObj = await makePrivateKeyObj (this.currentProfile.pgpKey.privateKeyArmor)
		}
		
	}

	public requestGetWay = async (requestObj: requestObj, uuuu : VE_IPptpStream, userAgent:string, socket: Net.Socket ) => {
		const upChannel_SaaS_node  = getRandomSaaSNode(this.egressNodes, this._nodes)
	
		if (!upChannel_SaaS_node ) {
			return logger (Colors.red(`proxyServer makeUpChannel upChannel_SaaS_node Null Error!`))
		}
		
		const cmd = await createSock5ConnectCmd (this.currentProfile, upChannel_SaaS_node, [uuuu])
		if (!cmd) {
			return logger (Colors.red(`requestGetWay createSock5Connect return Null Error!`))
		}

		ConnectToProxyNode (cmd, upChannel_SaaS_node, this._nodes, socket, uuuu, this)
	}
    
	constructor (
		public proxyPort: string,						//			Proxy server listening port number
		private _nodes: nodes_info[],	 				//			gateway nodes information
		private egressNodes: nodes_info[],
		private currentProfile: profile,
		public debug = false )
		{
			logger(inspect(this.currentProfile, false, 1, true))
			this.startLocalProxy()
		}
}
const allNodes = [
    {
        "region": "NY.US",
        "country": "us",
        "ip_addr": "107.173.231.41",
        "armoredPublicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZkz/5RYJKwYBBAHaRw8BAQdAs95rXcZIR9ZspYdN4H3Yk4D1jKz7+caS\ns6D+rZRAZcDNKjB4NEMwNkI3M0JlMDc3MTgwMmEzMzYwYzc4ZTMyNjkyM2Iz\nYjBiM2FGN8KMBBAWCgA+BYJmTP/lBAsJBwgJkPFctbV5tkZGAxUICgQWAAIB\nAhkBApsDAh4BFiEEVtlY1Fazor5eUUF68Vy1tXm2RkYAAGLGAP9J/VLVwjef\nOYQIRGj+FRqtRRy5DFrLr9ws2VuLrPMNDwEA3yu3b/rJBmYlXBT8YJy27vhg\nTYsrmr/uAHUr5EGk7gvOOARmTP/lEgorBgEEAZdVAQUBAQdAzS1NQ7hT/8BK\nFJNNABHuQlVgsLhVe7uKvYJYnpn5IAADAQgHwngEGBYKACoFgmZM/+UJkPFc\ntbV5tkZGApsMFiEEVtlY1Fazor5eUUF68Vy1tXm2RkYAAJrJAQC+VbInBYAW\nYzrEZLchuYiMfamgTXTqowU1We8yqxBidAD/TTMbC+SHct6jxCTqlFbiBl/G\nnArfXG3fi2lylZg+VwU=\n=BA+x\n-----END PGP PUBLIC KEY BLOCK-----\n",
        "last_online": true
    },
    {
        "region": "NY.US",
        "country": "us",
        "ip_addr": "66.179.254.158",
        "armoredPublicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZbtcYRYJKwYBBAHaRw8BAQdAeUzGNiRh80QxglyYCqHTRLuMiB6ylTuj\nuF71rXHobxzNKjB4ZjM1MEU5OWJGMjY1MDYzOEU2Y2UxZTM5NjJEM2U0MjIy\nOUU2N0UyNsKMBBAWCgA+BYJlu1xhBAsJBwgJkHvVlSgxe6a4AxUICgQWAAIB\nAhkBApsDAh4BFiEERkjxewvTKzDOTKRee9WVKDF7prgAAJN+AQCGaRsODRU4\n7Xt/kFeiufrqYaef6dVucRYvikOKLBUnNAD/VppbLV5S5I2qe/AssY/xcgY0\nflb9oKC3Z8HQn7Jf3A3OOARlu1xhEgorBgEEAZdVAQUBAQdAgRzKRtXiQU7K\n7PSl8OwigBzbR4+U6FY/kOCjKuEwJVgDAQgHwngEGBYKACoFgmW7XGEJkHvV\nlSgxe6a4ApsMFiEERkjxewvTKzDOTKRee9WVKDF7prgAAOwBAP0fDiL+WDSf\nyn2y1ISMposJAlRfOKop5bUK37KP7WtIpwEAoEjF67X29qHCq9hJBZ4AFVOf\nDEm4590Ucty1cWFU3wA=\n=q/kV\n-----END PGP PUBLIC KEY BLOCK-----\n",
        "last_online": true
    }
]

const egressNodes = [
    {
        "region": "NY.US",
        "country": "us",
        "ip_addr": "107.173.231.41",
        "armoredPublicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZkz/5RYJKwYBBAHaRw8BAQdAs95rXcZIR9ZspYdN4H3Yk4D1jKz7+caS\ns6D+rZRAZcDNKjB4NEMwNkI3M0JlMDc3MTgwMmEzMzYwYzc4ZTMyNjkyM2Iz\nYjBiM2FGN8KMBBAWCgA+BYJmTP/lBAsJBwgJkPFctbV5tkZGAxUICgQWAAIB\nAhkBApsDAh4BFiEEVtlY1Fazor5eUUF68Vy1tXm2RkYAAGLGAP9J/VLVwjef\nOYQIRGj+FRqtRRy5DFrLr9ws2VuLrPMNDwEA3yu3b/rJBmYlXBT8YJy27vhg\nTYsrmr/uAHUr5EGk7gvOOARmTP/lEgorBgEEAZdVAQUBAQdAzS1NQ7hT/8BK\nFJNNABHuQlVgsLhVe7uKvYJYnpn5IAADAQgHwngEGBYKACoFgmZM/+UJkPFc\ntbV5tkZGApsMFiEEVtlY1Fazor5eUUF68Vy1tXm2RkYAAJrJAQC+VbInBYAW\nYzrEZLchuYiMfamgTXTqowU1We8yqxBidAD/TTMbC+SHct6jxCTqlFbiBl/G\nnArfXG3fi2lylZg+VwU=\n=BA+x\n-----END PGP PUBLIC KEY BLOCK-----\n",
        "last_online": true
    }
]

const profile = {
    "tokens": {
        "CGPNs": {
            "balance": "false",
            "history": [],
            "network": "CONET Guardian Nodes (CGPNs)",
            "decimal": 1,
            "contract": "0x453701b80324c44366b34d167d40bce2d67d6047",
            "name": "CGPNs"
        },
        "CGPN2s": {
            "balance": "false",
            "history": [],
            "network": "CONET Guardian Nodes (CGPN2s)",
            "decimal": 1,
            "contract": "0x453701b80324c44366b34d167d40bce2d67d6047",
            "name": "CGPN2s"
        },
        "cCNTP": {
            "balance": "4935.438941",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x530cf1b598d716ec79aa916dd2f05ae8a0ce8ee2",
            "name": "cCNTP",
            "unlocked": true
        },
        "cBNBUSDT": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0xae752b49385812af323240b26a49070bb839b10d",
            "name": "cBNBUSDT"
        },
        "cUSDB": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x3258e9631ca4992f6674b114bd17c83ca30f734b",
            "name": "cUSDB"
        },
        "CNTP": {
            "balance": "0",
            "history": [],
            "network": "Blast Mainnet",
            "decimal": 18,
            "contract": "0x0f43685B2cB08b9FB8Ca1D981fF078C22Fec84c5",
            "name": "CNTP"
        },
        "cUSDT": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0xfe75074c273b5e33fe268b1d5ac700d5b715da2f",
            "name": "cUSDT"
        },
        "dWETH": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x84b6d6A6675F830c8385f022Aefc9e3846A89D3B",
            "name": "dWETH"
        },
        "dUSDT": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x0eD55798a8b9647f7908c72a0Ce844ad47274422",
            "name": "dUSDT"
        },
        "dWBNB": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0xd8b094E91c552c623bc054085871F6c1CA3E5cAd",
            "name": "dWBNB"
        },
        "conet": {
            "balance": "0.017404",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "",
            "name": "conet"
        },
        "CNTPV1": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x1a73e00ce25e5d56db1b5dd7b2dcdf8ec9f208d2",
            "name": "CNTPV1"
        },
        "usdt": {
            "balance": "0",
            "history": [],
            "network": "ETH",
            "decimal": 6,
            "contract": "0xdac17f958d2ee523a2206206994597c13d831ec7",
            "name": "usdt"
        },
        "usdb": {
            "balance": "0",
            "history": [],
            "network": "Blast Mainnet",
            "decimal": 18,
            "contract": "0xdac17f958d2ee523a2206206994597c13d831ec7",
            "name": "usdb"
        },
        "eth": {
            "balance": "0",
            "history": [],
            "network": "ETH",
            "decimal": 18,
            "contract": "",
            "name": "eth"
        },
        "blastETH": {
            "balance": "0",
            "history": [],
            "network": "Blast Mainnet",
            "decimal": 18,
            "contract": "",
            "name": "blastETH"
        },
        "wbnb": {
            "balance": "0",
            "history": [],
            "network": "BSC",
            "decimal": 18,
            "contract": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            "name": "wbnb"
        },
        "bnb": {
            "balance": "0",
            "history": [],
            "network": "BSC",
            "decimal": 18,
            "contract": "",
            "name": "bnb"
        },
        "wusdt": {
            "balance": "0",
            "history": [],
            "network": "BSC",
            "decimal": 18,
            "contract": "0x55d398326f99059fF775485246999027B3197955",
            "name": "wusdt"
        }
    },
    "publicKeyArmor": "0x0220519d1b68cfb67b09dde97eb19defdb8cd1b9ac2b9bd22b459061248abda721",
    "keyID": "0x73940fcb2211c1c09eceb6f42846e30af6b459bc",
    "isPrimary": true,
    "isNode": false,
    "pgpKey": {
        "privateKeyArmor": "-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nxVgEZnBBRxYJKwYBBAHaRw8BAQdAi/liPbZzHckXHNLYbrKf+2akXClWJfkP\nOwFwVbQ1y0wAAQDIpqo2LWQqZXOUX/vwqcfJqA9XQz9aPVMrqcpkTM9NGg73\nzQDCjAQQFgoAPgWCZnBBRwQLCQcICZDVD8uvl8i6/AMVCAoEFgACAQIZAQKb\nAwIeARYhBMtc4KHkODlxe5hWotUPy6+XyLr8AACI6gEA6TfZEeBqHFINjuff\nTcdk5gjrXqsz+5Ea5TaHDLkMxZoA/ijbxKeNLjvfKujdBG/oOsOVsVLPUGjN\np6gFWTl4NYoEx10EZnBBRxIKKwYBBAGXVQEFAQEHQMp1bHUE3Bc0HtWpxAe/\nnengCnwKp/Arl5Gd4LPtpqVnAwEIBwAA/25FNtT288504qL7+5cFFEEPVMxH\nG96PYmC+6Di6ejEwEYXCeAQYFgoAKgWCZnBBRwmQ1Q/Lr5fIuvwCmwwWIQTL\nXOCh5Dg5cXuYVqLVD8uvl8i6/AAAfX8BALPVKlSkMy0eyXC1IwTsqMbT6xFf\n6GR4BozxxSYQGXjpAQDgHVMMrHYX/bwztqTg9QXL9HlNSXrxlTmm//yA/kTa\nAA==\n=uc7i\n-----END PGP PRIVATE KEY BLOCK-----\n",
        "publicKeyArmor": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZnBBRxYJKwYBBAHaRw8BAQdAi/liPbZzHckXHNLYbrKf+2akXClWJfkP\nOwFwVbQ1y0zNAMKMBBAWCgA+BYJmcEFHBAsJBwgJkNUPy6+XyLr8AxUICgQW\nAAIBAhkBApsDAh4BFiEEy1zgoeQ4OXF7mFai1Q/Lr5fIuvwAAIjqAQDpN9kR\n4GocUg2O599Nx2TmCOteqzP7kRrlNocMuQzFmgD+KNvEp40uO98q6N0Eb+g6\nw5WxUs9QaM2nqAVZOXg1igTOOARmcEFHEgorBgEEAZdVAQUBAQdAynVsdQTc\nFzQe1anEB7+d6eAKfAqn8CuXkZ3gs+2mpWcDAQgHwngEGBYKACoFgmZwQUcJ\nkNUPy6+XyLr8ApsMFiEEy1zgoeQ4OXF7mFai1Q/Lr5fIuvwAAH1/AQCz1SpU\npDMtHslwtSME7KjG0+sRX+hkeAaM8cUmEBl46QEA4B1TDKx2F/28M7ak4PUF\ny/R5TUl68ZU5pv/8gP5E2gA=\n=XbcA\n-----END PGP PUBLIC KEY BLOCK-----\n"
    },
    "privateKeyArmor": "0xf0830399be50b96bb10ee01307700e51cd2de4995b307344273dfca6ff6b0925",
    "hdPath": "m/44'/60'/0'/0/0",
    "index": 0,
	referrer: ''
}

const test = () => {
	new proxyServer ('3003', allNodes, egressNodes, profile, true)
}

// test()