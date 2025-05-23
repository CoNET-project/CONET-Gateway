import {createServer, Socket} from 'node:net'
import { logger, hexDebug } from './logger'
import Color from 'colors/safe'

import { request as httpsRequest } from 'node:https'
import { request as httpRequest } from 'node:http'
import {inspect} from 'node:util'

const httpProxy = (socket: Socket, data: Buffer) =>  {
	hexDebug(data)
	const line = data.toString()
	const line1 = line.split('\r\n')
	logger(line1)

	const url = line1[0].split(' ')[1]
	const domain = url.split(':')[0]
	const port = url.split(':')[1]

	const client = (port === "80") ? httpRequest: httpsRequest

	const requestTo = client({
		host: domain,
		port: port,
		protocol: port === "80" ?  "http:": "https:"
	}, _socker => {

		_socker.on ('data', buffer => {
			
			if (socket.writable) {
				socket.write(buffer)
			}
			
		})

		_socker.on("errr", err => {
			logger(err)
		})

	})

	requestTo.on("error", err => {
		logger(err)
	})

	requestTo.end(data)
	
}


const start = () => {
	const s = createServer(socket => {
		socket.once ( 'data', ( data: Buffer ) => {
			httpProxy(socket, data)
		})
	})

	s.listen(8889, '0.0.0.0')
}

start()


//			curl -v -x http://127.0.0.1:8888 "https://www.google.com"
//          curl -v -x socks4a://localhost:8888 "https://www.google.com"
//          curl -v -x socks4://localhost:8888 "https://www.google.com"
//          curl -v -x socks5h://localhost:8888 "https://www.google.com"
//          curl -v -x socks5h://localhost:3002 "https://www.google.com"