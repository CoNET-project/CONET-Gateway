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



const getRandomSaaSNode = (saasNodes: nodes_info[], allNodes: nodes_info[]) => {
	if (!saasNodes.length || !allNodes.length) {
		return null
	}
	logger (`getRandomSaaSNode saasNodes length [${saasNodes.length}] allNodes length [${allNodes}]`)
	const ramdom = Math.round((saasNodes.length - 1 ) * Math.random())
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

const encrypt_Message = async (privatePgpObj: any, armoredPublicKey: string, message: any) => {
	const encryptObj = {
        message: await openpgp.createMessage({text: Buffer.from(JSON.stringify (message)).toString('base64')}),
        encryptionKeys: await openpgp.readKey ({ armoredKey: armoredPublicKey }),
        signingKeys: privatePgpObj,
		config: { preferredCompressionAlgorithm: openpgp.enums.compression.zlib }, 		// compress the data with zlib

    }
	return await openpgp.encrypt
		//@ts-ignore
		(encryptObj)
}

const udpPackageCmd = async (currentProfile: profile, nodes: nodes_info[], SaaSnode: nodes_info|undefined, requestData: any[]) => {
	if (!currentProfile?.pgpKey|| !SaaSnode?.armoredPublicKey || !nodes.length ) {
		return null
	}
	const key = Buffer.from(getRandomValues(new Uint8Array(16))).toString('base64')
	const command: SICommandObj = {
		command: 'SaaS_Sock5_Data_Entry',
		publicKeyArmored: currentProfile.pgpKey.publicKeyArmor,
		algorithm: 'AES-GCM',
		Securitykey: key,
		requestData: requestData
	}
	let privateKeyObj

	try {
		privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey.privateKeyArmor)
	} catch (ex){
		logger (ex)
	}

	const encryptedCommand = await encrypt_Message( privateKeyObj, SaaSnode.armoredPublicKey, command)
	command.requestData = [encryptedCommand,, key]
	return (command)
}

const createSock5ConnectCmd = async (currentProfile: profile, SaaSnode: nodes_info|undefined, requestData: any[]) => {
	if (!currentProfile?.pgpKey|| !SaaSnode?.armoredPublicKey ) {
		logger (Colors.red(`currentProfile?.pgpKey[${currentProfile?.pgpKey}]|| !SaaSnode?.armoredPublicKey[${SaaSnode?.armoredPublicKey}] Error`))
		return null
	}
	const key = Buffer.from(getRandomValues(new Uint8Array(16))).toString('base64')
	const command: SICommandObj = {
		command: 'SaaS_Sock5',
		publicKeyArmored: currentProfile.pgpKey.publicKeyArmor,
		algorithm: 'AES-GCM',
		Securitykey: key,
		requestData
	}
	let privateKeyObj

	try {
		privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey.privateKeyArmor)
	} catch (ex){
		logger (ex)
	}

	const encryptedCommand = await encrypt_Message( privateKeyObj, SaaSnode.armoredPublicKey, command)
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

type ITypeTransferCount = {
	hostInfo: string
	upload: number
	download: number
	startTime: number
	endTime: number
	nodeIpaddress: string
	ssl: boolean
}

class transferCount extends Transform {
	constructor(private upload: boolean, private info: ITypeTransferCount) {
		super()
	}
	_transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
		if (this.upload) {
			this.info.upload += chunk.length
		} else {
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

const ConnectToProxyNode = (cmd : SICommandObj, SaaSnode: nodes_info, nodes: nodes_info[], socket: Net.Socket, currentProfile: profile, uuuu: VE_IPptpStream) => {

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
		logger(Colors.magenta(`Proxy client on Close! STOP connecting`))
		remoteSocket.end().destroy()
		infoData.endTime=new Date().getTime()
		
	})

	socket.once ('error', err => {
		logger(Colors.magenta(`Proxy client on Error [${err.message}]! STOP connecting`))
		remoteSocket.end().destroy()
	})

	remoteSocket.write(data)

}

const postUDPMessage = async (SaaS_node: nodes_info, nodes: nodes_info[], currentProfile: profile, uuuu: VE_IPptpStream, callback) => {
	if (!SaaS_node?.ip_addr ) {
		return logger (Colors.red(`proxyServer makeUpChannel upChannel_SaaS_node or upChannelEntry_node Null Error!`))
	}

	const cmd = await udpPackageCmd (currentProfile, nodes, SaaS_node, [uuuu])
	if (!cmd) {
		return logger (Colors.red(`proxyServer makeUpChannel createEntryChannel return Null Error!`))
	}
	const _sendData =cmd.requestData[0]
	const id = Colors.green(`Connect to [`)+Colors.red(`${uuuu.host}:${uuuu.port}`)+Colors.green(`]`)
	//const url = `http://${ getRandomNode(nodes, SaaS_node)?.ip_addr }/post`
	const host = getRandomNode(nodes, SaaS_node)?.ip_addr
	const option: RequestOptions = {
		host: host,
		method: 'POST',
		port: '80',
		path: '/post',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		}
	}

	const req = requestHttp(option, res => {
		if (res.statusCode !==200) {
			return logger (Colors.red(`postUDPMessage [${ uuuu.uuid }] [${id}]  STEP [${uuuu.order }] chunk length [${_sendData.length}] res.statusCode [${res.statusCode}] !== 200 ERROR`))
		}
		logger (Colors.blue(`postUDPMessage [${ uuuu.uuid }] [${id}] STEP [${uuuu.order }] chunk length [${_sendData.length}] == SUCCESS`))
		res.destroy()
		callback()
	})

	req.on('error', err => {
		logger (Colors.red(`postUDPMessage [${ uuuu.uuid }] [${id}] STEP [${uuuu.order }] chunk length [${_sendData.length}] host on Error!`), err)
	})
	req.end(JSON.stringify({data:_sendData}))
}

const getJSON_DataFromUrl= (_url: string) => {
	const url = new URL(_url)
	const option: RequestOptions = {
		hostname: url.hostname,
		method: 'POST',
		port: url.port,
		path: url.pathname,
		protocol: url.protocol,
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		}
	}
	
	return new Promise(( resolve)  => {
		const req = requestHttps(option, res => {
			if (res.statusCode!== 200) {
				resolve (null)
				return logger (Colors.red(`getJSON_DataFromPOST res got response [${res.statusCode}] !== 200 `))
			}

			let data=''
			res.on('data', _data => {
				data += _data.toString()
			})

			res.once ('end', () => {
				let ret
				try{
					ret = JSON.parse(data)
				} catch (ex) {
					logger (Colors.red(`getJSON_DataFromPOST JSON.parse(data) ERROR`), data)
					return resolve(null)
				}
				return resolve(ret)
			})
			
		})

		req.on('error', err => {
			logger (Colors.red(`getJSON_DataFromPOST server on Error _url=[${_url}] `), inspect(option, false, 2, true), err)
		})
		req.end()
	})

	
	
}

export class proxyServer {
	private hostLocalIpv4: { network: string, address: string } []= []
	private hostLocalIpv6 =''
	private hostGlobalIpV4 = ''
	private hostGlobalIpV6 = ''
	private network = false
	private getGlobalIpRunning = false
	private server: Net.Server|null = null
	//public gateway = new gateWay ( this.multipleGateway, this.debug )
	public whiteIpList = []
	public domainBlackList = []
	public domainListPool = new Map ()
	public checkAgainTimeOut = 1000 * 60 * 5
	public connectHostTimeOut = 1000 * 5
	public useGatWay = true
	public nodes
	public clientSockets: Set<Net.Socket> = new Set()

	private startLocalProxy = async () => {

		this.nodes = await getJSON_DataFromUrl(conet_DL_getSINodes)
		if (!this._nodes|| !this._nodes.length) {
			logger (Colors.red(`startLocalProxy Error! Have no SI nodes Infomation!`))
		}
		logger(inspect(this._nodes))
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
			return logger ( Colors.blue(`Proxy SERVER success on port : [${ this.proxyPort }] active nodes =[${this.nodes.length}] Saas nodes = [${this.currentProfile.network.recipients.length}]`))
		})
	}

	public requestGetWay = async (requestObj: requestObj, uuuu : VE_IPptpStream, userAgent:string, socket: Net.Socket ) => {
		const upChannel_SaaS_node  = getRandomSaaSNode(this.currentProfile.network.recipients, this.nodes)	//getNodeByIpaddress('74.208.55.241', this.nodes)
		
		if (!upChannel_SaaS_node ) {
			return logger (Colors.red(`proxyServer makeUpChannel upChannel_SaaS_node Null Error!`))
		}
		
		const cmd = await createSock5ConnectCmd (this.currentProfile, upChannel_SaaS_node, [uuuu])
		if (!cmd) {
			return logger (Colors.red(`requestGetWay createSock5Connect return Null Error!`))
		}

		ConnectToProxyNode (cmd, upChannel_SaaS_node, this.nodes, socket, this.currentProfile, uuuu)
	}
    
	constructor (
		
		public proxyPort: string,						//			Proxy server listening port number
		private _nodes: nodes_info[],	 				//			gateway nodes information
		private currentProfile: profile,
		public debug = false )
		
		{
			logger(inspect(this.currentProfile.network.recipients, false, 1, true))
			this.startLocalProxy()
		}
}

