import Colors, { green } from 'colors/safe'
import Net from 'node:net'
import {getRandomValues} from 'node:crypto'
import { Transform, pipeline, Writable} from 'node:stream'
import { inspect } from 'node:util'
import * as Socks from './socks'
import { request as requestHttps } from 'node:https'
import HttpProxyHeader from './httpProxy'
import {request as requestHttp} from 'node:http'
import {logger, hexDebug, loggerToStream} from './logger'
import * as res from './res'
import type {RequestOptions} from 'node:https'
import * as openpgp from 'openpgp'
import { TransformCallback } from 'stream'
import { ethers } from 'ethers'
import EthCrypto from 'eth-crypto'
import * as Crypto from 'crypto'
import async from 'async'
import CONET_Guardian_NodeInfo_ABI from './abi/CONET_Guardian_NodeInfo.json'

const isSslFromBuffer = ( buffer ) => {

	const request = buffer.toString()
	return /^CONNECT\ /i.test(request)
}

const httpProxy = ( clientSocket: Net.Socket, buffer: Buffer, proxyServer: proxyServer) => {

		
	const httpHead = new HttpProxyHeader ( buffer )
	const hostName = httpHead.host


	const connect = ( _, _data?: Buffer ) => {
		const uuuu : VE_IPptpStream = {
			uuid: Crypto.randomBytes (10).toString ('hex'),
			host: hostName,
			buffer: buffer.toString ( 'base64' ),
			cmd: httpHead.methods,
			port: httpHead.Port,
			ssl: isSslFromBuffer ( _data ),
			order: 0
		}
		return proxyServer.requestGetWay ( uuuu, clientSocket )
	}
		
	return connect (null, buffer )
	

}

const getRandomSaaSNode = (saasNodes: nodes_info[]) => {
	if (!saasNodes.length) {
		logger(Colors.red(`getRandomSaaSNode saasNodes length [${saasNodes.length}]  Error!`))
		return null
	}


	const ramdom = Math.floor(( saasNodes.length - 1 ) * Math.random())
	const _ret = saasNodes[ramdom]

	return _ret
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

const ConnectToProxyNode = (cmd : SICommandObj, SaaSnode: nodes_info, entryNode: nodes_info, socket: Net.Socket, uuuu: VE_IPptpStream, server: proxyServer) => {

	
	if (!entryNode) {
		return logger(Colors.red(`ConnectToProxyNode Error! getRandomNode return null nodes!`))
	}
	const hostInfo = `${uuuu.host}:${uuuu.port}`
	const connectID = Colors.gray('Connect to [') + Colors.green(`${hostInfo}`)+Colors.gray(']')

	const data = otherRequestForNet(JSON.stringify({data: cmd.requestData[0]}), entryNode.ip_addr, 80, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36')

	const infoData: ITypeTransferCount = {
		hostInfo: hostInfo,
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
		logger (Colors.red(`ConnectToProxyNode entry node [${entryNode.ip_addr}:${80}] on Error ${err.message} `))
	})

	remoteSocket.once('close', async () => {
		logger (Colors.magenta(`ConnectToProxyNode entry node [${entryNode.ip_addr}:${80}] on Close `))
		//await sendTransferDataToLocalHost(infoData)
	})

	socket.once ('close', () => {
		const res = download.data
		if (/^HTTP\/1\.1\ 402\ Payment/i.test(res)) {
			logger(Colors.red(`Proxy Payment`))
			// server.SaaS_payment = false
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

	public SaaS_payment = true
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

					const logStream = Colors.blue(`Local proxy server got GET /pac from :[${ socket.remoteAddress }] sock5 [${ sock5 }] agent [${ agent }] httpHead.headers [${ Object.keys( httpHead.headers )}] dataStr = [${dataStr}]`)
					loggerToStream(this.logStream, logStream)
					logger(logStream)

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
						const logStream = Colors.magenta(`unsupport proxy protocol!`)
						loggerToStream(this.logStream, logStream)
						logger(logStream)
						return socket.end()
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
			return logger ( Colors.blue(`Proxy SERVER success on port : [${ this.proxyPort }] entry nodes length =[${this._egressNodes?.length}] SaaS nodes = [${this._egressNodes?.length}]`))
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

	public requestGetWay = async (uuuu : VE_IPptpStream, socket: Net.Socket ) => {
		const upChannel_SaaS_node: nodes_info|null  = getRandomSaaSNode(this._egressNodes)
	
		if (!upChannel_SaaS_node ) {
			return logger (Colors.red(`proxyServer makeUpChannel upChannel_SaaS_node Null Error!`))
		}
		
		const cmd = await createSock5ConnectCmd (this.currentProfile, upChannel_SaaS_node, [uuuu])
		if (!cmd) {
			return logger (Colors.red(`requestGetWay createSock5Connect return Null Error!`))
		}
		const entryNode = getRandomNode(this._entryNodes, upChannel_SaaS_node) 
		const streamString = Colors.blue (`Create gateway request, Layer minus random SaaS node [${Colors.magenta(upChannel_SaaS_node.ip_addr)}] entry node [${Colors.magenta(entryNode.ip_addr)}]\n`)

		loggerToStream(this.logStream, streamString)
		logger(streamString)

		
		ConnectToProxyNode (cmd, upChannel_SaaS_node, entryNode, socket, uuuu, this)
	}

	public restart = (currentProfile: profile, entryNodes: nodes_info[], egressNodes: nodes_info[]) => {
		this.currentProfile = currentProfile
		this._entryNodes = entryNodes
		this._egressNodes = egressNodes
	}
    
	constructor (
		public proxyPort: string,						//			Proxy server listening port number
		private _entryNodes: nodes_info[],	 				//			gateway nodes information
		private _egressNodes: nodes_info[],
		private currentProfile: profile,
		public debug = false,
		public logStream: string

	)
	{

		logger(Colors.magenta(`${proxyPort} Entry Nodes\n${_entryNodes.map(n => [n.ip_addr, n.region])}`))
		logger(Colors.magenta(`${proxyPort} Egress Nodes\n${ _egressNodes.map(n =>[n.ip_addr, n.region])}`))

		this.startLocalProxy()
	}
}
const profile = {
    "isPrimary": false,
    "keyID": "0x28b2ae27e135e89d9bcb40595f859b411bf4846c",
    "privateKeyArmor": "0xd1806500c9ef182f981069c2ebcdb21f30f75c2e2620aedf5fc5a88a1271991c",
    "hdPath": "m/44'/60'/0'/0/0/1",
    "index": 1,
    "isNode": true,
    "nodeID": "234",
    "nodeIP_address": "",
    "nodeRegion": "",
    "pgpKey": {
        "privateKeyArmor": "-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nxVgEZndrMBYJKwYBBAHaRw8BAQdAIzhghYSoVOl8yaim5tay6GwqW4+h77NT\nkJgLrb2Z72cAAQDdVdo2fyw2GtFBF2Qpd3T6BAv/YLMpb2Y5aSDfdjZrug1q\nzQDCjAQQFgoAPgWCZndrMAQLCQcICZC4mOKIpJkMwAMVCAoEFgACAQIZAQKb\nAwIeARYhBEbhCEnJjFv6tkW3LbiY4oikmQzAAAAKegD/bxWzqs+3Nvt52e/S\naTXLLRICcHRKI1+pM5ub/9gkw+UA/1Exk3IczFFJzfkgg2Yf4GW5MV9rWfuV\n5wN/AHUj5CsPx10EZndrMBIKKwYBBAGXVQEFAQEHQLPI3FS/F+Uh2ys/dEOi\nlphsmA2Ns1b+EhYRAAkpmN1uAwEIBwAA/0eYFVkHK6jEor/7IN7PVvVFB4M/\nizd42jdvnSJgoRZ4D3TCeAQYFgoAKgWCZndrMAmQuJjiiKSZDMACmwwWIQRG\n4QhJyYxb+rZFty24mOKIpJkMwAAA/TcA/RHAFxB/1DLrdThvO4XlxdrV1upY\nfBfghfDV42WXoszeAQCaX/1ZKIqPurrWZ8mYmvVj1n+kpoL7K1zy/cZ/a+6X\nCQ==\n=buDA\n-----END PGP PRIVATE KEY BLOCK-----\n",
        "publicKeyArmor": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZndrMBYJKwYBBAHaRw8BAQdAIzhghYSoVOl8yaim5tay6GwqW4+h77NT\nkJgLrb2Z72fNAMKMBBAWCgA+BYJmd2swBAsJBwgJkLiY4oikmQzAAxUICgQW\nAAIBAhkBApsDAh4BFiEERuEIScmMW/q2RbctuJjiiKSZDMAAAAp6AP9vFbOq\nz7c2+3nZ79JpNcstEgJwdEojX6kzm5v/2CTD5QD/UTGTchzMUUnN+SCDZh/g\nZbkxX2tZ+5XnA38AdSPkKw/OOARmd2swEgorBgEEAZdVAQUBAQdAs8jcVL8X\n5SHbKz90Q6KWmGyYDY2zVv4SFhEACSmY3W4DAQgHwngEGBYKACoFgmZ3azAJ\nkLiY4oikmQzAApsMFiEERuEIScmMW/q2RbctuJjiiKSZDMAAAP03AP0RwBcQ\nf9Qy63U4bzuF5cXa1dbqWHwX4IXw1eNll6LM3gEAml/9WSiKj7q61mfJmJr1\nY9Z/pKaC+ytc8v3Gf2vulwk=\n=irVj\n-----END PGP PUBLIC KEY BLOCK-----\n"
    },
    "tokens": {
        "CGPNs": {
            "balance": "0",
            "history": [],
            "network": "CONET Guardian Nodes (CGPNs)",
            "decimal": 1,
            "contract": "0x453701b80324c44366b34d167d40bce2d67d6047",
            "name": "CGPNs"
        },
        "CGPN2s": {
            "balance": "0",
            "history": [],
            "network": "CONET Guardian Nodes (CGPN2s)",
            "decimal": 1,
            "contract": "0x453701b80324c44366b34d167d40bce2d67d6047",
            "name": "CGPN2s"
        },
        "cCNTP": {
            "balance": "340112.74966555",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x530cf1b598d716ec79aa916dd2f05ae8a0ce8ee2",
            "name": "cCNTP"
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
            "balance": "0",
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
    "data": null,
	referrer: '',

}

