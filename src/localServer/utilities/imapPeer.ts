import { EventEmitter } from 'events'
import { getMailSubject, getMailAttached, saveLog, qtGateImap, qtGateImapRead } from './Imap'
import { series } from 'async'
import { v4 } from 'uuid'
import { inspect } from 'util'

const resetConnectTimeLength = 1000 * 60 * 10
const pingPongTimeOut = 1000 * 10
const debug = true

export const seneMessageToFolder = ( IMapConnect: imapConnect, writeFolder: string, message: string, subject: string, createFolder: boolean, CallBack: ( err?: Error | null ) => void ) => {
    const wImap = new qtGateImap ( IMapConnect, '', false, writeFolder, debug, () => {}, true )
    let _callback = false
    //console.log ( `seneMessageToFolder !!! ${ subject }`)
    wImap.once ( 'error', err => {
        wImap.destroyAll ( err )
        if ( !_callback ) {
            CallBack ( err )
            return _callback = true
        }
    })

    wImap.once ( 'ready', () => {
        series ([
            next => {
                if ( !createFolder ) {
                    return next ()
                }
				if ( typeof wImap.imapStream?.createBox === 'function') {
					wImap.imapStream.createBox ( false, writeFolder, next )
				}
                return next ()
            },
            next => {
				if ( typeof wImap.imapStream?.appendStreamV4 === 'function' ) {
					return wImap.imapStream.appendStreamV4 ( message, subject, writeFolder, next )
				}
				return next ()
			},
            next => {
				if ( typeof wImap.imapStream?._logoutWithoutCheck === 'function') {
					return wImap.imapStream._logoutWithoutCheck ( next )
				}
				return next ()
			}
        ], err => {
            _callback = true
            if ( err ) {
                wImap.destroyAll ( err )

            }
            return CallBack ( err )
        })
    })

}


export class imapPeer extends EventEmitter {

    public domainName = ''
    private waitingReplyTimeOut: NodeJS.Timer| null = null
    public pingUuid = ''
    private doingDestroy = false

    public peerReady = false
    private makeRImap = false
    public needPingTimeOut: NodeJS.Timer| null = null

    public pinging = false
    public connected = false
    public rImap_restart = false
    public checkSocketConnectTime: NodeJS.Timer| null = null
    public serialID = v4()
	public imapEnd = false
	private _exit = false

    private restart_rImap () {

        console.dir ( 'restart_rImap' )
        if ( this.rImap_restart ) {
            return console.log (`already restart_rImap STOP!`)
        }

        this.rImap_restart = true

        return this.destroy ( null )

    }

    public checklastAccessTime () {
		if ( this.checkSocketConnectTime ) {
			clearTimeout ( this.checkSocketConnectTime )
		}
        
        return this.checkSocketConnectTime = setTimeout (() => {
            return this.restart_rImap ()
        }, resetConnectTimeLength )
    }

    private mail ( email: Buffer ) {

        
        const subject = getMailSubject ( email )
        const attr = getMailAttached ( email )

		console.log (`imapPeer new mail:\n\n${ email.toString()} this.pingUuid = [${ this.pingUuid  }]`)
		console.log ( inspect ( { subject, attr }, false, 4, true ))

        /**
         * 			PING get PONG
         */
        if ( this.pingUuid && subject === this.pingUuid ) {
            this.pingUuid = ''

            this.connected = true
            this.pinging = false
			if ( this.waitingReplyTimeOut ) {
				clearTimeout ( this.waitingReplyTimeOut )
			}
            
            return this.emit ('CoNETConnected', attr )
        }

		if ( attr.length < 1 ) {
			return console.log ( inspect ({ "skip old ping": subject }, false, 3, true ))
		}


        if ( attr.length < 100 ) {

            const _attr = attr.split (/\r?\n/)[0]

            if ( !this.connected && !this.pinging ) {
                //this.Ping ( false )
            }
			

            console.log (`\n\nthis.replyPing [${_attr }]\n\n this.ping.uuid = [${ this.pingUuid }]`)

            return this.replyPing ( subject )

        }

		console.log ( inspect ( { class_imapPeer_new_mail_return: {  attr, subject }}, false, 3, true ))
        return this.newMail ( attr, subject )

    }


    private replyPing ( uuid: string ) {
        console.log (`\n\nreplyPing = [${ uuid }]\n\n`)
        return this.AppendWithOutCreateFolder ( uuid, uuid, err => {
            if ( err ) {
                debug ? saveLog (`reply Ping ERROR! [${ err.message ? err.message : null }]`): null
            }
        })

    }

    public AppendWithOutCreateFolder ( mail: string, uuid: string, CallBack: ( err?: Error| null | undefined ) => void ) {
        const sendData = mail ? Buffer.from (mail).toString ( 'base64' ) : ''
        return seneMessageToFolder ( this.imapData, this.writeBox, sendData , uuid, false, CallBack )

    }

    private setTimeOutOfPing ( sendMail: boolean ) {
        console.trace (`setTimeOutOfPing [${ this.pingUuid }]`)
		if ( this.waitingReplyTimeOut ) {
			clearTimeout ( this.waitingReplyTimeOut )
		}
        if ( this.needPingTimeOut ) {
			clearTimeout ( this.needPingTimeOut )
		}
        
        debug ? saveLog ( `Make Time Out for a Ping, ping ID = [${ this.pingUuid }]`, true ): null

        return this.waitingReplyTimeOut = setTimeout (() => {
            debug ? saveLog ( `ON setTimeOutOfPing this.emit ( 'pingTimeOut' ) pingID = [${ this.pingUuid }] `, true ): null
            this.pingUuid = ''
            this.connected = false
            this.pinging = false
            return this.emit ( 'pingTimeOut' )
        }, pingPongTimeOut )
    }

    public Ping ( sendMail: boolean ) {

        if ( this.pinging ) {
            return console.trace ('Ping stopd! pinging = true !')
        }

        this.pinging = true

        this.emit ( 'ping' )

        this.pingUuid = v4 ()
        debug ? saveLog ( `doing ping test! this.pingUuid = [${ this.pingUuid }], sendMail = [${ sendMail }]`, ): null

        this.AppendWithOutCreateFolder ( '', this.pingUuid, err => {

            if ( err ) {
                this.pinging = false
                this.pingUuid = ''
                console.dir ( `PING this.AppendWImap1 Error [${ err.message }]`)
                return this.Ping ( sendMail )
            }
            return this.setTimeOutOfPing ( sendMail )
        })
		return
    }

    public rImap: qtGateImapRead| null = null

    public newReadImap() {

        if ( this.imapEnd || this.makeRImap || this.rImap && this.rImap.imapStream && this.rImap.imapStream.readable  ) {
            return debug ? saveLog (`newReadImap have rImap.imapStream.readable = true, stop!`, true ): null
        }

        this.rImap_restart = false
        this.makeRImap = true

        console.log ( inspect ({ newReadImap: new Error ('track create newReadImap')}, false, 3, true ) )


        this.rImap = new qtGateImapRead ( this.imapData, this.listenBox, debug, email => {
            this.mail ( email )
        })

        this.rImap.once ( 'ready', () => {
            this.emit ( 'ready' )
            this.makeRImap = this.rImap_restart = false
            //debug ? saveLog ( `this.rImap.once on ready `): null
            this.Ping ( false )
            this.checklastAccessTime ()
        })

        this.rImap.on ( 'error', err => {
            this.makeRImap = false
            debug ? saveLog ( `rImap on Error [${ err.message }]`, true ): null
            if ( err && err.message && /auth|login|log in|Too many simultaneous|UNAVAILABLE/i.test ( err.message )) {
                return this.destroy ( null )
            }

            if ( this.rImap && this.rImap.destroyAll && typeof this.rImap.destroyAll === 'function') {

                this.rImap.destroyAll ( null )
                return this.destroy ( null )
            }

        })

        this.rImap.on ( 'end', err => {

            console.log ( inspect ( { "this.rImap.on ( 'end' )": err }, false, 3, true ))
			
        })
    }

    constructor ( public imapData: imapConnect, private listenBox: string, private writeBox: string, public newMail: ( attr: string, subject: string ) => void, public exit: ( err?: Error ) => void ) {
        super ()
        this.domainName = this.imapData.imapUserName.split('@')[1]
        debug ? saveLog ( `doing peer account [${ imapData.imapUserName }] listen with[${ listenBox }], write with [${ writeBox }] `): null
        this.newReadImap ()
    }

    public closePeer ( CallBack: () => void ) {
		this.imapEnd = true
        this.AppendWithOutCreateFolder ( '', 'Close.', err => {
            if ( typeof this.rImap?.logout === 'function') {
                return this.rImap.logout ( CallBack )
            }
            return CallBack ()
        })

    }

    private cleanupImap ( err: Error | null ) {
		if ( typeof this.rImap?.removeAllListeners === 'function' ) {
			this.rImap.removeAllListeners ()
		}
        
        this.rImap = null
        this.doingDestroy = false
 
        if ( err && ! this._exit ) {
            this.exit ( err )
            return this._exit = true
        }
        console.log ( inspect ({ restart_rImap: `restart listenIMAP with restart_rImap false!`}, false, 3, true ))
        this.newReadImap ()
    }

    public destroy ( err: Error | null ) {
		if ( this.waitingReplyTimeOut ) {
			clearTimeout ( this.waitingReplyTimeOut )
		}
        if ( this.needPingTimeOut ) {
			clearTimeout ( this.needPingTimeOut )
		}
        if ( this.checkSocketConnectTime ) {
			clearTimeout ( this.checkSocketConnectTime )
		}
        
        console.log ( inspect ({ destroy: new Error ()}, false, 3, true ))

        if ( this.doingDestroy ) {
            return console.log (`destroy but this.doingDestroy = ture`)
        }

        this.doingDestroy = true
        this.peerReady = false

        if ( typeof this.rImap?.imapStream?.loginoutWithCheck ) {
            console.log ( inspect ({ destroy: `imapStream?.loginoutWithCheck()`}))
            return this.rImap?.imapStream?.loginoutWithCheck (() => {


                return this.cleanupImap ( err )

            })
        }

        return this.cleanupImap ( err )
    }

    public sendDataToANewUuidFolder ( data: string, writeBox: string, subject: string, CallBack: () => void ) {

        return seneMessageToFolder ( this.imapData, writeBox, data, subject, !this.connected, CallBack )
    }

}