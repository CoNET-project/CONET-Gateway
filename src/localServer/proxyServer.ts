import Colors, { green } from 'colors/safe'
import Net from 'node:net'
import { Transform, pipeline, Writable} from 'node:stream'
import { inspect } from 'node:util'
import * as Socks from './socks'
import HttpProxyHeader from './httpProxy'

import {request as HttpsRequest} from 'node:https'
import {request as requestHttp} from 'node:http'
import {logger, hexDebug} from './logger'
import * as res from './res'
import type {RequestOptions} from 'node:https'
import * as openpgp from 'openpgp'
import { log } from 'node:console'
import dgram from 'node:dgram'
import {v4} from 'uuid'

const getRandomNode = (activeNodes: nodes_info[], saasNode: nodes_info|null) => {

	
	// return getNodeByIpaddress ('108.175.5.112', activeNodes)
	const ramdom = Math.round((activeNodes.length - 1 ) * Math.random())
	
	logger (Colors.grey(`getRandomNode ramdom[${ramdom}]`))
	const ret = activeNodes[ramdom]
	if (saasNode && ret.ip_addr === saasNode.ip_addr) {
		return getRandomNode (activeNodes, saasNode)
	}
	return ret
}
const CoNET_SI_Network_Domain = 'openpgp.online'

// const httpProxy = ( clientSocket: Net.Socket, buffer: Buffer, _gatway: gateWay, debug: boolean ) => {

// 	if ( !_gatway || typeof _gatway.requestGetWay !== 'function' ) {
// 		console.log (Colors.red(`httpProxy !gateWay stop SOCKET res._HTTP_PROXY_302 `))
// 		return clientSocket.end ( res._HTTP_PROXY_302 ())
// 	}
		
// 	const httpHead = new HttpProxyHeader ( buffer )
// 	const hostName = httpHead.host
// 	const userAgent = httpHead.headers [ 'user-agent' ]


// 	const connect = ( _, _data?: Buffer ) => {
// 		const uuuu : VE_IPptpStream = {
// 			uuid: Crypto.randomBytes (10).toString ('hex'),
// 			host: hostName,
// 			hostIPAddress: httpHead.hostIpAddress,
// 			buffer: _data.toString ( 'base64' ),
// 			cmd: httpHead.methods,
// 			//ATYP: Rfc1928.ATYP.IP_V4,
// 			port: httpHead.Port,
// 			ssl: isSslFromBuffer ( _data )
// 		}

// 		const requestObj: requestObj = {
// 			remotePort: clientSocket.remotePort,
// 			remoteAddress: clientSocket.remoteAddress.split(':')[3],
// 			targetHost: hostName,
// 			targetPort: httpHead.Port,
// 			methods: httpHead.methods,
// 			uuid: uuuu.uuid
// 		}

// 		if (!_data || ! _data.length) {
// 			console.log( colors.red(`httpProxy got unknow request stop proxy request `))
// 			closeClientSocket(clientSocket)
// 			return console.log( inspect( requestObj, false, 3, true ))
// 		}

// 		if ( _gatway && typeof _gatway.requestGetWay === 'function' ) {
// 			return _gatway.requestGetWay ( requestObj, uuuu, userAgent, clientSocket )
// 		}
// 		console.log (colors.red(`httpProxy _gatway have no ready!`))
// 		return closeClientSocket(clientSocket)
// 	}

// 	if ( httpHead.isConnect ) {
// 		return getSslConnectFirstData ( clientSocket, buffer, true, connect )
// 	}
// 	return connect (null, buffer )
	

// }

const getPac = ( hostIp: string, port: string, http: boolean, sock5: boolean ) => {

	const FindProxyForURL = `function FindProxyForURL ( url, host )
	{
		if ( isInNet ( dnsResolve( host ), "0.0.0.0", "255.0.0.0") ||
		isInNet( dnsResolve( host ), "172.16.0.0", "255.240.255.0") ||
		isInNet( dnsResolve( host ), "127.0.0.0", "255.255.255.0") ||
		isInNet ( dnsResolve( host ), "192.168.0.0", "255.255.0.0" ) ||
		isInNet ( dnsResolve( host ), "10.0.0.0", "255.0.0.0" )) {
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
	const key = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
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

const createSock5ConnectCmd = async (currentProfile: profile, entryNode: nodes_info|undefined, SaaSnode: nodes_info|undefined, requestData: any[]) => {
	if (!currentProfile?.pgpKey|| !SaaSnode?.armoredPublicKey || !entryNode ) {
		return null
	}
	const key = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
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

	const url = `https://${ entryNode.pgp_publickey_id }.${CoNET_SI_Network_Domain}/post`
	command.requestData = [encryptedCommand, url, key]
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

const ConnectToProxyNode = (cmd : SICommandObj, SaaSnode: nodes_info, nodes: nodes_info[], socket: Net.Socket, currentProfile: profile, uuuu: VE_IPptpStream) => {
	const Url = new URL (cmd.requestData[1])
	const entryNode = getRandomNode(nodes, SaaSnode)
	if (!entryNode) {
		return logger(Colors.red(`ConnectToProxyNode Error! getRandomNode return null nodes!`))
	}
	const connectID = Colors.gray('Connect to [') + Colors.green(`${uuuu.host}:${uuuu.port}`)+Colors.gray(']')

	const data = otherRequestForNet(JSON.stringify({data: cmd.requestData[0]}), entryNode.ip_addr, 80, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36')

	const remoteSocket = Net.createConnection(80, entryNode.ip_addr, () => {
		//	remoteSocket.setNoDelay(true)
		logger(Colors.blue(`ConnectToProxyNode connect to ${connectID}`))
		remoteSocket.pipe(socket).pipe(remoteSocket)
	})

	remoteSocket.on('error', err => {
		logger (Colors.red(`ConnectToProxyNode remote [${entryNode}:${80}] on Error ${err.message} `))
	})

	remoteSocket.once('close', () => {
		logger (Colors.magenta(`ConnectToProxyNode remote [${entryNode}:${80}] on Close `))
	})

	socket.once ('close', () => {
		logger(Colors.magenta(`Proxy client on Close! STOP connecting`))
		remoteSocket.end().destroy()
	})

	socket.once ('error', err => {
		logger(Colors.magenta(`Proxy client on Error [${err.message}]! STOP connecting`))
		remoteSocket.end().destroy()
	})

	remoteSocket.write(data)

}

const sendUDPMessage = async (SaaS_node: nodes_info, nodes: nodes_info[], currentProfile: profile, uuuu: VE_IPptpStream) => {
	// const upChannel_SaaS_node = getRandomNode(this.nodes)
	// const upChannelEntry_node = getRandomNode(this.nodes)

	if (!SaaS_node?.ip_addr ) {
		return logger (Colors.red(`proxyServer makeUpChannel upChannel_SaaS_node or upChannelEntry_node Null Error!`))
	}

	const cmd = await udpPackageCmd (currentProfile, nodes, SaaS_node, [uuuu])
	if (!cmd) {
		return logger (Colors.red(`proxyServer makeUpChannel createEntryChannel return Null Error!`))
	}

	const _sendData =cmd.requestData[0]

	const udpPort = 41234
	
	const tryConnect = () => {
		const udpClient = dgram.createSocket('udp4')
		const id = Colors.green(`Connect to [`)+Colors.red(`${uuuu.host}:${uuuu.port}`)+Colors.green(`]`)

		udpClient.connect(udpPort,
			'108.175.5.112',
			//getRandomNode(nodes, SaaS_node).ip_addr,
			() => {
			udpClient.send(_sendData, err => {
				udpClient.close()
				logger (Colors.blue(`sendUDPMessage [${ uuuu.uuid }] [${id}] chunk length [${_sendData.length}] ==`))
				if (err) {
					logger (Colors.red(`udpClient send got Error! `))
				}
				// logger (Colors.blue(`udpClient send SUCCESS! length = [${_sendData.length}]`))
				// logger (JSON.stringify(_sendData))
			})
		})
	}
	tryConnect()

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
	public clientSockets: Set<Net.Socket> = new Set()
	public currentProfile: profile

	private startLocalProxy () {
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
			return logger ( Colors.blue(`Proxy SERVER success on port : [${ this.proxyPort }]`))
		})
	}



	public requestGetWay = async (requestObj: requestObj, uuuu : VE_IPptpStream, userAgent:string, socket: Net.Socket ) => {
		const upChannel_SaaS_node  = getRandomNode(this.nodes, null)	//getNodeByIpaddress('74.208.55.241', this.nodes)
		
		if (!upChannel_SaaS_node ) {
			return logger (Colors.red(`proxyServer makeUpChannel upChannel_SaaS_node Null Error!`))
		}

		const cmd = await createSock5ConnectCmd (this.currentProfile, getRandomNode(this.nodes, upChannel_SaaS_node), upChannel_SaaS_node, [uuuu])
		if (!cmd) {
			return logger (Colors.red(`requestGetWay createSock5Connect return Null Error!`))
		}

		// logger (inspect(requestObj, false, 3, true))
		// logger(Colors.blue(`VE_IPptpStream = [${inspect(uuuu, false, 3, true)}]`))
		ConnectToProxyNode (cmd, upChannel_SaaS_node, this.nodes, socket, this.currentProfile, uuuu)
	}
	

	// private getGlobalIp = ( gateWay: gateWay ) => {
	// 	if ( this.getGlobalIpRunning ) {
	// 		return console.log (`getGlobalIp getGlobalIpRunning === true!, skip!`)
	// 	}
			
	// 	this.getGlobalIpRunning = true
	// 	logger ( `doing getGlobalIp!`)
	// 	return gateWay.hostLookup ( testGatewayDomainName, null, ( err, data ) => {
	// 		this.getGlobalIpRunning = false
	// 		if ( err ) {
	// 			return logger ( 'getGlobalIp ERROR:', err.message )
	// 		}
				
	// 		//console.log ( Util.inspect ( data ))
			
	// 		this.hostLocalIpv6 ? console.log ( `LocalIpv6[ ${ this.hostLocalIpv6 } ]`) : null

	// 		this.hostLocalIpv4.forEach ( n => {
	// 			return console.log ( `LocalIpv4[ ${ n.address }]`)
	// 		})

	// 		this.hostGlobalIpV6 ? console.log ( `GlobalIpv6[ ${ this.hostGlobalIpV6 } ]`) : null
			
	// 		this.hostGlobalIpV4 ? console.log ( `GlobalIpv4[ ${ this.hostGlobalIpV4 } ]`) : null

	// 		const domain = data
	// 		if ( ! domain ) {
	// 			return console.log ( `[] Gateway connect Error!` )
	// 		}
	// 		this.network = true
	// 		console.log ( '*************** Gateway connect ready *************************' )

	// 	})
	// }
    
	constructor ( 
		
		public proxyPort: string,						//			Proxy server listening port number
		private nodes: nodes_info[],	 				//			gateway nodes information
		private profile: profile[],
		public debug = false ) 
		
		{
			const index = this.profile.findIndex (n => n.isPrimary)
			if ( index > -1 ) {
				this.currentProfile = this.profile[index]
				this.startLocalProxy()
			} else {
				logger (Colors.red(`Local Proxy have no profile ERROR!`))
			}

			logger (Colors.red(`proxyServer start [${nodes.length }] nodes`))
	}

}

