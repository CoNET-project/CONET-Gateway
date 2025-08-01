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


import {createHash } from 'crypto'
import { isIP } from 'net'
import { logger } from './logger'

const cacheFileType = /\.jpeg$|\.html$|\.css$|\.gif$|\.js$|\.jpg$|\.png$|\.svg$|\.xml$/i


export default class httpProxy {
	public commandWithLine: string[]
	public text: string
	public _parts: string []
	public headers: Object
	public requestWithoutHostName = '/'
	public reBuildRequest = ''
	constructor ( public buffer: Buffer ) {
		this.text = buffer.toString()
		this._parts = this.text.split ('\r\n\r\n')
		this.commandWithLine = this._parts[0].split ( /\r\n/ )
		let u = '{'
		for ( let i = 1, k = 0; i < this.commandWithLine.length; i ++ ) {
			const line = this.commandWithLine [i].split (': ')

			if ( line.length !== 2 ) {
				if ( /^host$/i.test( line [0]))
					continue
				break
			}
			if ( k++ !== 0 )
				u += ','
			u += `"${ line[0].toLowerCase() }": ${ JSON.stringify(line[1]) }`
		}
		u +='}'

		this.headers = JSON.parse ( u )
		const com = this.commandWithLine[0].split(' ')

		try {
			const url = new URL(com[1])
			
			
			this.requestWithoutHostName = com[1]
			if (!/CONNECT /i.test(com[0])) {
				this.requestWithoutHostName = (url.pathname || '/') + (url.search || '')
				logger(`this.requestWithoutHostName = ${this.requestWithoutHostName}`)
			}
			
		} catch (ex) {
			logger(`com[1] catch EX!`)
			this.requestWithoutHostName = com[1]
		}
		this.commandWithLine[0] = `${com[0]} ${this.requestWithoutHostName} ${com[2]}`
		this.reBuildRequest = this.text.replace(/.*\r\n/, `${this.commandWithLine[0]}\r\n`)

	}

	get parts () {
		return Math.round ( this._parts.length / 2 )
	}

	get nextPart () {
		const part = '\r\n\r\n'
		if ( this.parts > 1 ) {
			const part1 = this.text.indexOf ( part )
			const part2 = this.text.indexOf ( part, part1 + 1 )
			const kk = this.buffer.slice ( part2 + 4 )
			if ( kk.length )
				return kk
		}
		return Buffer.alloc (0)
	}

	get isHttps () {

		return ( this.isConnect )
	}
	
	get isHttpRequest () {
		return ( /^connect|^get|^put|^delete|^post|^OPTIONS|^HEAD|^TRACE/i.test ( this.commandWithLine[0] ))
	}

	get methods () {
		return this.commandWithLine[0].split(' ')[0]
	}


	get isConnect () {
		return ( /^connect /i.test ( this.commandWithLine[0] ) )
	}

	get hostIpAddress () {
		if (!isIP (this.host)) {
			return ''
		}
		return this.host
	}

	get isGet () {
		return /^GET /i.test ( this.commandWithLine[0] )
	}

	get isPost () {
		return /^port/i.test ( this.commandWithLine[0] )
	}

	get host () {
		if ( !this.headers['host'] ) {
			return ''
		}
		return this.headers['host'].split(':')[0]
	}

	get Port () {
		if ( !this.headers['host'] ) {
			return 80
		}
		return this.headers['host'].split(':')[1]||80
	}

	get cachePath () {
		if ( !this.isGet || ! this.isCanCacheFile )
			return null
		return createHash ( 'md5' ).update ( this.host + this.commandWithLine[0] ).digest( 'hex' )
	}

	get isCanCacheFile () {
		return cacheFileType.test ( this.commandWithLine[0].split(' ')[1] )
	}

	get getProxyAuthorization () {
		for ( let i = 1; i < this.commandWithLine.length; i ++ ) {
			const y = this.commandWithLine [i]
			if ( /^Proxy-Authorization: Basic /i.test( y )) {
				const n = y.split ( ' ' )
				if ( n.length === 3 ) {
					return Buffer.from ( n[2], 'base64' ).toString ()
				}
				return
			}
		}
		return
	}

	get BufferWithOutKeepAlife () {
		if ( !this.isGet || !this.isCanCacheFile )
			return this.buffer
		
		let ss = ''
		this.commandWithLine.forEach ( n => {
			ss += n.replace ( 'keep-alive', 'close' ) + '\r\n'
		})
		ss += '\r\n\r\n'
		
		return Buffer.from ( ss )
	}

	get Body () {
		const length = parseInt ( this.headers[ 'content-length' ])
		if ( !length )
			return null
		const body = this._parts [1]
		if ( body && body.length && body.length === length )
			return body
		
		return null
		
	}

	get preBodyLength () {
		const body = this._parts [1]
		return body.length
	}



	get BodyLength () {
		return parseInt ( this.headers[ 'content-length' ])
	}

}

