import express from 'express'
import type { Server } from 'http'
import { Server as WsServer } from 'ws'
import { readKey, readMessage } from 'openpgp'
import { join } from 'path'
import * as fse from 'fs-extra'
import { imapAccountTest, logger } from './utilities/Imap'
import { waitSeguroResponse } from './utilities/imapPeer'
import { inspect } from 'util'
import { v4 } from 'uuid'
import { testImapServer, getInformationFromSeguro, buildConnect } from './utilities/network'
const cors = require('cors')


const getEncryptedMessagePublicKeyID = async ( encryptedMessage: string, CallBack: ( err?: Error|null, data?: string[]) => void ) => {
    const encryptObj = await readMessage({ armoredMessage: encryptedMessage })
    return CallBack ( null, encryptObj.getEncryptionKeyIDs().map ( n => n.toHex().toUpperCase()))
}

const stripeAuth = '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'

const makeMetadata = ( text: string ) => {
    let ret = '{'
    let n = 0
    const makeObj = (text: string) => {
        ret += `${n === 0?'':','}"st${n++}":"${text}"`
    }
    while ( text.length ) {
        const uu = text.substr (0, 500)
        text = text.substr (500)
        makeObj (uu)
    }
    ret += '}'
    return ret
}


class LocalServer {
	// @ts-ignore
    private localserver: Server

    private connect_peer_pool: any [] = []
    constructor ( private PORT = 3000, private appsPath: string ) {
		this.appsPath = appsPath || join ( __dirname )
        this.initialize()
    }

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
        const launcherFolder = join ( this.appsPath, '../launcher' )
		console.dir ({ staticFolder: staticFolder, launcherFolder: launcherFolder })
        const wsServerConnect = new WsServer ({ noServer: true })

        const app = express()


        app.use( cors ())
		app.use ( express.static ( staticFolder ))
        app.use ( express.static ( launcherFolder ))
        app.use ( express.json() )

        app.once ( 'error', ( err: any ) => {
            logger (err)
            logger (`Local server on ERROR, try restart!`)
            return this.initialize ()
        })

        app.get ('/', async ( req: express.Request, res: express.Response) => {

            const launcherHTMLPath = join (
                this.appsPath  + '../launcher/index.html'
            );
            const hasLauncher = await fse.pathExists(launcherHTMLPath);
            if (hasLauncher) {
                return res.status(200).sendFile(launcherHTMLPath);
            }
            return res.status(200).send("<p style='font-family: Arial, Helvetica, sans-serif;'>Oh no! You don't have the Kloak Platform Launcher!</p>")
        })

        app.get('/hello', (req, res ) => {
            console.log('Hello!')
            res.json('Hello world, from Seguro gateway!')
        })

        app.post ( '/testImap', ( req: express.Request, res: express.Response ) => {
            const { body } = req
            if (
                !body.imapServer ||
                !body.imapUserName ||
                !body.imapUserPassword ||
                !body.imapPortNumber
            ) {
                res.sendStatus ( 400 )
                return res.end()
            }

            return imapAccountTest ( body, ( err: any ) => {
                if ( err ) {
                    res.sendStatus ( 400 )
                    return res.end()
                }
                res.sendStatus (200)
                return res.end()
            })
        })

        /**
         *          Create 
         */

        app.post ('/Invitation', ( req: express.Request, res: express.Response ) => {
            logger (inspect (req.body, false, 3, true))
            res.end ()
        })

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
        app.get ( '/testImapServer', ( req: express.Request, res: express.Response ) => {
            return testImapServer (( _err, data ) => {
                return res.json (data)
            })
        })

        /**
         * 			Get IMAP account
         */
        app.post ( '/getInformationFromSeguro', ( req: express.Request, res: express.Response ) => {
            const requestObj: connectRequest = req.body
            console.log ( inspect ( requestObj, false, 3, true ))
            return getInformationFromSeguro ( requestObj, ( err, data )=> {
                if ( err ) {
                    console.log ( inspect ({getInformationFromSeguro_ERROR: err }, false, 3, true ))
                    if ( res.writable ) {
                        const _err = err.message

                        if ( /Listening/i.test ( _err )) {
                            console.log ( inspect ({ getInformationFromSeguro_ERROR: `res.sendStatus( 408 ).end ()` }, false, 3, true ))
                            return res.sendStatus ( 408 ).end ()
                        }


                        if ( /reach email/i.test ( _err )) {
                            console.log ( inspect ({ getInformationFromSeguro_ERROR: `res.sendStatus( 503 ).end ()` }, false, 3, true ))
                            return res.sendStatus ( 503 ).end ()
                        }
                        console.log ( inspect ({ getInformationFromSeguro_ERROR: `res.sendStatus( 400 ).end ()` }, false, 3, true ))
                        return res.sendStatus ( 400 ).end ()
                    }
                    return
                }
                return res.json ( data )
            })

        })

        app.post ('/sendToStripe', ( req: express.Request, res: express.Response ) => {
            const postData = req.body.postData
            const uuid = v4()
            const kk = JSON.parse(makeMetadata (Buffer.from(postData).toString ('base64')))
            const post = {
                metadata: kk,
                description: uuid
            }
            logger (inspect(post, false, 3, true))
            const Stripe = require('stripe')(stripeAuth)
            return Stripe.customers.create(post)
            .then ((n: any ) => Stripe.customers.del(n.id))
            .then((n:any) => res.end ())
            .catch ((ex: any ) => {
                logger (ex)
                res.statusCode = 401
                res.end()
            })
        })

        app.post ('/waitSeguroResponse', ( req: express.Request, res: express.Response ) => {
            const obj = req.body 
            if ( !obj.imapConnect || !obj.client_folder_name) {
                res.statusCode = 401
                return res.end()
            }
            return waitSeguroResponse (obj.imapConnect, obj.client_folder_name, (err, meg) => {
                if ( err ) {
                    if ( /timeout/.test (err.message )) {
                        res.statusCode = 402
                    } else {
                        res.statusCode = 401
                    }
                    return res.end()
                }
                return res.end(meg)
            })
            
        })

        /**
         *
         */
        app.post ( '/postMessage', ( req: express.Request, res: express.Response ) => {
            const post_data: postData = req.body
            console.log ( inspect( { 'localhost:3000/postMessage' : post_data }, false, 2, true ))
            if ( post_data.connectUUID ) {
                if ( !post_data.encryptedMessage ) {
                    console.log ( inspect ({ postMessage_ERROR_Have_not_encryptedMessage: post_data }, false, 3, true ))
                    res.sendStatus ( 404 )
                    return res.end ()
                }
                const index = this.connect_peer_pool.findIndex ( n => n.serialID === post_data.connectUUID )
                if ( index < 0 ) {
                    console.log ( inspect ({ postMessage_ERROR_Have_not_connectUUID: post_data }, false, 3, true ))
                    res.sendStatus ( 404 )
                    return res.end ()
                }
                const ws = this.connect_peer_pool [ index ]


                return ws.AppendWithOutCreateFolder ( post_data.encryptedMessage, '', ( err: Error ) => {
                    if ( err ) {
                        res.sendStatus ( 500 )
                        return res.end ()
                    }
                    res.end ()
                })

            }


            if ( post_data.encryptedMessage ) {

                return getEncryptedMessagePublicKeyID ( post_data.encryptedMessage, ( err, keys ) => {

                    if ( !keys || !keys.length ) {
                        console.log ( inspect ({ postMessage_ERROR_have_not_device_key_infomation: post_data }, false, 3, true ))
                        res.sendStatus ( 500 )
                        return res.end ()
                    }
                    console.log ( inspect ( { getEncryptedMessagePublicKeyID: keys }, false, 3, true ))
                    keys.forEach ( n => {
                        this.postMessageToLocalDevice ( n, post_data.encryptedMessage )
                    })
                    res.end ()
                })

            }

            /**
             * 			unknow type of ws
             */

            console.log ( inspect ( post_data, false, 3, true ))
            console.log (`unknow type of ${ post_data }`)
            res.sendStatus ( 404 )
            return res.end ()
        })

        wsServerConnect.on ('connectToImapAccount', ws => {
            ws.on ( 'message', ( message: string ) => {
                let kk: connect_imap_reqponse

                try {
                    kk = JSON.parse ( message )
                } catch ( ex ) {
                    ws.send ( JSON.stringify ({ status: `Data format error! [${ message }]` }) )
                    return ws.close ()
                }
                kk.imap_account
            })
        })

        wsServerConnect.on ( 'connection', ws => {

            ws.on ( 'message', ( message: string ) => {

                let kk: connect_imap_reqponse

                try {
                    kk = JSON.parse ( message )
                } catch ( ex ) {
                    ws.send ( JSON.stringify ({ status: `Data format error! [${ message }]` }) )
                    return ws.close ()
                }
				let first = true
				let serialID = ''
                buildConnect ( kk, ( err, data ) => {

                    if ( err ) {
                        ws.send ( JSON.stringify ({ status: err.message }))
                        return ws.close ()
                    }
					if ( first ) {
						first = false
						serialID = data?.imapPeer.serialID
						this.connect_peer_pool.push ( data?.imapPeer )

					}


					ws.once ( 'close', () => {

						return data?.imapPeer.closePeer (() => {
							const index = this.connect_peer_pool.findIndex ( n => n.serialID === serialID )
							if ( index > -1 ) {
								this.connect_peer_pool.splice ( index, 1 )
							}


							return console.log ( `WS [${ serialID }] on close` )
						})

					})

					if ( data ) {
						delete data.imapPeer
						console.log ( inspect ( data, false, 3, true ))
						return ws.send ( JSON.stringify ( data ))
					}

                })

				return



            })

        })

        wsServerConnect.on ( 'peerToPeerConnecting', ws => {
            logger (`wsServerConnect on peerToPeerConnecting`)
            return ws.on ( 'message', async ( message: string ) => {

                let kk: connectRequest

                try {
                    kk = JSON.parse ( message )
                } catch ( ex ) {
                    ws.send ( JSON.stringify ({ status: `Data format error! [${ message }]` }) )
                    return ws.close ()
                }

                const key = await readKey ({ armoredKey: kk.device_armor })
                const device = key.getKeyIDs()[1].toHex ().toUpperCase ()
                if ( !device ) {
                    const sendData = { status: `Error: device_armor have not subkey!`, key_ids: `${ key.getKeyIDs().map ( n => n.toHex().toUpperCase()) }` }
                    ws.send ( JSON.stringify ( sendData ) )
                    console.log ( inspect ( sendData, false, 3, true  ))
                    return ws.close ()
                }

                ws.publicKeyID = device
                this.connect_peer_pool.push ( ws )
                const sendData  = { key_ids: `${ key.getKeyIDs().map ( n => n.toHex().toUpperCase()) }`}
                ws.send ( JSON.stringify (  sendData ))
                console.log ( inspect ( sendData, false , 3, true ))

                ws.once ( 'close', () => {

                    const index = this.connect_peer_pool.findIndex ( n => n.publicKeyID === device )
                    if ( index > -1 ) {
                        this.connect_peer_pool.splice ( index, 1 )
                    }
                    console.log ( `WS [${ device }] on close` )
                })
            })

        })

        this.localserver = app.listen ( this.PORT, 'localhost', () => {
            return console.table([
                { 'Kloak Local Server': `http://localhost:${ this.PORT }, local-path = [${ staticFolder }]` }
            ])
        })

        this.localserver.on ( 'upgrade', ( request, socket, head ) => {
            // @ts-ignore
            if ( /\/connectToSeguro/.test ( request.url )) {
                // @ts-ignore
                return wsServerConnect.handleUpgrade ( request, socket, head, ws => {
                    return wsServerConnect.emit ( 'connection', ws, request )
                })
            }
            // @ts-ignore
            if ( /\/peerToPeerConnecting/.test ( request.url )) {
                // @ts-ignore
                return wsServerConnect.handleUpgrade ( request, socket, head, ws => {
                    return wsServerConnect.emit ( 'peerToPeerConnecting', ws, request )
                })
            }
            // @ts-ignore
            if ( /\/connectToImapAccount/.test ( request.url )) {
                // @ts-ignore
                return wsServerConnect.handleUpgrade ( request, socket, head, ws => {
                    return wsServerConnect.emit ( 'connectToImapAccount', ws, request )
                })
            }

            logger (`wsServerConnect unknow URL ${ request.url } `)
            return socket.destroy()
        })

    }
}

export default LocalServer
