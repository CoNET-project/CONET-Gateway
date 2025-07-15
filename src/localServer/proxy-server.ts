import { createServer, Socket, Server } from 'node:net'
import {logger} from './logger'
import {LayerMinus} from './layerMinus'
export class ProxyServer {
	private server: Server
	private host = '0.0.0.0'

	constructor(private port: number, private layerMinus: LayerMinus) {
		this.port = port
		this.server = createServer(this.handleClient)
		this.start()
	}

	private start = () => {
		this.server.listen(this.port, this.host, () => {
			console.log(`🟢 Proxy server running at ${this.host}:${this.port}`)
		})
	}

	private handleClient = (client: Socket) => {
		client.once('data', (data: Buffer) => {
		const firstByte = data[0]

		if (firstByte === 0x05) {
			this.handleSocks5(client)
		} else if (firstByte === 0x04) {
			this.handleSocks4(client, data)
		} else {
			this.handleHttp(client, data)
		}
		})
	}

	private handleSocks5 = (client: Socket) => {
		client.write(Buffer.from([0x05, 0x00]))

		client.once('data', (req: Buffer) => {
			const addrType = req[3]
			let destAddr: string, destPort: number, offset: number

			if (addrType === 0x01) {
				destAddr = `${req[4]}.${req[5]}.${req[6]}.${req[7]}`
				offset = 8
			} else if (addrType === 0x03) {
				const len = req[4]
				destAddr = req.slice(5, 5 + len).toString('utf8')
				offset = 5 + len
			} else {
				client.end()
				return
			}

			destPort = req.readUInt16BE(offset)
			this.proxyConnection(client, destAddr, destPort, () => {
				client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]))
			})
		})
	}

	private handleSocks4 = (client: Socket, data: Buffer) => {
		const destPort = data.readUInt16BE(2)
		const destIP = data.slice(4, 8)
		const userIdEnd = data.indexOf(0x00, 8)
		const isSocks4a = destIP.slice(0, 3).every(b => b === 0) && destIP[3] !== 0

		let destAddr: string

		if (isSocks4a) {
			const domainStart = userIdEnd + 1
			const domainEnd = data.indexOf(0x00, domainStart)
			destAddr = data.slice(domainStart, domainEnd).toString('utf8')
		} else {
			destAddr = `${destIP[0]}.${destIP[1]}.${destIP[2]}.${destIP[3]}`
		}

		this.proxyConnection(client, destAddr, destPort, () => {
			const reply = Buffer.alloc(8, 0x00)
			reply[1] = 0x5a
		client.write(reply)
		}, () => {
			const reply = Buffer.alloc(8, 0x00)
			reply[1] = 0x5b
			client.write(reply)
			client.end()
		})
	}

	private handleHttp = (client: Socket, data: Buffer) => {
		const reqStr = data.toString('utf8')

		if (reqStr.startsWith('CONNECT')) {
			const [_, dest] = reqStr.split(' ')
			const [host, port] = dest.split(':')

			this.proxyConnection(client, host, parseInt(port), () => {
				client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
			})
		} else {
			const hostLine = reqStr.split('\r\n').find(line => line.startsWith('Host:'))
			if (!hostLine) return client.end()

			const host = hostLine.split(' ')[1]
			const port = 80

			this.proxyConnection(client, host, port, (remote) => {
				remote.write(data)
			})
		}
	}

	private proxyConnection = (
		client: Socket,
		host: string,
		port: number,
		onSuccess?: (remote: Socket) => void,
		onError?: () => void
	) => {
		
		if (this.layerMinus) {
			return this.layerMinus.connectToLayerMinus(client, host, port)
		}
		const remote = new Socket()
		logger (`${host}:${port}`)

		remote.connect(port, host, () => {
			onSuccess?.(remote)
			client.pipe(remote)
			remote.pipe(client)
			
		})

		remote.on('error', () => {
			onError?.()
			client.end()
		})
		
		
	}

	private stop = () => {
		this.server.close(() => {
			console.log('🔴 Proxy server stopped')
		})
	}
}


/**
 * 			test 
 * 			curl -v -x http://127.0.0.1:3002 "https://www.google.com"
//          curl -v -x socks4a://localhost:3002 "https://www.google.com"
//          curl -v -x socks4://localhost:3002 "https://www.google.com"
//          curl -v -x socks5h://localhost:3002 "https://www.google.com"

 * 			curl -v -x http://127.0.0.1:3003 "https://www.google.com"
			curl -v -x http://127.0.0.1:3003 "http://www.google.com"
//          curl -v -x socks4a://localhost:3003 "https://www.google.com"
//          curl -v -x socks4://localhost:3003 "https://www.google.com"
//          curl -v -x socks5h://localhost:3003 "https://www.google.com"
 * 			
 */

const test = () => {
	const entryNodes: nodes_info[] = [{
		"region": "NW.DE",
		"country": "DE",
		"ip_addr": "217.160.189.159",
		"armoredPublicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZq2V5xYJKwYBBAHaRw8BAQdAhqIi6sQx/wqogD+T0Yftwsx7iBhd4Iyh\nlRCFnJKBODHNKjB4Y2JCQjEzNzE5NzNENTdlNmJENDVhQzBkZmVGRDQ5M2I1\nOUY5RDc2QsKMBBAWCgA+BYJmrZXnBAsJBwgJkArZXaLou3oNAxUICgQWAAIB\nAhkBApsDAh4BFiEExfcG2i3ma6s72VROCtldoui7eg0AAHFgAQCrT8y1Y69H\noXTHfdLuEk+XUDpq4CAvj7KkHxbPNQU+PQD/SdBbRUcvSkzzoU4tLcXxVI0Q\nST8za1hvo3RdWCglxAPOOARmrZXnEgorBgEEAZdVAQUBAQdAcLPhpj4WdcZN\nu7pP/LLYYjzg0JhyYvVpDwUoXa9WmkoDAQgHwngEGBYKACoFgmatlecJkArZ\nXaLou3oNApsMFiEExfcG2i3ma6s72VROCtldoui7eg0AADvRAQDrgO8K+hza\ntH4LTpGZ7OscC7M2ZtUV0zXshHlEnxS5NgD/ZCAHabk0Y47bANGG7KrcqsHY\n3pmfYRPFcvckAoPiagc=\n=VhCf\n-----END PGP PUBLIC KEY BLOCK-----\n",
		"last_online": false,
		"nftNumber": 100,
		"domain": "9977E9A45187DD80.conet.network"
	}]
	const egressNodes: nodes_info[] = [{
		"region": "MD.ES",
		"country": "ES",
		"ip_addr": "93.93.112.187",
		"armoredPublicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZo9ITBYJKwYBBAHaRw8BAQdAtFGkXMLHSAJ3jMZAVmfMvtFF74PkpYR9\nT50s9Ndr6HnNKjB4NmJGM0FhNzI2MWUyMUJlNUZjNzgxQWMwOUY5NDc1YzhB\nMzRBZkVlYcKMBBAWCgA+BYJmj0hMBAsJBwgJkOe/gynD16TlAxUICgQWAAIB\nAhkBApsDAh4BFiEEpJqLA2EpKEPDlaCI57+DKcPXpOUAALCdAQCIFyD/LlbY\nRGWzyaS++BBNIslOoktpHxzcgS+sD7dJggEAxGvDZQiu42l7VlStvlN4J9Jr\nGWJy8opWUlghMFcZHgrOOARmj0hMEgorBgEEAZdVAQUBAQdAqtevF55R1RHW\nh3L8novWfriyXuVZJo/vwUTylQwdCggDAQgHwngEGBYKACoFgmaPSEwJkOe/\ngynD16TlApsMFiEEpJqLA2EpKEPDlaCI57+DKcPXpOUAAHHFAQCbOklWpmRw\niorLHhB99zbaNfsn9/F2uJwRs9U0/mBAhQEAg0VOc4nDfb9MD0tHTP6crD62\nFaYFiQ7vNSBo3DuXlw0=\n=XXSu\n-----END PGP PUBLIC KEY BLOCK-----\n",
		"last_online": false,
		"nftNumber": 101,
		"domain": "B4CB0A41352E9BDF.conet.network"
	}]
	const privateKey = '0xc3c55e163fa1ad5a08101b21eeb56756fb68605b0c8ce7b2bbbfa336f01b32c0'
	const layerMinus = new LayerMinus (entryNodes, egressNodes, privateKey)
	new ProxyServer(3002, layerMinus)
}


