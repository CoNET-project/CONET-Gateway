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

const CoNET_SI_Network_Domain = 'openpgp.online'
const conet_DL_getSINodes = `https://${ CoNET_SI_Network_Domain }/api/conet-si-list`

const postToEndpointJSON = ( url: string, jsonData: string ) => {
	return new Promise ((resolve, reject) => {

        const Url = new URL(url)

        const option: RequestOptions = {
            port: 443,
            hostname: Url.hostname,
            host: Url.host,
            path: Url.pathname,
            method: 'POST',
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

export const splitIpAddr = (ipaddress: string ) => {
	if (!ipaddress?.length) {
		logger (Colors.red(`splitIpAddr ipaddress have no ipaddress?.length`), inspect( ipaddress, false, 3, true ))
		return ''
	}
	const _ret = ipaddress.split (':')
	return _ret[_ret.length - 1]
}

const _getSINodes = async (sortby: SINodesSortby, region: SINodesRegion) => {
	const data = {
		sortby,
		region
	}
	let result

	try {
		result = await postToEndpointJSON(conet_DL_getSINodes, '')
	} catch (ex) {
		logger (`postToEndpoint [${conet_DL_getSINodes}] Error`, ex)
		return null
	}
	const rows: nodes_info[] = result
	if (rows.length) {
		//async.series(rows.filter(n => n.country === 'US').map(n=> ( next => _getNftArmoredPublicKey(n).then(nn => {n.armoredPublicKey = nn; next()}))))

		rows.forEach ( async n => {
			n.disable = n.entryChecked = n.recipientChecked = false
			n.customs_review_total = parseFloat(n.customs_review_total.toString())
			// n.armoredPublicKey = await _getNftArmoredPublicKey (n)
		})
		
	} else {
		logger (`################ _getSINodes get null nodes Error! `)
	}
	return rows
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


class LocalServer {
    private nodes: nodes_info[] = []
    private localserver: Server
    private connect_peer_pool: any [] = []
	private appsPath: string = join ( __dirname ) 
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
		const staticFolder1 = join ( this.appsPath, '../../../seguro-platform/build' )
        //const launcherFolder = join ( this.appsPath, '../launcher' )
		//console.dir ({ staticFolder: staticFolder, launcherFolder: launcherFolder })

        const app = express()
		const cors = require('cors')

        app.use( cors ())
		app.use ( express.static ( staticFolder ))
        //app.use ( express.static ( launcherFolder ))
		app.use ( express.static ( staticFolder1 ))
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

        app.get ('./sw.js', ( req, res ) => {
            logger (`./sw.js`)

        })
        app.post ( '/postMessage', ( req: express.Request, res: express.Response ) => {
            const post_data: postData = req.body
            console.log ( inspect ( post_data, false, 3, true ))
            console.log (`unknow type of ${ post_data }`)
            res.sendStatus ( 404 )
            return res.end ()
        })

        app.post ( '/conet-profile', ( req: express.Request, res: express.Response ) => {
            const data: { profiles, activeNodes } = req.body
            
            //logger (Colors.blue(`Local server get POST /profile req.body = `), inspect(data, false, 3, true))
            if (data.activeNodes && data.profiles ) {
                if (!this._proxyServer) {
                    this._proxyServer = new proxyServer((this.PORT + 2).toString(), data.activeNodes, data.profiles, true)
                }
                res.sendStatus(200) 
            } else {
                res.sendStatus(404)
            }
            return res.end ()
        })

        app.post('/newNotice', ( req: express.Request, res: express.Response ) => {
            const url: string = req.body
            return request (url, _res => {
                return _res.pipe ( res )
            })
        })

        app.all ('*', (req, res) => {
			logger (Colors.red(`Local web server got unknow request URL Error! [${ splitIpAddr (req.ip) }] => ${ req.method }[http://${ req.headers.host }${ req.url }]`))
			return res.status(404).end (return404 ())
		})

        this.localserver = app.listen ( this.PORT, () => {
            return console.table([
                { 'CONET Local Web Server': `http://localhost:${ this.PORT }, local-path = [${ staticFolder }]` },
                
            ])
        })
    }
}

export default LocalServer

/**
 *          test()
 */


// const doTest = async () => {
//     const uu = await _getSINodes ('CUSTOMER_REVIEW', 'USA')
//     logger (inspect(uu, false, 3, true))
// }






// doTest()