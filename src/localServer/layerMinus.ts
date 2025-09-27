import {ethers} from 'ethers'
import {Socket, createConnection} from 'node:net'
import {randomBytes, getRandomValues} from 'node:crypto'
import * as openpgp from 'openpgp'
import Colors from 'colors/safe'
import {Transform, TransformCallback} from 'node:stream'
import {logger} from './logger'

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

const getRamdomNode = (nodes: nodes_info[]) => {
	const randomIndex = Math.floor (Math.random() * (nodes.length))
	return nodes[randomIndex]
}

const encrypt_Message = async (encryptionKeys, message: any) => {
	const encryptObj = {
		message: await openpgp.createMessage({text: Buffer.from(JSON.stringify(message)).toString('base64')}),
		encryptionKeys,
		config: { preferredCompressionAlgorithm: openpgp.enums.compression.zlib}, 		// compress the data with zlib
	}
	return await openpgp.encrypt
		//@ts-ignore
		(encryptObj)
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


export class LayerMinus {

	private wallet: ethers.Wallet
	constructor(private entryNodes: nodes_info[], private egressNodes: nodes_info[], privateKey: string) {
		this.wallet = new ethers.Wallet(privateKey)
		entryNodes.forEach(async n => n.publicKeyObj = await openpgp.readKey ({ armoredKey: n.armoredPublicKey }))
		egressNodes.forEach(async n => n.publicKeyObj = await openpgp.readKey ({ armoredKey: n.armoredPublicKey }))
	}

    private getRandomEntryNodes = (node: nodes_info|null = null):nodes_info =>  {
        const randomIndex = Math.floor (Math.random() * (this.entryNodes.length))
        const retNode = this.entryNodes[randomIndex]
        if (!node || node.ip_addr !== retNode.ip_addr) {
            return retNode
        }
        
        return this.getRandomEntryNodes(node)
    }

    private getRandomeEressNodes = (node: nodes_info|null = null):nodes_info => {
        const randomIndex = Math.floor (Math.random() * (this.egressNodes.length))
        const retNode = this.egressNodes[randomIndex]
        if (!node || node.ip_addr !== retNode.ip_addr) {
            return retNode
        }
        
        return this.getRandomeEressNodes(node)
    }

    public makeConnectNew: (host: string, port: number, initialData: Buffer|null) => Promise<makeConnectResult> = async (host, port, initialData) => {
        logger(Colors.blue(`LayerMinus makeConnect ${host}:${port}`))
		const entryNode1 = this.getRandomEntryNodes()
		const entryNode2 = this.getRandomEntryNodes(entryNode1)
        const egressNode = this.getRandomeEressNodes()

		const requestData : VE_IPptpStream[] = [{
			order: 0,
			host,
			port,
			buffer: initialData?.toString ( 'base64' )||''
		}]

		const command: SICommandObj = {
			command: 'SaaS_Sock5_v2',
			algorithm: 'aes-256-cbc',
			Securitykey: Buffer.from(getRandomValues(new Uint8Array(16))).toString('base64'),
			requestData,
			walletAddress: this.wallet.address.toLowerCase()
		}

        const hostInfo = `${host}:${port}`

		const infoData: ITypeTransferCount = {
			hostInfo: hostInfo,
			startTime: new Date().getTime(),
			download: 0,
			upload: 0,
			nodeIpaddress: egressNode.ip_addr,
			endTime: 0
		}

        const message =JSON.stringify(command)
		const signMessage = await this.wallet.signMessage(message)
		const encryptedCommand = await encrypt_Message( egressNode.publicKeyObj, { message, signMessage })
		const data = otherRequestForNet(JSON.stringify({data: encryptedCommand}), entryNode1.ip_addr, 80, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36')
		const data1 = otherRequestForNet(JSON.stringify({data: encryptedCommand}), entryNode1.ip_addr, 80, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36')

        return {entryNode: entryNode1.ip_addr, egressNode: egressNode.ip_addr, initialData: data, entryNode1: entryNode2.ip_addr, initialData1: data1}
    }

    public makeConnect: (host: string, port: number, initialData: Buffer|null) => Promise<makeConnectResult> = async (host, port, initialData) => {
        logger(Colors.blue(`LayerMinus makeConnect ${host}:${port}`))
		const entryNode = this.getRandomEntryNodes()
		const egressNode = this.getRandomeEressNodes()

		const requestData : VE_IPptpStream[] = [{
			order: 0,
			host,
			port,
			buffer: initialData?.toString ( 'base64' )||''
		}]

		const command: SICommandObj = {
			command: 'SaaS_Sock5',
			algorithm: 'aes-256-cbc',
			Securitykey: Buffer.from(getRandomValues(new Uint8Array(16))).toString('base64'),
			requestData,
			walletAddress: this.wallet.address.toLowerCase()
		}

        const hostInfo = `${host}:${port}`

		const infoData: ITypeTransferCount = {
			hostInfo: hostInfo,
			startTime: new Date().getTime(),
			download: 0,
			upload: 0,
			nodeIpaddress: egressNode.ip_addr,
			endTime: 0
		}

        const message =JSON.stringify(command)
		const signMessage = await this.wallet.signMessage(message)
		const encryptedCommand = await encrypt_Message( egressNode.publicKeyObj, { message, signMessage })
		const data = otherRequestForNet(JSON.stringify({data: encryptedCommand}), entryNode.ip_addr, 80, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36')
		

        return {entryNode: entryNode.ip_addr, egressNode: egressNode.ip_addr, initialData: data}
    }
	
	public connectToLayerMinus = async (
		client: Socket,
		host: string,
		port: number) => {
		logger(Colors.blue(`connectToLayerMinus ${host}:port `))
		const entryNode = getRamdomNode(this.entryNodes)
		const egressNode = getRamdomNode(this.egressNodes)
		const requestData : VE_IPptpStream[] = [{
			order: 0,
			host,
			port,
			buffer: ''
		}]

		const command: SICommandObj = {
			command: 'SaaS_Sock5',
			algorithm: 'aes-256-cbc',
			Securitykey: Buffer.from(getRandomValues(new Uint8Array(16))).toString('base64'),
			requestData,
			walletAddress: this.wallet.address.toLowerCase()
		}
		const hostInfo = `${host}:${port}`

		const infoData: ITypeTransferCount = {
			hostInfo: hostInfo,
			startTime: new Date().getTime(),
			download: 0,
			upload: 0,
			nodeIpaddress: egressNode.ip_addr,
			endTime: 0
		}
		const message =JSON.stringify(command)
		const signMessage = await this.wallet.signMessage(message)
		const encryptedCommand = await encrypt_Message( egressNode.publicKeyObj, { message, signMessage })
		const data = otherRequestForNet(JSON.stringify({data: encryptedCommand}), entryNode.ip_addr, 80, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36')
		const upload = new transferCount (true, infoData)
		const download = new transferCount (false, infoData)
		
		const remoteSocket = createConnection(80, entryNode.ip_addr, () => {
			remoteSocket.write(data)
			logger(Colors.blue(`ConnectToProxyNode connect to entryNode ${entryNode.ip_addr}=>${egressNode.ip_addr} `))
            logger(data)
			client.pipe(upload).pipe(remoteSocket).pipe(download).pipe(client)
			
		})
	
		remoteSocket.on('error', err => {
			logger (Colors.red(`ConnectToProxyNode entry node [${entryNode.ip_addr}:${80}] on Error ${err.message} `))
		})
	
		remoteSocket.once('close', async () => {
			logger (Colors.magenta(`ConnectToProxyNode entry node [${entryNode.ip_addr}:${80}] on Close `))
			//await sendTransferDataToLocalHost(infoData)
		})
	
	
		client.once ('error', err => {
			logger(Colors.magenta(`Proxy client on Error [${err.message}]! STOP connecting`))
			remoteSocket.end().destroy()
		})
		
	}
}

