import express from 'express'
import type { Server } from 'http'
import { request } from 'https'
import { join } from 'path'
import * as fse from 'fs-extra'
import { inspect } from 'util'
import { v4 } from 'uuid'
import { testImapServer } from './utilities/network'
const cors = require('cors')

const stripeAuth = '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'

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

        app.post ('/sendToStripe', ( req: express.Request, res: express.Response ) => {
            logger (`app.post /sendToStripe ${ req.socket.remoteAddress }:${ req.socket.remotePort } `)
            const postData = req.body.postData
            const uuid = v4()
            const kk = JSON.parse(makeMetadata (Buffer.from(postData).toString ('base64')))
            const postChunk = {
                metadata: kk,
                description: uuid
            }
            let count = 0
            let keyid = ''
            const Stripe = require('stripe')(stripeAuth)
            const delCustoms = () => {
                if ( keyid.length ) {
                    return Stripe.customers.del(keyid)
                    .then (() => {
                        logger (`Deleted Stripe.customer [${ keyid }]`)
                        keyid = ''
                    })
                }
                
            }
            const getUpdate = () => {
                
                return Stripe.customers.retrieve (keyid)
                .then ((customer: any ) => {
                    logger (`check update from Stripe [${ count }]`)
                    
                    const meta = customer.metadata
                    logger (inspect(meta, false, 3, true ))
                    const err = meta.error
                    if ( err ) {
                        res.statusCode = /INVITATION/i.test (err) ? 402 : 406
                        res.end()
                        return Promise.reject (new Error('end'))
                    }
                    
                    if ( meta.response ) {
                        
                        joinMetadata(meta)
                        res.json (customer.metadata.text).end()
                        return Promise.reject (new Error('end'))
                    }

                    if ( ++count > 3 ) {
                        res.statusCode = 452
                        res.end()
                        return Promise.reject (new Error('end'))
                    }
                    setTimeout (() => {
                        logger (`getUpdate with getUpdate!`)
                        getUpdate ()
                    }, 2000 )
                    return Promise.reject (new Error('loop'))
                    
                })
                .catch ((ex: Error ) => {

                    if ( /^end$/i.test (ex.message )) {
                        
                        delCustoms ()
                        
                        return logger (`catch end reject!`)
                    }
                    if ( /^loop$/i.test (ex.message )) {
                        
                        
                        return logger (`catch loop reject!`)
                    }
                    logger (`Stripe response ERROR! [${ keyid }]`)
                    logger (ex)
                    res.statusCode = 405
                    res.end()
                })
            }

            return Stripe.customers.create(postChunk)
            .then ((n: any ) => {
                keyid = n.id
                logger (inspect(n, false, 3, true))
                setTimeout (()=> {
                    logger (`getUpdate with main!`)
                    getUpdate()
                }, 3000 )
            })
            .catch ((ex: any ) => {
                logger (ex)
                logger (`Seguro response ERROR! Deleted Stripe.customer [${ keyid }]`)
                res.statusCode = 405
                res.end()
            })
            
        })

        app.post ( '/postMessage', ( req: express.Request, res: express.Response ) => {
            const post_data: postData = req.body
            console.log ( inspect ( post_data, false, 3, true ))
            console.log (`unknow type of ${ post_data }`)
            res.sendStatus ( 404 )
            return res.end ()
        })

        app.post('/newNotice', ( req: express.Request, res: express.Response ) => {
            const url: string = req.body
            return request (url, _res => {
                return _res.pipe ( res )
            })
        })

        this.localserver = app.listen ( this.PORT, 'localhost', () => {
            return console.table([
                { 'Kloak Local Server': `http://localhost:${ this.PORT }, local-path = [${ staticFolder }]` }
            ])
        })
    }
}

export default LocalServer
