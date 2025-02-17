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
import * as Crypto from 'crypto'
import IP from 'ip'
import {resolve4} from 'node:dns'
import {createConnection} from 'node:net'

const _HTTP_200 = ( body: string ) => {
	const ret = `HTTP/1.1 200 OK\r\n` +
				`Content-Type: text/html; charset=UTF-8\r\n` + 
				`Connection: keep-alive\r\n` + 
				`Content-Length: ${ body.length }\r\n\r\n` +
				`${ body }`
	return ret
}

const _HTTP_200V2 = `HTTP/1.1 200 Connection Established\r\n\r\n`


const isSslFromBuffer = ( buffer ) => {

	const request = buffer.toString()
	return /^CONNECT\ /i.test(request)
}
const getHostIpv4: (host: string) => Promise<string> = (host: string) => new Promise(resolve => {
	return resolve4(host, (err, ipv4s) => {
		if (err||!ipv4s?.length) {
			return resolve ('')
		}

		return resolve(ipv4s[0])
	})
})


const httpProxy = ( clientSocket: Net.Socket, _buffer: Buffer, agent: string, proxyServer: proxyServer) => {
	const httpHead = new HttpProxyHeader ( _buffer )
	const hostName = httpHead.host
	const ssl = isSslFromBuffer ( _buffer )
	const connect = (_data: Buffer) => {
		hexDebug(_data)
		const uuuu : VE_IPptpStream = {
			uuid: Crypto.randomBytes (10).toString ('hex'),
			host: hostName,
			buffer: _data.toString ( 'base64' ),
			cmd: httpHead.methods,
			port: httpHead.Port,
			ssl,
			order: 0
		}
		// socks5Connect(uuuu, clientSocket)
		// clientSocket.resume ()
		return proxyServer.requestGetWay ( uuuu, clientSocket )
	}

	const reqtest = _buffer.toString()
	if (/^CONNECT /.test(reqtest)) {
		hexDebug(_buffer)
		clientSocket.once ('data', data => {
			return connect (data)
		})

		const response = _HTTP_200V2
		return clientSocket.write(response)
	}

	return connect (_buffer)
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


const createSock5ConnectCmd = async (wallet: ethers.Wallet, SaaSnode: nodes_info, requestData: any[]) => {


	if  (!SaaSnode?.publicKeyObj) {
		SaaSnode.publicKeyObj = await openpgp.readKey ({ armoredKey: SaaSnode.armoredPublicKey })
	}

	
	const key = Buffer.from(getRandomValues(new Uint8Array(16))).toString('base64')
	const command: SICommandObj = {
		command: 'SaaS_Sock5',
		algorithm: 'aes-256-cbc',
		Securitykey: key,
		requestData,
		walletAddress: wallet.address.toLowerCase()
	}


	logger(Colors.blue(`createSock5ConnectCmd data = ${inspect(requestData, false, 3, true)}`))
	logger(Colors.blue(`createSock5ConnectCmd data length = ${requestData[0].buffer.length}`))

	const message =JSON.stringify(command)
	const signMessage = await wallet.signMessage(message)

	const encryptedCommand = await encrypt_Message( SaaSnode.publicKeyObj, {message, signMessage})
	logger(inspect({message, signMessage}, false, 3, true))
	command.requestData = [encryptedCommand, '', key]
	return (command)
}

const otherRequestForNet = ( data: string, host: string, port: number, UserAgent: string ) => {

	return 	`POST /post HTTP/1.1\r\n` +
			`Host: ${ host }${ port !== 80 ? ':'+ port : '' }\r\n` +
			`User-Agent: ${ UserAgent ? UserAgent : 'Mozilla/5.0' }\r\n` +
			`Content-Type: application/json;charset=UTF-8\r\n` +
			`Connection: keep-alive\r\n` +
			`Content-Length: ${ data.length }\r\n\r\n` +
			data + '\r\n\r\n'
}


class transferCount extends Transform {
	public data  = ''
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
	public currentWallet: ethers.Wallet

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
						return httpProxy(socket, data, agent, this)
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
		
	}

	public requestGetWay = async (uuuu : VE_IPptpStream, socket: Net.Socket ) => {

		const upChannel_SaaS_node  = getRandomSaaSNode(this._egressNodes)

	
		if (!upChannel_SaaS_node ) {
			return logger (Colors.red(`proxyServer makeUpChannel upChannel_SaaS_node Null Error!`))
		}

		
		
		const cmd = await createSock5ConnectCmd (this.currentWallet, upChannel_SaaS_node, [uuuu])
		if (!cmd) {
			return logger (Colors.red(`requestGetWay createSock5Connect return Null Error!`))
		}

		const entryNode = getRandomNode(this._entryNodes, upChannel_SaaS_node) 

		const streamString = Colors.blue (`Create gateway request, Layer minus random SaaS node [${Colors.magenta(upChannel_SaaS_node.ip_addr)}] entry node [${Colors.magenta(entryNode.ip_addr)}]\n`)

		// loggerToStream(this.logStream, streamString)
		// logger(streamString)
		// logger(Colors.blue(`entryNode [${entryNode.ip_addr}] => Saas[${upChannel_SaaS_node.ip_addr}]`))
		
		ConnectToProxyNode (cmd, upChannel_SaaS_node, entryNode, socket, uuuu, this)
	}

	public restart = (privateKey: string, entryNodes: nodes_info[], egressNodes: nodes_info[]) => {
		this.privateKey = privateKey
		this._entryNodes = entryNodes
		this._egressNodes = egressNodes
	}
    
	constructor (
		public proxyPort: string,						//			Proxy server listening port number
		private _entryNodes: nodes_info[],	 				//			gateway nodes information
		private _egressNodes: nodes_info[],
		private privateKey: string,
		public debug = false,
		public logStream: string

	)
	{

		logger(Colors.magenta(`${proxyPort} Entry Nodes\n${_entryNodes.map(n => [n.ip_addr, n.region])}`))
		logger(Colors.magenta(`${proxyPort} Egress Nodes\n${ _egressNodes.map(n =>[n.ip_addr, n.region])}`))
		this.currentWallet = new ethers.Wallet(privateKey)
		this.startLocalProxy()
	}

	public end = new Promise(resolve=> {
		if (this.server !== null) {
			this.server.close(err => {
				resolve (true)
			})
		}
	})
}

//		curl -v -x http://127.0.0.1:3002 "https://www.google.com"
