/*!
 * Copyright 2018 CoNET Technology Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Net from 'net'
import * as Rfc1928 from './rfc1928'
import * as Crypto from 'crypto'
import {proxyServer } from './proxyServer'
import * as Util from 'util'
import { logger, hexDebug } from './logger'
import colors from 'colors/safe'


//	socks 5 headers

const server_res = {
	NO_AUTHENTICATION_REQUIRED: Buffer.from ('0500', 'hex')
}

const isSslFromBuffer = ( buffer: Buffer ) => {
	const ret = buffer[0] === 0x16 && buffer[1] === 0x03
	return ret
}


export class socks5 {
	private host
	public ATYP
	public port
	public cmd
	private _cmd
	public targetIpV4
	private keep = false
	// private clientIP: string = this.socket.remoteAddress.split(':')[3] || this.socket.remoteAddress
	private debug
	private uuid = Crypto.randomBytes (10).toString ('hex')

	private stopConnection (req: Rfc1928.Requests) {
		req.REP = Rfc1928.Replies.COMMAND_NOT_SUPPORTED_or_PROTOCOL_ERROR
		this.socket.write ( req.buffer )
		this.socket.end()
	}

	private stopIP_V6Connection (req: Rfc1928.Requests) {
		logger(colors.red(`stopIP_V6Connection!!`))
		req.REP = Rfc1928.Replies.ADDRESS_TYPE_NOT_SUPPORTED
		this.socket.write ( req.buffer )
		this.socket.end()
	}

	private closeSocks5 ( buffer: Buffer ) {
		//console.log (`close proxy socket!`)
		if ( this.socket ) {
			if ( this.socket.writable ) {
				this.socket.end ( buffer )
			}

			if ( typeof this.socket.removeAllListeners === 'function' )
				this.socket.removeAllListeners()
		}
	}

	private connectStat3 ( req: Rfc1928.Requests ) {

		if (!this.proxyServer.SaaS_payment) {
			req.REP = Rfc1928.Replies.NETWORK_UNREACHABLE
			return this.socket.write ( req.buffer )
		}

		let userAgent = ''
		switch (req.cmd) {
			case Rfc1928.CMD.CONNECT: {
				if (req.ATYP === Rfc1928.ATYP.IP_V6) {
					return this.stopIP_V6Connection(req)
				}
				break
			}
			case Rfc1928.CMD.BIND: {
				logger(colors.red(`Rfc1928.CMD.BIND`))
				return this.stopConnection(req)
			}
			case Rfc1928.CMD.UDP_ASSOCIATE: {
				logger(colors.red(`Rfc1928.CMD.UDP_ASSOCIATE`))
				return this.stopConnection(req)
			}
			default: {
				logger(colors.red(`Rfc1928.CMD unknow command! `))
				return this.stopConnection(req)
			}
		}



		//		PAYMENT REQUIRE


		this.socket.once ( 'data', ( _data: Buffer ) => {
			const uuuu : VE_IPptpStream = {
				uuid: this.uuid,
				host: req.host,
				buffer:  _data.toString ( 'base64' ),
				cmd: this._cmd,
				port: req.port,
				ssl: isSslFromBuffer (_data),
				order: 0
			}
			
			return this.proxyServer.requestGetWay ( uuuu, this.socket )
		})


		req.REP = Rfc1928.Replies.GRANTED
		return this.socket.write ( req.buffer )
	}
	
	private udpProcess ( data: Rfc1928.Requests ) {
		data.REP = Rfc1928.Replies.GRANTED
		return this.socket.write ( data.buffer )
	}
	
	private connectStat2 ( data: Buffer ) {

		if ( this.debug ) {
			hexDebug(data)
		}
		const req = new Rfc1928.Requests ( data )

		this.ATYP = req.ATYP
		this.host = req.domainName
		this.port = req.port
		this.cmd = req.cmd
		this.targetIpV4 = req.ATYP_IP4Address
		this.keep = false
		//.serverIP = this.socket.localAddress.split (':')[3]

		//		IPv6 not support!
		
		switch ( this.cmd ) {

			case Rfc1928.CMD.CONNECT: {
				
				this.keep = true
				this._cmd = 'CONNECT'
				break
			}
			case Rfc1928.CMD.BIND: {
				this._cmd = 'BIND'
				logger (colors.red(`Sock5 Rfc1928.CMD.BIND request!`))
				break
			}
			case Rfc1928.CMD.UDP_ASSOCIATE: {
				this._cmd = 'UDP_ASSOCIATE'
				logger( `Rfc1928.CMD.UDP_ASSOCIATE data[${ data.toString ('hex')}]` )
				break
			}
			default: {
				this._cmd = 'UNKNOW'
				logger (`Socks 5 unknow cmd: `, data.toString('hex'), Util.inspect(req, false, 3, true))
				break
			}
				
		}

		//			IPv6 not support 
		// if ( req.IPv6 ) {
		// 	this.keep = false
		// }
		const obj = { ATYP:this.ATYP, host: this.host, hostType: typeof  this.host, port: this.port, targetIpV4: this.targetIpV4 , cmd: this._cmd, buffer: data.toString('hex') }
		if ( ! this.keep ) {
			req.REP = Rfc1928.Replies.COMMAND_NOT_SUPPORTED_or_PROTOCOL_ERROR
			if ( this.debug ) {
				logger(colors.red(`Rfc1928.Replies.COMMAND_NOT_SUPPORTED_or_PROTOCOL_ERROR STOP socks 5 connecting.`))
				logger(Util.inspect(obj))
			}
			return this.closeSocks5 ( req.buffer )
		}
		return this.connectStat3 (req)
	}

	constructor ( private socket: Net.Socket, private data: Buffer, private agent: string, private proxyServer: proxyServer ) {
		
		logger (colors.yellow(`new socks v5`))

		this.socket.once ( 'data', ( chunk: Buffer ) => {
			return this.connectStat2 ( chunk )
		})

		this.socket.write ( server_res.NO_AUTHENTICATION_REQUIRED )

	}
}

export class sockt4 {
	private req
	private host 
	private port
	private uuid = Crypto.randomBytes (10).toString ('hex')
	private cmd
	private _cmd = ''
	private targetIpV4
	private keep = false
	private debug = false
	private id
	constructor ( private socket: Net.Socket, private buffer: Buffer, private agent: string, private proxyServer: proxyServer ) {
		this.debug = proxyServer.debug
		this.socket.pause ()
		this.req = new Rfc1928.socket4Requests ( this.buffer )
		this.host = this.req.domainName
		this.port = this.req.port
		this.cmd = this.req.cmd
		this.targetIpV4 = this.req.targetIp
		this.id = colors.blue(`[${ this.uuid}] [${ this.socket.remoteAddress}:${this.socket.remotePort}] --> [${ this.host}:${ this.port}]`)

		if ( this.debug ) {
			logger (colors.yellow(`new socks v4`))
			hexDebug(buffer)
		}
		
		switch ( this.cmd ) {
			case Rfc1928.CMD.CONNECT: {
				this.keep = true
				this._cmd = 'CONNECT'
				if ( this.debug ) {
					logger(colors.gray(`${ this.id} sockt4 got Rfc1928 command ${colors.magenta('CONNECT')}`))
				}
				break
			}
			case Rfc1928.CMD.BIND: {
				
				this._cmd = 'BIND'
				if ( this.debug ) {
					logger(colors.gray(`${ this.id} sockt4 got Rfc1928 command ${colors.magenta('BIND')}`))
				}
				break
			}
			case Rfc1928.CMD.UDP_ASSOCIATE: {
				if ( this.debug ) {
					logger(colors.gray(`${ this.id} sockt4 got Rfc1928 command ${colors.magenta('UDP_ASSOCIATE')}`))
				}
				this._cmd = 'UDP_ASSOCIATE'
				break
			}
			default: {
				logger(colors.red(`${ this.id } sockt4 got Rfc1928 unknow command [${ this.cmd }]`))
				
				this._cmd = 'UNKNOW'
				break
			}
				
		}

		if ( ! this.keep ) {
			this.debug ? logger (colors.red(`STOP session`)): null
			this.socket.end ( this.req.request_failed )
			return
		}

		this.connectStat2 ()

	}
	
	public connectStat2 () {

		this.socket.once ( 'data', ( _data: Buffer ) => {
			if ( this.debug ) {
				logger (`SOCK4 connectStat2 [${ this.host || this.targetIpV4 }] get data`)
				hexDebug(_data)
			}

			this.connect (_data)

		})
		const buffer = this.req.request_4_granted ( '0.0.0.255', this.port )
		this.socket.write ( buffer )
		return this.socket.resume ()
	}

	public connect ( buffer: Buffer) {
		
		const uuuu : VE_IPptpStream = {
			uuid: this.uuid,
			host: this.req.domainName||this.req.targetIp,
			buffer: buffer.toString ( 'base64' ),
			cmd: this._cmd,
			port: this.req.port,
			ssl: isSslFromBuffer ( buffer ),
			order: 0
		}
		
		return this.proxyServer.requestGetWay ( uuuu, this.socket )
		

		//return this.socket.end ( this.req.request_failed )
	}
}


/*
export class UdpDgram {
	private server: Dgram.Socket = null
	public port = 0

	private createDgram () {
		this.server = Dgram.createSocket ( 'udp4' )
		
		this.server.once ( 'error', err => {
			console.log ( 'server.once error close server!', err  )
			this.server.close ()
		})

		this.server.on ( 'message', ( msg: Buffer, rinfo ) => {
			console.log(`UdpDgram server msg: ${ msg.toString('hex') } from ${ rinfo.address }:${ rinfo.port }`)
		})

		this.server.once ( 'listening', () => {
			const address = this.server.address()
			this.port = address.port
			console.log ( `server listening ${ address.address }:${ address.port }` )
		})

		this.server.bind ({ port: 0 } , ( err, kkk ) => {
			if ( err ) {
				return console.log ( `server.bind ERROR`, err )
			}
			console.log ( kkk )
		})
	}
	constructor () {
		this.createDgram ()
	}
}
*/