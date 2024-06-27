import express from 'express'
import type { Server } from 'node:http'
import { request } from 'node:https'
import type {RequestOptions} from 'node:https'
import { join } from 'node:path'
import Colors from 'colors/safe'
import { inspect } from 'node:util'
import { v4 } from 'uuid'
import {proxyServer} from './proxyServer'
import {logger} from './logger'
import Ip from "ip"



const ver = '0.1.4'


const CoNET_SI_Network_Domain = 'openpgp.online'
const conet_DL_getSINodes = `https://${ CoNET_SI_Network_Domain }:4001/api/conet-si-list`

const postToEndpointJSON = ( url: string, jsonData: string ) => {
	return new Promise ((resolve, reject) => {

        const Url = new URL(url)

        const option: RequestOptions = {
            port: Url.port,
            hostname: Url.hostname,
            host: Url.host,
            path: Url.pathname,
            method: 'POST',
			protocol: Url.protocol,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': jsonData.length
            },
            rejectUnauthorized: false
        }

        const connect = request(option, res => {
            let data = ''
            if (res.statusCode === 200 ) {
                res.on ('data', _data => {
                    data += _data
                })
            }
            res.once ('end', () => {
                logger (`postToEndpoint res on END`)
                if ( data.length) {
                    let ret
                    try {
                        ret = JSON.parse(data)
                    } catch (ex) {
                        logger (Colors.red(`postToEndpointJSON [${url}] JSON parse ERROR! data=\n[${ data }]\n`))
                        return resolve ('')
                    }
                    return resolve (ret)
                }
                return ('')
            })
            res.on('error', err => {
                logger (Colors.red(`postToEndpointJSON [${url}] response on ERROR! \n[${ err.message }]\n`) )
            })

        })

        connect.on ('error', err => {

            logger (Colors.red(`postToEndpointJSON [${url}] connect on ERROR! \n[${ err.message }]\n`))
            return reject (err)
        })

        connect.end(jsonData)

	})
	
}

export const splitIpAddr = (ipaddress: string | undefined) => {
	if (!ipaddress?.length) {
		logger (Colors.red(`splitIpAddr ipaddress have no ipaddress?.length`), inspect( ipaddress, false, 3, true ))
		return ''
	}
	const _ret = ipaddress.split (':')
	return _ret[_ret.length - 1]
}


const makeMetadata = ( text: string ) => {
    let ret = '{'
    let n = 0
    const makeObj = (text: string) => {
        ret += `${n === 0?'':','}"st${n++}":"${text}"`
    }
    while ( text.length ) {
        const uu = text.substring (0, 500)
        text = text.substring (500)
        makeObj (uu)
    }
    ret += '}'
    return ret
}

const joinMetadata = (metadata: any ) => {
    delete metadata.response
    let _metadata = ''
    Object.keys (metadata).forEach (n => {
        _metadata += metadata[n]
    })
    
    metadata['text']= _metadata
}


const otherRespon = ( body: string| Buffer, _status: number ) => {
	const Ranges = ( _status === 200 ) ? 'Accept-Ranges: bytes\r\n' : ''
	const Content = ( _status === 200 ) ? `Content-Type: text/html; charset=utf-8\r\n` : 'Content-Type: text/html\r\n'
	const headers = `Server: nginx/1.6.2\r\n`
					+ `Date: ${ new Date ().toUTCString()}\r\n`
					+ Content
					+ `Content-Length: ${ body.length }\r\n`
					+ `Connection: keep-alive\r\n`
					+ `Vary: Accept-Encoding\r\n`
					//+ `Transfer-Encoding: chunked\r\n`
					+ '\r\n'

	const status = _status === 200 ? 'HTTP/1.1 200 OK\r\n' : 'HTTP/1.1 404 Not Found\r\n'
	return status + headers + body
}


export const return404 = () => {
	const kkk = '<html>\r\n<head><title>404 Not Found</title></head>\r\n<body bgcolor="white">\r\n<center><h1>404 Not Found</h1></center>\r\n<hr><center>nginx/1.6.2</center>\r\n</body>\r\n</html>\r\n'
	return otherRespon ( Buffer.from ( kkk ), 404 )
}


export class Daemon {
    private logsPool: proxyLogs[] = []

    private loginListening: express.Response|null = null
    private localserver: Server
    private connect_peer_pool: any [] = []
	private appsPath: string = join ( __dirname )
    private worker_command_waiting_pool: Map<string, express.Response> = new Map()
    private logStram = ''

    constructor ( private PORT = 3000, private reactBuildFolder: string ) {
        this.initialize()
    }

    public _proxyServer: proxyServer|null = null

    public end () {
        this.localserver.close ()
    }

    public postMessageToLocalDevice ( device: string, encryptedMessage: string ) {
        const index = this.connect_peer_pool.findIndex ( n => n.publicKeyID === device )
        if ( index < 0 ) {
            return console.log ( inspect ({ postMessageToLocalDeviceError: `this.connect_peer_pool have no publicKeyID [${ device }]`}, false, 3, true ))
        }
        const ws = this.connect_peer_pool[ index ]
        const sendData = { encryptedMessage: encryptedMessage }
        console.log ( inspect ({ ws_send: sendData}, false, 3, true ))
        return ws.send ( JSON.stringify ( sendData ))
    }

    private initialize = () => {
        const staticFolder = join ( this.appsPath, 'workers' )
        //const launcherFolder = join ( this.appsPath, '../launcher' )
		//console.dir ({ staticFolder: staticFolder, launcherFolder: launcherFolder })

        const app = express()
		const cors = require('cors')

        app.use( cors ())
		app.use ( express.static ( staticFolder ))
        //app.use ( express.static ( launcherFolder ))
        app.use ( express.json() )

        app.once ( 'error', ( err: any ) => {
            logger (err)
            logger (`Local server on ERROR, try restart!`)
            return this.initialize ()
        })

        // app.get ('/', async ( req: express.Request, res: express.Response) => {

        //     const launcherHTMLPath = join (
        //         this.appsPath  + '../launcher/index.html'
        //     )
        //     const hasLauncher = await fse.pathExists(launcherHTMLPath);
        //     if (hasLauncher) {
        //         return res.status(200).sendFile(launcherHTMLPath);
        //     }
        //     return res.status(200).send("<p style='font-family: Arial, Helvetica, sans-serif;'>Oh no! You don't have the Kloak Platform Launcher!</p>")
        // })

        /**
         * Test network online
         *
         * Test results Array for imap.gmail.com, imap.mail.yahoo.com, imap.mail.me.com, outlook.office365.com,imap.zoho.com
         * test connecting with tls 993 port
         * {
         * 		name: server name
         * 		err: Error | null if have not error
         * 		time: connected time | null if have error
         * }
         */

        // app.post ('/sendToStripe', ( req: express.Request, res: express.Response ) => {
        //     logger (`app.post /sendToStripe ${ req.socket.remoteAddress }:${ req.socket.remotePort } `)
        //     const postData = req.body.postData
        //     const uuid = v4()
        //     const kk = JSON.parse(makeMetadata (Buffer.from(postData).toString ('base64')))
        //     const postChunk = {
        //         metadata: kk,
        //         description: uuid
        //     }
        //     let count = 0
        //     let keyid = ''
        //     const Stripe = require('stripe')(stripeAuth)
        //     const delCustoms = () => {
        //         if ( keyid.length ) {
        //             return Stripe.customers.del(keyid)
        //             .then (() => {
        //                 logger (`Deleted Stripe.customer [${ keyid }]`)
        //                 keyid = ''
        //             })
        //         }
                
        //     }
        //     const getUpdate = () => {
                
        //         return Stripe.customers.retrieve (keyid)
        //         .then ((customer: any ) => {
        //             logger (`check update from Stripe [${ count }]`)
                    
        //             const meta = customer.metadata
        //             logger (inspect(meta, false, 3, true ))
        //             const err = meta.error
        //             if ( err ) {
        //                 res.statusCode = /INVITATION/i.test (err) ? 402 : 406
        //                 res.end()
        //                 return Promise.reject (new Error('end'))
        //             }
                    
        //             if ( meta.response ) {
                        
        //                 joinMetadata(meta)
        //                 res.json (customer.metadata.text).end()
        //                 return Promise.reject (new Error('end'))
        //             }

        //             if ( ++count > 3 ) {
        //                 res.statusCode = 452
        //                 res.end()
        //                 return Promise.reject (new Error('end'))
        //             }
        //             setTimeout (() => {
        //                 logger (`getUpdate with getUpdate!`)
        //                 getUpdate ()
        //             }, 2000 )
        //             return Promise.reject (new Error('loop'))
                    
        //         })
        //         .catch ((ex: Error ) => {

        //             if ( /^end$/i.test (ex.message )) {
                        
        //                 delCustoms ()
                        
        //                 return logger (`catch end reject!`)
        //             }
        //             if ( /^loop$/i.test (ex.message )) {
                        
                        
        //                 return logger (`catch loop reject!`)
        //             }
        //             logger (`Stripe response ERROR! [${ keyid }]`)
        //             logger (ex)
        //             res.statusCode = 405
        //             res.end()
        //         })
        //     }

        //     return Stripe.customers.create(postChunk)
        //     .then ((n: any ) => {
        //         keyid = n.id
        //         logger (inspect(n, false, 3, true))
        //         setTimeout (()=> {
        //             logger (`getUpdate with main!`)
        //             getUpdate()
        //         }, 3000 )
        //     })
        //     .catch ((ex: any ) => {
        //         logger (ex)
        //         logger (`Seguro response ERROR! Deleted Stripe.customer [${ keyid }]`)
        //         res.statusCode = 405
        //         res.end()
        //     })
            
        // })

        
        app.post ( '/postMessage', ( req: express.Request, res: express.Response ) => {
            const post_data: postData = req.body
            console.log ( inspect ( post_data, false, 3, true ))
            console.log (`unknow type of ${ post_data }`)
            res.sendStatus ( 404 )
            return res.end ()
        })

        app.post ( '/conet-profile', ( req: express.Request, res: express.Response ) => {
            const data: { profile, activeNodes, egressNodes } = req.body
            
            //logger (Colors.blue(`Local server get POST /profile req.body = `), inspect(data, false, 3, true))
            if (data.activeNodes.length > 0 && data.profile ) {
                
				if (this._proxyServer) {
					this._proxyServer.restart(data.profile, data.activeNodes, data.egressNodes)
				} else {

					this._proxyServer = new proxyServer((this.PORT + 2).toString(), data.activeNodes, data.egressNodes, data.profile, true, this.logStram)
				}

                return res.sendStatus(200).end()
            }
			logger (`/conet-profile Error data.activeNodes [${data.activeNodes.length}] data.activeNodes.length > 0[${data.activeNodes.length > 0}]`, inspect(data.profile, false, 3, true))
			res.sendStatus(404).end()
            
        })

		app.get('/ipaddress', (req, res) => {
			return res.json ({ip:Ip.address()}).end()
		})

        app.post ('/proxyusage', (req, res) => {
            res.json().end()
            logger (inspect(req.body.data, false, 3, true))
            this.logsPool.unshift(req.body.data)
        })

        app.post('/getProxyusage', (req, res) => {

            if (!this._proxyServer) {
                return res.sendStatus(404).end()
            }
            const headerName=Colors.blue (`/getProxyusage`)
            logger(headerName,  inspect(req.body.data, false, 3, true))
            let roop:  NodeJS.Timeout
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Connection', 'keep-alive')
            res.flushHeaders() // flush the headers to establish SSE with client

            let interValID = () => {

                if (res.closed) {
                    return logger ('')
                }
                if (this.logsPool.length <1) {

                    this.logsPool.push(
                        //@ts-ignore
                        {data:`/getProxyusage ${req.body.data}`}
                    )
                }
                
                res.write(`${JSON.stringify({data: this.logsPool})}\r\n\r\n`, () => {
                    this.logsPool = []
                    return roop = setTimeout(() => {
                        interValID()
                    }, 10000)
                })
            }

            res.on('close', () => {
                console.log(`[${headerName}] client dropped me!`)
                res.end()
                clearTimeout(roop)
            })
            interValID()
            
        })

        app.post('/connecting', (req, res) => {

            const headerName=Colors.blue (`Local Server /connecting remoteAddress = ${req.socket?.remoteAddress}`)
            logger(headerName,  inspect(req.body.data, false, 3, true))
            let roop:  NodeJS.Timeout
            if (this.loginListening) {
                logger (`${headerName} Double connecting. drop connecting!`)
                return res.sendStatus(403).end()
                
            }
            this.loginListening = res
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Connection', 'keep-alive')
            res.flushHeaders() // flush the headers to establish SSE with client

            const interValID = () => {

                if (res.closed) {
                    this.loginListening = null
                    return logger (` ${headerName} lost connect! `)
                }
                
                res.write(`\r\n\r\n`, err => {
                    if (err) {
                        logger (`${headerName }res.write got Error STOP connecting`, err)
                        res.end()
                        this.loginListening = null
                    }
                    return roop = setTimeout(() => {
                        interValID()
                    }, 10000)
                })
            }

            res.once('close', () => {
                logger(`[${headerName}] Closed`)
                res.end()
                clearTimeout(roop)
                this.loginListening = null
            })

            res.on('error', err => {
                logger(`[${headerName}] on Error`, err)
            })

            return interValID()
            
        })

        app.post('/connectingResponse', (req, res) =>{
            const headerName = Colors.blue (`Local Server /connectingResponse remoteAddress = ${req.socket?.remoteAddress}`)
            const data: worker_command = req.body.data
            logger (`${headerName} connecting `, inspect(data))
            if (!data.uuid) {
                logger (`${headerName} has not UUID in worker_command! STOP connecting!`, inspect(data))
                data.err = 'NO_UUID'
                return res.sendStatus(403).json(data)
            }

            const _res = this.worker_command_waiting_pool.get (data.uuid)

            if (!_res) {
                logger (`${headerName} has not res STOP connecting!`, inspect(data))
                data.err = 'NOT_READY'
                return res.sendStatus(403).json(data)
            }

            this.worker_command_waiting_pool.delete(data.uuid)

            if (_res.closed|| !_res.writable) {
                logger (`${headerName} has not res STOP connecting!`, inspect(data))
                data.err = 'NOT_READY'
                return res.sendStatus(403).json(data)
            }
            res.json()

            if (data.err) {
                return _res.sendStatus(404).end()
            }
            _res.json(data)

        })

        app.get('/ver', (req, res) =>{
			logger (`APP get ${req.url}`)
            res.json({ver})
        })

        app.post('/loginRequest', (req, res) =>{
            
            const headerName=Colors.blue (`Local Server /loginRequest remoteAddress = ${req.socket?.remoteAddress}`)
            const data = req.body.data
            logger(headerName, inspect(data, false, 3, true))

            if (this._proxyServer) {
                logger (`${headerName} return proxy launched!`)
                return res.sendStatus(200).end()
            }

            if (!this.loginListening || this.loginListening.closed) {
                this.loginListening = null
                logger (`${headerName} has not any loginListening to host Error! STOP connecting!`)
                return  res.sendStatus (403).end()
            }


            if (!data) {
                logger (`${headerName} has not any data! STOP connecting!`)
                return  res.sendStatus (404).end()
            }
            const cmd: worker_command = {
                cmd: 'encrypt_TestPasscode',
                data: [data],
                uuid: v4()
            }

            if (cmd.uuid) {
                this.worker_command_waiting_pool.set (cmd.uuid, res)
            }
            
            this.loginListening.write (JSON.stringify(cmd)+'\r\n\r\n')
        })

        app.all ('*', (req, res) => {
			logger (Colors.red(`Local web server got unknow request URL Error! [${ splitIpAddr (req.ip) }] => ${ req.method } url =[${ req.url }]`))
			return res.status(404).end (return404 ())
		})

        this.localserver = app.listen ( this.PORT, () => {
            return console.table([
                { 'CONET Local Web Server': `http://localhost:${ this.PORT }, local-path = [${ staticFolder }]` },
                
            ])
        })
    }
}