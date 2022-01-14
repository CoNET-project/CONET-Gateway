/*---------------------------------------------------------------------------------------------
 *  Copyright (c) QTGate System Inc. All rights reserved.
 *  Licensed under the MIT License. See License in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { connect } from 'tls'
import { Transform } from 'stream'
import colors from 'colors/safe'
import { EventEmitter } from 'events'
import { eachSeries, series, waterfall } from 'async'
import { createHash, randomUUID } from 'crypto'
import { unlink as Unlink, stat as Stat, createReadStream, writeFile } from 'fs'
import { randomBytes } from 'crypto'
import type { TLSSocket } from 'tls'
import { exec } from 'child_process'
import { inspect } from 'util'
import { v4 } from 'uuid'

export const logger = (...argv: any ) => {
    const date = new Date ()
    let dateStrang = `[${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}]`
    return console.log ( colors.yellow(dateStrang), ...argv )
}

const MAX_INT = 9007199254740992
const ext_tinmeout = 1000 * 60 * 0.5
const debugOut = ( text: string, isIn: boolean, account: string, listenFolder = '' ) => {
    logger (colors.grey(`【${ account }${ listenFolder ? ':' + listenFolder : ''}】 ${ isIn ? '<=' : '=>'} [${ text }]`))
}
const DEBUG = true

const idleInterval = 1000 * 30
const socketTimeOut = 1000 * 10
const NoopWaitintTimeout = 100
const maxSplitSize = 1024 * 1

const parsent = ( total, temp, now ) => {
	const _parsent = temp * 100 / total
	
	if ( now > 89 ) {
		return null
	}

	if ( now > 79 ) {
		if ( _parsent > 90 ) {
			return 90
		}
		return null
	}

	if ( now > 69 ) {
		if ( _parsent > 80 ) {
			return 80
		}
		return null
	}

	if ( now > 59 ) {
		if ( _parsent > 70 ) {
			return 70
		}
		return null
	}

	if ( now > 49 ) {
		if ( _parsent > 60 ) {
			return 60
		}
		return null
	}

	if ( now > 39 ) {
		if ( _parsent > 50 ) {
			return 50
		}
		return null
	}

	if ( now > 29 ) {
		if ( _parsent > 40 ) {
			return 40
		}
		return null
	}

	if ( now > 19 ) {
		if ( _parsent > 30 ) {
			return 30
		}
		return null
	}

	if ( now > 9 ) {
		if ( _parsent > 20 ) {
			return 20
		}
		return null
	}

	if ( !now  ) {
		return 10
	}

	return null
}

class ImapServerSwitchStream extends Transform {
    public commandProcess ( text: string, cmdArray: string[], next, callback ) {}
    public name: string
    public _buffer = Buffer.alloc (0)
    public serverCommandError ( err: Error, CallBack ) {
        
        if ( CallBack ) {
            CallBack ( err )
        }
    }
    public Tag = ''
    public cmd  = ''
    public callback = false
    public doCommandCallback: (err?: Error|null, data?: any)=> void
    private _login = false
    private first = true
    private idleCallBack
    public waitLogout = false
    public waitLogoutCallBack
    private _newMailChunk = Buffer.alloc (0)
    public idleResponsrTime: NodeJS.Timer
    public canDoLogout = false
    private ready = false
    public appendWaitResponsrTimeOut: NodeJS.Timer
    public runningCommand = ''
    //private nextRead = true
    public idleNextStop :NodeJS.Timer
	private reNewCount = 0
	public MicrosoftExchange = false
	private isImapUserLoginSuccess = false
	
	private idleDoingDone = false 
	private newSwitchRet = false
	private isFetchBodyFinished = false
	private FetchBodyLength = 0
	private FetchBodyErrorCount = 0

	private currentUid = 0

    constructor ( public imapServer: qtGateImap, private exitWithDeleteBox: boolean, public debug: boolean ) {
        super ()
        /*
        if ( eachMail ) {
            this.imapServer.on ( 'nextNewMail', () => {
                this.reNewCount ++
                console.log ( `**** imapServer on nextNewMail!` )
                this.nextRead = true
                if ( this.runningCommand !== 'idle' )
                    return
                if ( this.imapServer.idleSupport ) {
                    return this.idleStop ()
                }
    
            })
        }
        */
    }

	public idleDoingDown () {
		clearTimeout ( this.idleNextStop )
		if ( this.idleDoingDone || this.runningCommand !== 'idle') {
			return logger (`idleDoingDown but this.idleDoingDone = [${ this.idleDoingDone }] or this.runningCommand !== 'idle' ${ this.runningCommand }`) 
		}
		if ( this.writable ) {
			this.idleDoingDone = true
			this.debug ? debugOut ( `DONE`, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
			return this.push (`DONE\r\n`)
		}
		return this.imapServer.destroyAll ( null )
		
	}

    private doCapability ( capability ) {
        this.imapServer.serverSupportTag = capability
        this.imapServer.idleSupport = /IDLE/i.test ( capability )
        this.imapServer.condStoreSupport = /CONDSTORE/i.test ( capability )
        this.imapServer.literalPlus = /LITERAL\+/i.test ( capability )
        const ii = /X\-GM\-EXT\-1/i.test ( capability )
        const ii1 = /CONDSTORE/i.test ( capability )
        return this.imapServer.fetchAddCom = `(${ ii ? 'X-GM-THRID X-GM-MSGID X-GM-LABELS ': '' }${ ii1 ? 'MODSEQ ' : ''}BODY[])`
    }

    public preProcessCommane ( commandLine: string, _next, callback ) {
		
		commandLine = commandLine.replace( /^ +/g,'').replace (/^IDLE\*/, '*')
		//console.log (`preProcessCommane commandLine = 【${ commandLine } 】`)
		
        const cmdArray = commandLine.split (' ')
        this.debug ? debugOut ( `${ commandLine }`, true, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null

        if ( this._login ) {
            switch ( commandLine[0] ) {

                case '+':                                    /////       +
                case 'C':
                case '*': {                                  /////       *
					
                    return this.commandProcess ( commandLine, cmdArray, _next, callback )
                }
				
                case 'I':           //  IDLE
                case 'D':           //  NODE
				case 'N':           //  NOOP
				case 'O':			//	OK
                case 'A': {                                  /////       A
                    clearTimeout ( this.appendWaitResponsrTimeOut )
					clearTimeout ( this.idleResponsrTime )
					//console.log (`preProcessCommane 【 OK 】`)
                    this.runningCommand = ''
                    
                    if ( /^ok$/i.test ( cmdArray[1] ) || /^ok$/i.test ( cmdArray[0] )) {
                        if ( typeof this.doCommandCallback === 'function') {
                            this.doCommandCallback ( null, commandLine )
                        }
                        
                        return callback ()
					}
					if ( this.Tag !== cmdArray[0] ) {
                        return this.serverCommandError ( new Error ( `this.Tag[${ this.Tag }] !== cmdArray[0] [${ cmdArray[0] }]\ncommandLine[${ commandLine }]` ), callback )
                    }
                    const errs = cmdArray.slice (2).join(' ')

                    if ( /IDLE/i.test( commandLine )) {
                        this.end ()
                    }
                    this.doCommandCallback ( new Error ( errs ))

                    return callback ()

                }
                default: {
					return this.serverCommandError ( new Error (`_commandPreProcess got switch default error! command = [${ this.Tag }] commandLine = ${ commandLine }` ), callback )
				}
                    
            }
		}
		if ( /Microsoft Exchange/i.test ( commandLine )) {

			this.MicrosoftExchange = true

			console.log (`*************** Microsoft Exchange mail server!! ********************`)
		}
        return this.login ( commandLine, cmdArray, _next, callback )
    }

    public checkFetchEnd () {

        if ( this._buffer.length <= this.imapServer.fetching ) {
            return null
        }
        
        const body = this._buffer.slice ( 0, this.imapServer.fetching )
        const uu = this._buffer.slice ( this.imapServer.fetching )
        
        let index1 = uu.indexOf ('\r\n* ')
        let index = uu.indexOf ('\r\nA') 

        index = index < 0 || index1 > 0 && index > index1 ? index1 : index

        if ( index < 0 )
            return null

        this._buffer = uu.slice ( index + 2 )
        this.imapServer.fetching = 0
        return body
        
    }

	private checkLine ( next ) {
		// /console.log (`__CallBack\n\nthis._buffer = [${ this._buffer.toString() }] [${ this._buffer.toString ('hex')}]`)

		let index = -1
		/**
		 * 		check line
		 */
		if ( !this._buffer.length || ( index = this._buffer.indexOf ( '\r\n' )) < 0 ) {
			
				//      this is for IDLE do DONE command
				//		this.emit ( 'hold' )
			if ( ! this.callback ) {
				this.callback = true
				return next()
			}
			
			//      did next with other function
			return
		}

		const _buf = this._buffer.slice ( 0, index )
		
		return this.preProcessCommane ( _buf.toString (), next, () => {
			//		delete '\r\n'
			this._buffer = this._buffer.slice ( index + 2 )
			return this.doLine ( next )
		})
	}

	private doLine ( next ) {
		if ( this.imapServer.fetching ) {
			//console.log ('************************************** ImapServerSwitchStream _transform chunk **************************************')
			//console.log ( this._buffer.toString ())
			//console.log ('************************************** ImapServerSwitchStream _transform chunk **************************************')
			const _buf1 = this.checkFetchEnd ()
			
			//  have no fill body must goto next chunk
			if ( ! _buf1 ) {
				
				this.callback = true
				return next ()
			}
			
			//console.log ('************************************** ImapServerSwitchStream _transform chunk **************************************')
			//console.log ( `\n\n_buf1.length = [${ _buf1.length }]\n\n` )
			//console.log ( _buf1.toString ())
			
			this.isFetchBodyFinished = true
			logger ( colors.bgGreen(`doLine Fetch Body length [${ _buf1.length }]`))
			this.imapServer.newMail ( _buf1 )
			
		}

		return this.checkLine ( next )
	}

    public _transform ( chunk: Buffer, encoding, next ) {
        this.callback = false
        //console.log ('************************************** ImapServerSwitchStream _transform chunk **************************************')
        //console.log ( chunk.toString ())
        //console.log ('************************************** ImapServerSwitchStream _transform chunk **************************************')
        this._buffer = Buffer.concat ([ this._buffer, chunk ])
        return this.doLine ( next )
    }

    private capability () {

        this.doCommandCallback = ( err ) => {
			if (err) {
				logger (inspect(`capability error`))
				return this.imapServer.destroyAll (err)
			}
            if ( this.imapServer.listenFolder ) {
                
                return this.openBox ( true, ( err, newMail ) => {
                    
                    if ( err ) {
                        console.log (`********************************this.openBox CallBack err= [${ err }] ***************************************\n\n`)
                        return this.imapServer.destroyAll( err )
					}
					this.imapServer.emit ( 'openBoxReady' )
                    if ( /^inbox$/i.test ( this.imapServer.listenFolder )) {
                        
                        return this.canDoLogout = this.ready = true
                    }

                    if ( newMail ) {
                        return this.doNewMail ()
					}
					
					this.canDoLogout = true
					
                    return this.idleNoop ()
                })
            }
            
            this.canDoLogout = this.ready = true
            this.imapServer.emit ( 'ready' )
        }

        this.commandProcess = ( text: string, cmdArray: string[], next, callback ) => {
            switch ( cmdArray[0] ) {
                case '*': {                                  /////       *
                    //          check imap server is login ok
                    if ( /^CAPABILITY$/i.test ( cmdArray [1] ) && cmdArray.length > 2 ) {
                        const kkk = cmdArray.slice (2).join (' ')
                        this.doCapability ( kkk )
                    }
                    return callback ()
                }
                default:
                return callback ()
            }
        }

        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } CAPABILITY`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null

        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n')
        }
        console.log (`\n\n*************************** imap capability error! this.writable === false doing destroyAll ()*************************** \n\n`)
        return this.imapServer.destroyAll (null)
    }

    public doNewMail () {
        //saveLog ( `ImapServerSwitchStream [${ this.imapServer.listenFolder }] doNewMail!`)
        this.reNewCount --
		this.canDoLogout = true
		this.newSwitchRet = false
                
		this.canDoLogout = false
		this.runningCommand = 'doNewMail'

		return this.seachUnseen (( err, newMailIds: string, havemore ) => {
			if ( err ) {
				return this.imapServer.destroyAll ( err )
			}
			if (! newMailIds || ! newMailIds.length ) {
				
				this.runningCommand = ''
				return this.idleNoop()
			}
			
			let haveMoreNewMail = false
		

			const uids = newMailIds.split (',')
			const newMail: number [] = []
			uids.forEach (n => {
				const nn = parseInt (n)
				if ( nn > this.currentUid ) {
					newMail.push (nn)
					this.currentUid = nn
				}
			})

			return eachSeries ( newMail, ( n ,next ) => {
				this.FetchBodyErrorCount = 0
				return this.fetch ( n, next )
			}, ( err ) => {
				return series ([
					next => this.flagsDeleted ( newMailIds, next ),
					next => this.expunge ( next )
				], ( err, newM ) => {
					//console.log (`\n\ndoNewMail success!\n\n`)
					this.runningCommand = ''
					if ( err ) {
						logger ( `ImapServerSwitchStream [${ this.imapServer.listenFolder }] doNewMail ERROR! [${ err.message }]`)
						return this.imapServer.destroyAll ( err )
					}

					if ( haveMoreNewMail || havemore || this.newSwitchRet || newM ) {
						console.log (`\n\ndoNewMail again!\n\n`)
						return this.doNewMail ()
					}
					//console.log (`\n\ndoNewMail call idleNoop() !\n\n`)
					return this.idleNoop()
				})
				
			})
			
			
        })
        
        
    }

    public idleNoop ( CallBack = null) {
		if ( this.waitLogout || this.imapServer.exit_when_idle ) {
			console.log (`\n\n******************** idleNoop this.waitLogout === [true] ***********************\n\n` )
			return this.logout_process ()
		}

		this.idleDoingDone = false
        this.canDoLogout = true

		this.newSwitchRet = false
		this.runningCommand = 'idle'
		
		if ( ! this.ready ) {
			this.ready = true
			this.imapServer.emit ( 'ready' )
		}
		if ( CallBack ) {
            this.idleCallBack = CallBack
        }

		this.doCommandCallback = ( err => {

			if ( err ) {
				console.log (`this.doCommandCallback error`, err )
				return this.imapServer.destroyAll ( null )
			}
			//this.debug ? debugOut ( 'IDLE this.doCommandCallback', false, this.imapServer.IMapConnect.imapUserName ) : null
			this.runningCommand = ''
			
			if ( this.idleCallBack ) {
				//logger (`idleNoop ----->     this.idleCallBack!!!`)
                //@ts-ignore
				this.idleCallBack ()

				return this.idleCallBack = null
			}
			//console.log(`IDLE DONE newSwitchRet = [${newSwitchRet}] nextRead = [${this.nextRead}]`)
			if ( this.newSwitchRet || this.reNewCount > 0 ) {
                if ( !CallBack ) {
                    return this.doNewMail ()
                }
                //@ts-ignore
                return CallBack ()
			}
			
			if ( this.imapServer.idleSupport ) {

				return this.logout_process ()
			}
			
			setTimeout (() => {
				if ( !this.runningCommand ) {
					return this.idleNoop ()
				}
				
			}, NoopWaitintTimeout )

		})
        if ( !CallBack ) {
            if ( this.imapServer.idleSupport ) {
                this.idleNextStop = setTimeout (() => {
                    this.idleDoingDown ()
                }, idleInterval )
            }
        }
		
			
		this.commandProcess = (  text: string, cmdArray: string[], next, callback ) => {
			
			let kk = cmdArray[0]
			if ( kk.length > 1 ) {
				kk = kk[ length - 1 ]
			}
			//console.log (`IDLE commandProcess ! =====================> cmdArray[0] [${ cmdArray[0] }] kk [${ kk }]`)
			switch ( kk ) {
				
				case '+':
				case '*': {
					/**
					 * 			Seupport Microsoft Exchange IMAP4
					 */
					if ( /BYE Connection closed/i.test ( cmdArray[0] )) {
						return this.imapServer.destroyAll ( new Error (`ERROR: BYE Connection closed `))
					}

					clearTimeout ( this.idleResponsrTime )
					if ( /^RECENT$|^FETCH$|^EXISTS$|^EXPUNGE$/i.test ( cmdArray[2] )) {
						
						this.newSwitchRet = true
					}
					if ( /^RECENT$|^EXISTS$|^FETCH$/i.test ( cmdArray[2] ) || this.waitLogout ) {
						if ( this.imapServer.idleSupport ) {
							this.idleDoingDown()
						}
						
					}
					
					return callback ()
				}
				default:
				return callback ()
			}
		}
		
		const name = this.imapServer.idleSupport ? 'IDLE' : 'NOOP'
		this.Tag = `${ name }`
		this.cmd = `${ this.Tag } ${ name }`
		
		//const cc = Crypto.randomBytes (10).toString('base64')
		
		this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
		if ( this.writable ) {
			return this.push ( this.cmd + '\r\n')
		}
		
		return this.imapServer.destroyAll ( null )
        
    }

    private login ( text: string, cmdArray: string[], next, _callback ) {
		//console.log ( `login process!` )
		let loginTimeOut
		const loginTime = 1000 * 30
        this.doCommandCallback = ( err ) => {
            clearTimeout ( loginTimeOut )
            if ( ! err ) {
                this.isImapUserLoginSuccess = true
                return this.capability ()
            }
            
            return this.imapServer.destroyAll ( err )
        }

        this.commandProcess = (  text: string, cmdArray: string[], next, callback ) => {
			
            switch ( cmdArray[0] ) {
                case '+':
                case '*': {
                    return callback ()
                }
                default:
                return callback ()
            }
        }
        
        switch ( cmdArray[0] ) {
            
            case '*': {                                  /////       *
                //          check imap server is login ok
                if ( /^ok$/i.test ( cmdArray [1]) && this.first ) {
                    this.first = false
                    this.Tag = `A${ this.imapServer.TagCount }`
                    this.cmd = `${ this.Tag } LOGIN "${ this.imapServer.IMapConnect.imapUserName }" "${ this.imapServer.IMapConnect.imapUserPassword }"`
                    this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
                    this.callback = this._login = true
                    if ( this.writable ) {
						loginTimeOut = setTimeout (() => {
							logger (inspect(`loginTimeOut ERROR! this.imapServer.destroyAll ( new Error ('Login timeout!') )`, false, 3, true ))
							return this.doCommandCallback (new Error ('login timeout!'))
						}, loginTime )
						return next ( null, this.cmd + '\r\n' )
					}
                    
                    return next (new Error ('!writable'))
                }
                //
                return _callback ()
            }
            default:{
				return this.serverCommandError ( new Error ( `login switch default ERROR!` ), _callback )
			}
            
            
        }

    }

    public createBox ( openBox: boolean, folderName: string, CallBack ) {
		
        this.doCommandCallback = ( err ) => {
			
            if ( err ) {
                let errMessage = ''
                if (typeof err === 'string') {
                    errMessage = err
                } else {
                    errMessage = err.message
                }


                /**
				 * 		support iCloud mail server
				 * 		The Box success created but still return UNAVAILABLE ERROR
				 */
                if ( /exists|UNAVAILABLE/i.test ( errMessage )) {
                    if ( openBox ) {
                        return this.openBox ( false, CallBack )
                    }
                    return CallBack ()
                }
				return CallBack ( err )
			}
            
            if ( openBox ) {
                return this.openBox ( false, CallBack )
            }
            return CallBack ()
		}
		
        this.commandProcess = ( text: string, cmdArray: string[], next, callback ) => {

            return callback ()
        }
        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } CREATE "${ folderName }"`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n')
        }
        
        return this.imapServer.destroyAll ( null )

    }

    public openBox ( create: boolean, CallBack ) {
        this.newSwitchRet = false

        this.doCommandCallback = ( err ) => {
            if ( err ) {
				if ( /exist|not found|unknown folder/i.test ( err.message )) {
					if ( create ) {
						return this.createBox ( true, this.imapServer.listenFolder, CallBack )
					}
				}
                
                return CallBack ( err )
                
            }
            return CallBack ( null, this.newSwitchRet )
        }

        this.commandProcess = ( text: string, cmdArray: string[], next, _callback ) => {
            switch ( cmdArray[0] ) {
                case '*': {
                    if ( /^EXISTS$/i.test ( cmdArray [2])) {
                        if ( parseInt ( cmdArray[1])) {
                            this.newSwitchRet = true
                        }
                    }
                    return _callback ()
                }
                default:
                return _callback ()
            }
        }

        const conText = this.imapServer.condStoreSupport ? ' (CONDSTORE)' : ''
        
        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } SELECT "${ this.imapServer.listenFolder }"${ conText }`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n')
        }
        
        this.imapServer.destroyAll ( null )
    }

    public _logout ( callabck ) {
        if ( !this.isImapUserLoginSuccess ) {
            return callabck ()
        }
        
        this.doCommandCallback = callabck
        clearTimeout ( this.idleResponsrTime )

        this.commandProcess = ( text: string, cmdArray: string[], next, _callback ) => {
            this.isImapUserLoginSuccess = false
            return _callback ()

        }

        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } LOGOUT`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n')
        }
        if ( callabck && typeof callabck === 'function') {
            
            return callabck()
        }
        
    }

    public append ( text: string = '', subject: string, CallBack ) {
        if ( this.waitLogout ) {
            return this.logout_process ()
		}
		if ( typeof subject === 'function' ) {
			CallBack = subject
			subject = ''
		}

        this.canDoLogout = false
        this.doCommandCallback = ( err, info: string ) => {
			if ( err ) {
				if ( /TRYCREATE/i.test( err.message )) {
					return this.createBox ( false, this.imapServer.writeFolder, err1 => {
						if ( err1 ) {
							return CallBack ( err1 )
						}
						return this.append ( text, subject, CallBack )
					})
				}

				if ( /Unexpected/i.test ( err.message )) {
					return this.append ( text, subject, CallBack )
				}

			}

            this.canDoLogout = true
            return CallBack ()
        }
        let out = `Date: ${ new Date().toUTCString()}\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment\r\nMessage-ID:<${ randomUUID() }@>${ this.imapServer.domainName }\r\n${ subject ? 'Subject: '+ subject + '\r\n' : '' }Content-Transfer-Encoding: base64\r\nMIME-Version: 1.0\r\n\r\n${ text }`

        this.commandProcess = ( text1: string, cmdArray: string[], next, _CallBack ) => {
            switch ( cmdArray[0] ) {
                case '*':
                case '+': {
                    if ( ! this.imapServer.literalPlus && out.length && ! this.callback ) {
                        //this.debug ? debugOut ( out, false, this.imapServer.IMapConnect.imapUserName ) : null
                        this.callback = true
                        next ( null, out + '\r\n' )
                    }
                    return _CallBack ()
                }
                default:
                return _CallBack ()
            }
        }

        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `APPEND "${ this.imapServer.writeFolder }" {${ out.length }${ this.imapServer.literalPlus ? '+' : ''}}`
        this.cmd = `${ this.Tag } ${ this.cmd }`
        const time = out.length / 1000 + ext_tinmeout
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( !this.writable ) {

            return CallBack ( new Error ('IMAP this.writable === fales '))
        }
            
        this.push ( this.cmd + '\r\n' )

        this.appendWaitResponsrTimeOut = setTimeout (() => {
            return this.imapServer.socket.end ()
        }, time )
        //console.log (`*************************************  append time = [${ time }] `)
        if ( this.imapServer.literalPlus ) {
			
            this.push ( out + '\r\n' )
            out = ''
        }
            
	}
	
	public id ( CallBack ) {
		if ( !this.isImapUserLoginSuccess ) {
            return CallBack ()
        }
        
        this.doCommandCallback = CallBack
        clearTimeout ( this.idleResponsrTime )
        this.commandProcess = ( text: string, cmdArray: string[], next, _callback ) => {
            
            _callback ()

        }
        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } ID ("name" "Apple-Mail" "version" "r5671" "vendor" "Freron Software" "contact" "info@apple.com")`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n')
        }
        if ( CallBack && typeof CallBack === 'function') {
            
            return CallBack()
        }
	}

	/**
	 * 
	 * 		Append big message to Microsoft.Exchange.Imap4.Imap4Server issue
	 * 		* BAD Command Error. 10
	 * 		https://social.msdn.microsoft.com/Forums/office/en-US/4b3bcfe4-9ead-455f-a994-99ba9abe40c7/exchangeonlineimapstrange-behavior-from-imap-server?forum=exchangesvrdevelopment
	 */

    public appendStreamV3 ( filename: string, subject: string = '', folderName: string, unlink: boolean, CallBack ) {
		
        
		this.doCommandCallback = ( err ) => {
			//this.debug ? saveLog (`appendStreamV2 doing this.doCommandCallback`) : null
			clearTimeout ( this.appendWaitResponsrTimeOut )
			this.canDoLogout = true
			if ( err ) {
				if ( /TRYCREATE/i.test( err.message )) {
					return this.createBox ( false, this.imapServer.writeFolder, err1 => {
						if ( err1 ) {
							return CallBack ( err1 )
						}
						return this.appendStreamV3 ( filename, subject, folderName, unlink, CallBack )
					})
				}

				if ( /Unexpected/i.test ( err.message )) {
					return this.appendStreamV3 ( filename, subject, folderName, unlink, CallBack )
				}
				
				return CallBack ( err )
			}
			
			if ( unlink ) {
				return Unlink ( filename, () => {
					return CallBack ( err )
				})
			}
			return CallBack ( err )
		}
		
		return Stat ( filename,( err, stat ) => {
            if ( err ) {
                return this.doCommandCallback ( err )
			}

			const doSend = () => {
				
	
				const References = `<${ randomUUID().toLocaleUpperCase() }@${ this.imapServer.domainName }>`
				let out = `${ subject ? 'Subject: '+ subject + '\r\n' : '' }Message-ID: ${ References }\r\nMIME-Version: 1.0\r\nDate: ${ new Date().toUTCString()}\r\nContent-Type: application/octet-stream\r\n\r\n`
				const _length = out.length + stat.size // + ( hotmailServer ? 6 + boundary.length : 0 )
                
				const writeData = ( next, CallBack ) => {
                    console.log (`\n\nwriteData()\n\n`)
                    if ( !stat.size ) {
						if ( typeof CallBack === 'function') {
							return CallBack ()
						}
                        return
                    }
					const fileReadStream = createReadStream ( filename, { highWaterMark: maxSplitSize, encoding: 'utf8' })
					let length = 0
					let drain = false
					let first = true
					let process = 0
					
					const write = () => {
						if ( drain ) {
							return 
						}

						drain = true
						const chunk = fileReadStream.read ()

						if ( chunk === null ) {
                            
                            const eof = `\r\n`
                            
                            //DEBUG ? console.log ( `chunk === null, stat.size = [${ _length }] total write = [${ length + out.length }]`): null
                            this.push ( eof )
                            if ( typeof next === 'function') {
                                next ()
                            }
                        
                            if ( typeof CallBack  === 'function' ) {
                                CallBack ()
                            }
                            return
                        }

						if ( first ) {
							this.push ( out )
							//this.debug ? debugOut ( out, false, this.imapServer.IMapConnect.imapUserName ) : null
							first = false
						}

						length += chunk.length
						
						const _parsent = parsent ( _length, length, process )

						if ( _parsent ) {
							process = _parsent
							//DEBUG ? console.log (`socket.write [${ chunk.length }] blance = [${ _length - length }] process = [${ process }]`) : null
						}

						if ( !this.imapServer.socket.writable ) {
							return next ( new Error (`this.imapServer.socket.writable === false!`))
						}

						if ( this.imapServer.socket.write ( chunk )) {
							return drain = false
						}
						
						return this.imapServer.socket.once ( 'drain', () => {
							//DEBUG ? console.log (`socket.write on DRAIN [${ chunk.length }] blance = [${ _length - length }] process = [${ process }]`) : null
							drain = false
							return write ()
						})
					}

					fileReadStream.on ( 'readable', () => {
						
						write ()
						
					})
	
					fileReadStream.once ( 'error', err => {
						return this.doCommandCallback ( err )
					})
	
					
				}
	
				this.commandProcess = ( text1: string, cmdArray: string[], next, _callback ) => {
					switch ( cmdArray[0] ) {
						
						case '+': {
							return writeData ( null, _callback )
						}
						default:
						return _callback ()
					}
				}
	
				
				//DEBUG ? console.log (`mail header length [${ out.length }] + attached file [${ stat.size }] = [${ _length }]`) : null
				this.Tag = `A${ this.imapServer.TagCount }`
				this.cmd = `APPEND ${ folderName } {${ _length }${ this.imapServer.literalPlus ? '+' : ''}}`
				this.cmd = `${ this.Tag } ${ this.cmd }`
				const _time = _length / 1000 + ext_tinmeout
				
				if ( !this.writable ) {
                    return CallBack ( new Error ('IMAP this.writable === false'))
					
				}
				
				this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
				
				this.push ( this.cmd + '\r\n' )
                
				this.appendWaitResponsrTimeOut = setTimeout (() => {
					
					this.doCommandCallback ( Error ('appendStreamV3 mail serrver write timeout!'))
					return this.end ()
				}, _time )
	
				//console.log (`*************************************  append time = [${ time }] `)
				if ( this.imapServer.literalPlus ) {
	
					writeData ( null, null )
					
				}
			}

			if ( this.MicrosoftExchange && stat.size > 1000 ) {
				const cmd = `sed -e 's/$/\\r/' ${ filename } > ${ filename }.tmp && mv ${ filename }.tmp ${ filename }`
				//console.log (`Microsoft Exchange mail server!! doing new line to LRLF\n${ cmd }`)
				
				return exec ( cmd, err => {
					if ( err ) {
						return CallBack ( err )
					}
					return Stat ( filename,( err, _stat ) => {
						if ( err ) {
							return CallBack ( err )
						}
						stat = _stat
						return doSend ()
					})
				})
			}

			return doSend ()
			
        })
    }

    public seachUnseen ( callabck ) {
        let newSwitchRet = ''
        let moreNew = false
        this.doCommandCallback = ( err ) => {
            if ( err )
                return callabck ( err )
            return callabck ( null, newSwitchRet, moreNew )
        }
        this.commandProcess = ( text: string, cmdArray: string[], next, _callback ) => {
            switch ( cmdArray[0] ) {
                case '*': {
                    if ( /^SEARCH$/i.test ( cmdArray [1] ) ) {
                        const uu1 = cmdArray[2] && cmdArray[2].length > 0 ? parseInt ( cmdArray[2] ) : 0
                        if ( cmdArray.length > 2 && uu1 ) {
                            if ( ! cmdArray [ cmdArray.length - 1 ].length ) {
								cmdArray.pop ()
							}
                            
                            
                            const uu = cmdArray.slice ( 2 ).join ( ',' )
                            if ( /\,/.test ( uu [ uu.length - 1 ]) ) {
								uu.substr ( 0, uu.length - 1 )
							}
							
							
                            newSwitchRet =  uu
                            moreNew = cmdArray.length > 3
                            return _callback ()
                        }
                    }
                    
                    return _callback ()
				}
				
                default:
                return _callback ()
            }
        }

        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } UID SEARCH ALL`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
			
            return this.push ( this.cmd + '\r\n')
        }
            
        return this.imapServer.destroyAll ( null )
    }

    public seachAll ( CallBack ) {
        let newSwitchRet = ''
        let moreNew = false
        this.doCommandCallback = ( err ) => {
            if ( err ) {
				return CallBack ( err )
			}
                
            return CallBack ( null, newSwitchRet, moreNew )
		}
		
        this.commandProcess = ( text: string, cmdArray: string[], next, _callback ) => {
            
            switch ( cmdArray[0] ) {
                case '*': {
                    if ( /^SEARCH$/i.test ( cmdArray [1] ) ) {
                        const uu1 = cmdArray[2] && cmdArray[2].length > 0 ? parseInt ( cmdArray[2] ) : 0
                        if ( cmdArray.length > 2 && uu1 ) {
                            if ( ! cmdArray [ cmdArray.length - 1 ].length )
                                cmdArray.pop ()
                            
                            const uu = cmdArray.slice ( 2 ).join ( ',' )
                            if ( /\,/.test ( uu [ uu.length - 1 ]) )
                                uu.substr ( 0, uu.length - 1 )
                            
                            newSwitchRet =  uu
                            moreNew = cmdArray.length > 3
                        }
                    } 
                    return _callback ()
                }
                default:
                return _callback ()
            }
        }

        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } UID SEARCH ALL`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n')
        }
            
        return this.imapServer.destroyAll ( null )
    }

    public fetch ( fetchNum, callback ) {
		this.imapServer.fetching = this.FetchBodyLength = 0
        this.doCommandCallback = ( err ) => {
			if ( err ) {
				
				//			Support iCLoud Fetch issue
				if ( this.isFetchBodyFinished ) {
					console.log (`\n\n\nfetch finished but still have a error\n`, err )
					return callback ( null, this.newSwitchRet )
				}
				return callback (err)
			}

			//				Support Zoho Forward-looking IDLE 
			if ( !this.FetchBodyLength ) {
				return setTimeout (() => {
					logger ( colors.red(`Fetch did not finished FetchBodyErrorCount [${ this.FetchBodyErrorCount ++ }]`))
					return this.fetch (fetchNum, callback)
				}, 500)
			}
            return callback ( null, this.newSwitchRet )
        }
        
        this.newSwitchRet = false

        this.commandProcess = ( text1: string, cmdArray: string[], next, _callback ) => {
            switch ( cmdArray[0] ) {
                case '*': {
                    if ( /^FETCH$/i.test ( cmdArray [ 2 ] )) {
                        if ( /\{\d+\}/.test ( text1 )) {
							const bodyLength = parseInt ( text1.split('{')[1].split('}')[0])
                            this.imapServer.fetching = this.FetchBodyLength = bodyLength
                        }
						return _callback ()
                    }
                    if ( /^EXISTS$/i.test ( cmdArray[2]) && parseInt ( cmdArray[1]) > 0 ) {
                        this.newSwitchRet = true
                    }
                    return _callback ()
                }
                default:
                return _callback ()
            }
        }

        this.cmd = `UID FETCH ${ fetchNum } ${ this.imapServer.fetchAddCom }`
        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } ${ this.cmd }`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n' )
        }
            
        return this.imapServer.logout ()
    }

    private deleteBox ( CallBack ) {
        this.doCommandCallback = CallBack
        this.commandProcess = ( text1: string, cmdArray: string[], next, _callback ) => {
			switch ( cmdArray[0] ) {
                case '*': {
                    if ( /^FETCH$/i.test ( cmdArray [ 2 ] )) {
                        if ( /\{\d+\}/.test ( text1 )) {
                            this.imapServer.fetching = parseInt ( text1.split('{')[1].split('}')[0] )
                        }
                    }
                    if ( /^EXISTS$/i.test ( cmdArray[2]) && parseInt (cmdArray[1]) > 0 ) {
                        this.newSwitchRet = true
                    }
                    return _callback ()
                }
                default:
                return _callback ()
            }
        }
        this.cmd = `DELETE "${ this.imapServer.listenFolder }"`
        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } ${ this.cmd }`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n' )
        }
            
        return this.imapServer.destroyAll ( null )
    }

    public deleteAMailBox ( boxName: string, CallBack ) {
        
        this.doCommandCallback = err => {

            return CallBack ( err )
        }
        this.commandProcess = ( text1: string, cmdArray: string[], next, _callback ) => {
            return _callback ()
        }
        this.cmd = `DELETE "${ boxName }"`
        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } ${ this.cmd }`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n' )
        }
            
        return this.imapServer.destroyAll ( null )
    }

    public logout ( callback: () => void ) {
        
        this.waitLogoutCallBack = callback

        if ( this.waitLogout ) {
            return 
        }
            
		this.waitLogout = true
		
		if ( !this.imapServer.listenFolder ) {
			return this.logout_process ()
		}
		return this.idleDoingDown ()
    }

    public logout_process () {
		
		const CallBack = () => {
			if ( this.waitLogoutCallBack && typeof this.waitLogoutCallBack === 'function') {
                return this.waitLogoutCallBack ()
            }
		}

        if ( ! this.writable ) {
            console.trace ( `logout_process [! this.writable] run return callback ()`)
            return CallBack ()
            
        }
            
        const doLogout = () => {
            return this._logout ( CallBack )
		}
		
        if ( this.imapServer.listenFolder && this.runningCommand ) {
            logger  (`logout_process [this.imapServer.listenFolder && this.runningCommand], doing this.idleStop ()`)
            this.idleCallBack = doLogout
            return this.idleDoingDown ()
        }

        doLogout ()
	}
	
    public flagsDeleted ( num: string, CallBack ) {
        this.doCommandCallback = err => {
            //saveLog ( `ImapServerSwitchStream this.flagsDeleted [${ this.imapServer.listenFolder }] doing flagsDeleted success! typeof CallBack = [${ typeof CallBack }]`)
            return CallBack ( err )
        }
        this.commandProcess = ( text1: string, cmdArray: string[], next, _callback ) => {
            return _callback ()
        }
        this.cmd = `UID STORE ${ num } FLAGS.SILENT (\\Deleted)`
        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } ${ this.cmd }`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n' )
        }
            
        return this.imapServer.destroyAll ( null )
    }

    public expunge ( CallBack ) {

        let newSwitchRet = false
        this.doCommandCallback = err => {
            
            return CallBack ( err, newSwitchRet )
        }
        this.commandProcess = ( text: string, cmdArray: string[], next , _callback ) => {
            switch ( cmdArray[0] ) {
                case '*': {
                    
                    if ( /^RECENT$|^EXPUNGE$|^EXISTS$/i.test ( cmdArray[2])) {
                        newSwitchRet = true
                    }
                    return _callback ()
                }
                default:{
					return _callback ()
				}
                	
            }
        }
        
        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } EXPUNGE`
		this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
		//console.trace (`expunge`)
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n')
        }
            
        return this.imapServer.destroyAll ( null )
    }

    public listAllMailBox ( CallBack ) {
        let boxes: string[] = []
        this.doCommandCallback = ( err ) => {
            if ( err )
                return CallBack ( err )
            return CallBack ( null, boxes )
        }
        this.commandProcess = ( text: string, cmdArray: string[], next, _callback ) => {
            switch ( cmdArray[0] ) {
                case '*': {
                    
                    if ( /^LIST/i.test ( cmdArray [1] ) ) {
                        boxes.push ( cmdArray[2] + ',' + cmdArray[4] )
                    } 
                    return _callback ()
                }
                default:
                return _callback ()
            }
        }

        this.Tag = `A${ this.imapServer.TagCount }`
        this.cmd = `${ this.Tag } LIST "" "*"`
        this.debug ? debugOut ( this.cmd, false, this.imapServer.IMapConnect.imapUserName, this.imapServer.listenFolder ) : null
        if ( this.writable ) {
            return this.push ( this.cmd + '\r\n')
        }
            
        return this.imapServer.destroyAll ( null )
    }

	public appendStreamV4 ( Base64Data: string = '', subject = '', folderName: string, CallBack ) {

        if ( !Base64Data ) {
            Base64Data = ''
        }

		console.log (`appendStreamV4 Base64Data = [${ Base64Data }]`)

        this.doCommandCallback = ( err, response: string ) => {
            //this.debug ? saveLog (`appendStreamV2 doing this.doCommandCallback`) : null
            clearTimeout ( this.appendWaitResponsrTimeOut )

            if ( err ) {
                if ( /TRYCREATE/i.test( err.message )) {
                    return this.createBox ( false, this.imapServer.writeFolder, err1 => {
                        if ( err1 ) {
                            return CallBack ( err1 )
                        }
                        return this.appendStreamV4 ( Base64Data, subject, folderName, CallBack )
                    })
                }
				if ( /Unexpected/i.test ( err.message )) {
					return this.appendStreamV4 ( Base64Data, subject, folderName, CallBack )
				}
                return CallBack ( err )
            }
			let code = response && response.length ? response.split('[')[1]: null
			if ( code ) {
				
				code = code.split (' ')[2]
				//console.log ( `this.doCommandCallback\n\n code = ${ code } code.length = ${ code.length }\n\n` )
				if ( code ) {
					return CallBack( null, parseInt ( code ))
				}
			}
            CallBack ()
        }


        const out = `Date: ${ new Date().toUTCString()}\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment\r\nMessage-ID:<${ randomUUID() }@>${ this.imapServer.domainName }\r\n${ subject ? 'Subject: '+ subject + '\r\n' : '' }Content-Transfer-Encoding: base64\r\nMIME-Version: 1.0\r\n\r\n`
        
		this.commandProcess = ( text1: string, cmdArray: string[], next, _callback ) => {
			switch ( cmdArray[0] ) {
				case '*':
				case '+': {
					if ( ! this.imapServer.literalPlus && out.length && ! this.callback ) {
						
						this.callback = true
						
						//this.debug ? debugOut ( out, false, this.imapServer.IMapConnect.imapUserName ) : null
						next ( null, out + Base64Data + '\r\n' )
					}
					return _callback ()
				}
				default:
				return _callback ()
			}
		}

		const _length = out.length + Base64Data.length
		this.Tag = `A${ this.imapServer.TagCount }`
		this.cmd = `APPEND "${ folderName }" {${ _length }${ this.imapServer.literalPlus ? '+' : ''}}`
		this.cmd = `${ this.Tag } ${ this.cmd }`
		const _time = _length + 1000 * 60
		this.debug ? debugOut ( this.cmd, false, this.imapServer.listenFolder || this.imapServer.imapSerialID ) : null
		if ( !this.writable ) {
			return this.doCommandCallback ( new Error ('! imap.writable '))
		}
			
		this.push ( this.cmd + '\r\n' )

		this.appendWaitResponsrTimeOut = setTimeout (() => {
			
			return this.doCommandCallback( new Error ('appendStreamV3 mail serrver write timeout!'))
				
		}, _time )

		//console.log (`*************************************  append time = [${ time }] `)
		if ( this.imapServer.literalPlus ) {
			
			
			//this.debug ? debugOut ( out + Base64Data + '\r\n', false, this.imapServer.listenFolder || this.imapServer.imapSerialID ) : null
			this.push ( out )
			this.push ( Base64Data + '\r\n' )
			
		}
        
        
        
        
    }

	public _logoutWithoutCheck ( CallBack ) {
        //console.trace (`doing _logout typeof CallBack = [${ typeof CallBack }]`)
        if ( !this.isImapUserLoginSuccess ) {
            return CallBack ()
        }

        this.doCommandCallback = ( err, info: string ) => {
            
            return CallBack ( err )
		}
		
        clearTimeout ( this.idleResponsrTime )
        this.commandProcess = ( text: string, cmdArray: string[], next, _callback ) => {
            //console.log (`_logout doing this.commandProcess `)
            this.isImapUserLoginSuccess = false
            return _callback ()
		}
		
        this.Tag = `A${ this.imapServer.TagCount }`
		this.cmd = `${ this.Tag } LOGOUT`
		
        this.debug ? debugOut ( this.cmd, false, this.imapServer.listenFolder || this.imapServer.imapSerialID ) : null
        if ( this.writable ) {
			this.appendWaitResponsrTimeOut = setTimeout (() => {
				
				return CallBack ()
			}, 1000 * 30 )

            return this.push ( this.cmd + '\r\n')
        }
        if ( CallBack && typeof CallBack === 'function') {
            return CallBack()
        }
        
    }
}

export const getMailAttachedBase64 = ( email: Buffer ) => {
    
    const attachmentStart = email.indexOf ('\r\n\r\n')
    if ( attachmentStart < 0 ) {
        console.log ( `getMailAttached error! can't faind mail attahced start!`)
        return null
    }
    const attachment = email.slice ( attachmentStart + 4 )
    return attachment.toString()
}

export class qtGateImap extends EventEmitter {
    public socket: TLSSocket
    public imapStream: ImapServerSwitchStream
    public newSwitchRet = null
    public newSwitchError = null
    public fetching = 0
    private tagcount = 0
    public domainName = ''
    public serverSupportTag = null
    public idleSupport
    public condStoreSupport = false
    public literalPlus = false
    public fetchAddCom = ''
	private destoring = false
    private port = 0
	public imapSerialID = ''
	public CAPABILITY_reconnect = false
    public get TagCount () {
        if ( ++ this.tagcount < MAX_INT )
            return this.tagcount
        return this.tagcount = 0
    }
    private connectTimeOut

    private connect () {

		
        const handleEvent = () => {

            clearTimeout ( this.connectTimeOut )
			this.socket = conn

            conn.once ( 'ready', () => {
                console.log ( `this.imapStream.once ready! [${ this.listenFolder }][${ this.writeFolder }]`)
                this.emit ( 'ready' )
            })
            
            this.socket.pipe ( this.imapStream ).pipe ( conn )
        }

        const listenOther = () => {

            conn.once ( 'error', err => {
                console.log ( `imap socket on ERROR [${ err }]` )
                
                //this.emit ( 'error', err )
                this.destroyAll ( err )
            })

            conn.once ( 'end', () => {
				
				if ( / CAPABILITY$/.test (this.imapStream.cmd)) {
					logger ( colors.red (`${this.IMapConnect.imapServer } socket on END! last command = [${ this.imapStream.cmd }] do connect again!`))
					this.CAPABILITY_reconnect = true
					return this.destroyAll ( null )
				}
				logger (`${this.IMapConnect.imapServer } socket on END! last command = [${ this.imapStream.cmd }]`)
                this.destroyAll(null)
                
            })

            this.connectTimeOut = setTimeout (() => {
            
                this.emit ( 'error', new Error ('connect timeout'))

            }, socketTimeOut )
        }
        let conn
		try {
			logger (colors.bgMagenta(`connect to ${this.IMapConnect.imapServer}`))
			conn = connect ({ port: this.port, host: this.IMapConnect.imapServer, servername: this.IMapConnect.imapServer }, handleEvent )
		} catch ( ex ) {
			console.log ( ex )
			return this.connect ()
		}
        
        listenOther ()

    }

    constructor ( public IMapConnect: imapConnect, public listenFolder: string, public deleteBoxWhenEnd: boolean, public writeFolder: string, private debug: boolean, public newMail: ( mail ) => void, public exit_when_idle = false) {
        super ()
		this.imapStream = new ImapServerSwitchStream ( this, deleteBoxWhenEnd, debug )
		this.domainName = IMapConnect.imapUserName.split ('@')[1]
		this.port = parseInt ( IMapConnect.imapPortNumber.toString () )
		this.imapSerialID = createHash ( 'md5' ).update ( JSON.stringify( IMapConnect) ).digest ('hex').toUpperCase()
        this.connect ()
        this.once ( `error`, err => {
            console.trace ( `qtGateImap on error [${ err  }]` )
        })

        this.imapStream.on ( 'error', err => {
            console.trace ( `qtGateImap imapStream ERROR! [${ err  }]` )
        })

        this.on ('end', () => {
            logger (colors.green(`qtGateImap on this.end()`))
        })

    }

    public destroyAll ( err: Error|null = null ) {

        if ( this.destoring ) {
			console.trace ()
			return console.log (`qtGateImap class already destroyAll!! skip`)
		}
		//console.log (`qtGateImap class destroyAll!!`)
		this.destoring = true
        clearTimeout ( this.imapStream.idleResponsrTime )
        clearTimeout ( this.imapStream.appendWaitResponsrTimeOut )
        clearTimeout ( this.imapStream.idleNextStop )
       
        if ( typeof this.socket?.end === 'function' ) {
			logger (`${this.IMapConnect.imapServer } doing socket.end()!`)
            this.socket.end ()
        }
        if ( this.socket && typeof this.socket.removeAllListeners === 'function' ) {
            this.socket.removeAllListeners ()
        }
        
		if ( this.CAPABILITY_reconnect ) {
			this.CAPABILITY_reconnect = false
			err = new Error ('CAPABILITY_reconnect')
		}
		this.emit ( 'end', err )
    }

    public logout ( CallBack = null ) {
        return this.imapStream.logout (() => {
			if ( typeof CallBack === 'function') {
                //@ts-ignore
				CallBack ()
			}
            //saveLog (`qtGateImap writeFolder [${ this.writeFolder }] logout success!`)
        })
    }

}

export class qtGateImapwrite extends qtGateImap {

    private ready = false
    public canAppend = false
    
    private appenfFilesPool: { fileName: string, CallBack: any }[] = []
    public imapEnd = false

    public append3 ( text: string, subject: string, CallBack ) {
    
        //console.log (`doing append2 [${ this.IMapConnect.imapUserName }:${ this.writeFolder }]`)
        return this.imapStream.append ( text, subject, CallBack )
    }
    
    constructor ( public IMapConnect: imapConnect, public writeFolder: string ) {
		super ( IMapConnect, '', false, writeFolder, DEBUG, ()=> {}, true )
		
        this.on ( 'ready', () => {
            //console.log (`qtGateImapwrite on ready!!\n\n`)
            this.ready = this.canAppend = true
		})
		
        this.on ( `error`, err => {
            this.destroyAll ( err )
		})
        
        this.on ('connect_error', err => {
            this.destroyAll ( err )
        })
        
    }

    public appendFromFile ( fileName: string, uuid: string, folderName: string, createFlder: boolean, unlink: boolean, CallBack ) {
		return waterfall ([
            next => {
                if ( !createFlder ) {
                    return next ()
                }
                return this.imapStream.createBox ( false, folderName, next )
            },
			next => this.imapStream.appendStreamV3 ( fileName, uuid, folderName, unlink, next )
		], CallBack )
        
    }

}


export class qtGateImapRead extends qtGateImap {

    private openBox = false

    constructor ( IMapConnect: imapConnect, listenFolder: string, isEachMail: boolean, deleteBoxWhenEnd: boolean, newMail: ( mail ) => void, exit_when_idle = false,  ) {
        
        super ( IMapConnect, listenFolder, deleteBoxWhenEnd, '', DEBUG, newMail, false )
        //DEBUG ? console.trace ( `[${ IMapConnect.imapUserName }] create qtGateImapRead !, `) : null 
        this.once ( 'ready', () => {
            DEBUG ? logger ( `[${ IMapConnect.imapUserName }] qtGateImapRead ready!, `) : null 
            this.openBox = true
        })

        this.on ( 'connect_error', err => {
            logger( `qtGateImapRead on connect_error`, err )
        })
    }

	public sendFile ( filepath: string, foldername: string, subject: string, createFlder: boolean, unlink: boolean, CallBack ) {
		console.log ( `qtGateImapRead sendFile [${ filepath }] foldername [${ foldername }] subject [${ subject }]`)
		const kk = new qtGateImapwrite ( this.IMapConnect, foldername )
		let count = 0
		const send = () => {
			return kk.appendFromFile ( filepath, subject, foldername, createFlder, unlink, err => {
				if ( err ) {
					if ( ++ count < 3 ) {
						return send ()
					}
                    //@ts-ignore
					return kk.logout (() => {
						return CallBack ( new Error (`qtGateImapRead appendFromFile error ${ err.message }`))
					})
					
				}
                //@ts-ignore
				return kk.logout ( () => {
					return CallBack ()
				})
			})
		}
		kk.once ( 'ready', () => {
			send ()
		})
	}
    
}


export const getMailSubject = ( email: Buffer ) => {
    
    const headerStart = email.toString().split ('\r\n\r\n')[0].split (/\r?\n/)
    const subjectIndex = headerStart.findIndex ( n => {
        return /^Subject\: /i.test ( n )
    })
    const subject = headerStart [ subjectIndex ]
    if ( !subject ) {
        return null
    }
    return subject.split (/Subject\: /i)[1]
}

export const imapGetDate = ( email: Buffer ) => {
	const headerStart = email.toString().split ('\r\n\r\n')[0].split (/\r?\n/)
	const subjectIndex = headerStart.findIndex ( n => {
        return /^Date\: /i.test ( n )
    })
	const subject = headerStart [ subjectIndex ]
    if ( !subject ) {
        return null
    }
    return subject.split (/Date\: /i)[1]
}


export const getMailAttached = ( email: Buffer ) => {
    
    const attachmentStart = email.indexOf ('\r\n\r\n')
    if ( attachmentStart < 0 ) {
        console.log (`getMailAttached error! can't faind mail attahced start!`)
        return ''
    }
    const attachment = email.slice ( attachmentStart + 4 )
    return Buffer.from ( attachment.toString(), 'base64').toString()
}


export const appendText = ( text: string, IMapConnect: imapConnect, writeFolder: string, subject: string, CallBack ) => {
    const wImap = new qtGateImapwrite ( IMapConnect, writeFolder )
    let error = null
    wImap.once ( 'ready', () => {
        //console.log (`appendText wImap.once ( 'ready') doing append!`)
        wImap.append3 ( text, subject, err => {
            
            wImap.destroyAll ( err )
        })
    })

    wImap.once ( 'end', () => {
        //console.log ( `appendText wImap.once (Tls.connect return !'end') CallBack!`)
        return CallBack ( error )
    })

    wImap.once ( 'error', err => {
        wImap.destroyAll( err )
    })
}

export const getMessageFromFolder = ( IMapConnect: imapConnect, folder: string, CallBack ) => {
	let error
	let ret = null
	const rImap = new qtGateImap ( IMapConnect, '', false, folder, DEBUG, mail => {
		return ret = mail
	}, true)
	
    rImap.once ( 'ready', () => {
		rImap.imapStream.imapServer.listenFolder = folder
		return waterfall ([
			next => rImap.imapStream.openBox ( true, next ),
			( data, next ) => {
				if ( typeof data === 'function') {
					next = data
				}
				rImap.imapStream.seachAll ( next )
			},
			( data, data1, next ) => {
				if ( typeof data === 'function') {
					return data ( new Error ('getMessageFromFolder have no data'), null )
				}
				if ( !data || !data.length ) {
					return next ( null, null )
				}
				const files = data.split( ',' ).pop()
				return rImap.imapStream.fetch ( files, next )
			}
		], ( err ) => {
			error = err
			return rImap.destroyAll( error )
		})
    })

    rImap.once ( 'end', () => {
        //console.log ( `appendText wImap.once (Tls.connect return !'end') CallBack!`)
        return CallBack ( error, ret )
    })

    rImap.once ( 'error', err => {
		error = err
        rImap.destroyAll( error )
    })
}

export const appendTextToEmptyImapFolder = ( text: string, IMapConnect: imapConnect, writeFolder: string, subject: string, CallBack ) => {
	const rImap = new qtGateImap ( IMapConnect, '', false, writeFolder, DEBUG, () => {

	}, true)



	let error = null
	rImap.once ( 'ready', () => {
		console.log (`appendTextToEmptyImapFolder on ( 'ready') doing process!`)
		rImap.imapStream.imapServer.listenFolder = writeFolder
		return waterfall ([
			next => rImap.imapStream.openBox ( true, next ),
			( data, next ) => {
				if ( typeof data === 'function') {
					next = data
				}
				rImap.imapStream.seachAll ( next )
			},
			( data, data1, next ) => {
				if ( typeof data === 'function' ) {
					return data ( null, null )
				}
				if ( !data || !data.length ) {
					return next ( null, null )
				}
				const files = data.split( ',' )
				
				return eachSeries ( files, ( n: string, _next ) => {
					
					return series ([
						__next => rImap.imapStream.flagsDeleted ( n, __next ),
						__next => rImap.imapStream.expunge ( __next ),

					], _next )
					
					
				}, next )
			},
			( data, next ) => {
				if ( typeof data === 'function' ) {
					next = data
				}
				
				rImap.imapStream.append ( Buffer.from ( text, 'utf8').toString ('base64'), subject, next )
			}

		], err => {
			rImap.destroyAll ( null )
		})
        
    })

    rImap.once ( 'end', () => {
        console.log ( `appendTextToEmptyImapFolder on end` )
        return CallBack ( error )
    })

    rImap.once ( 'error', () => {
        rImap.destroyAll( error )
    })
}

export const getImapSmtpHost = ( _email: string ) => {
	const email = _email.toLowerCase()
	const yahoo = function ( _domain: string[] ) {
		const domain = _domain[1]
		if ( /yahoo.co.jp$/i.test ( domain ))
			return 'yahoo.co.jp';
			
		if ( /((.*\.){0,1}yahoo|yahoogroups|yahooxtra|yahoogruppi|yahoogrupper)(\..{2,3}){1,2}$/.test ( domain )) {
			return 'yahoo.com'
		}
			
		
		if ( /(^hotmail|^outlook|^live|^msn)(\..{2,3}){1,2}$/.test ( domain )) {
			return 'outlook.office365.com'
		}
			
			
		if ( /^(me|^icould|^mac)\.com/.test ( domain )) {
			return 'me.com'
		}

		if ( /kloak\.io/.test ( domain )) {
			if ( /zoho/.test (_domain[0])) {
				return 'zoho.com'
			}
			return 'mail.yahoo.com'
		}

		if ( /kloak\.app/.test ( domain )) {
			return 'outlook.office365.com'
		}

		if ( /conettech\.ca/.test ( domain ) ) {
			return 'ionos.com'
		}

		if (/kloak-io\.awsapps\.com/.test (domain)) {
			return 'mail.us-east-1.awsapps.com'
		}

		
			
		return domain
	}

	const emailSplit = email.split ( '@' )
	
	if ( emailSplit.length !== 2 ) {
		return null
	}
		
		
	const domain = yahoo ( emailSplit )
	
	const ret = {
		imap: 'imap.' + domain,
		smtp: 'smtp.' + domain,
		SmtpPort: [465,587,994],
		ImapPort: 993,
		imapSsl: true,
		smtpSsl: true,
		haveAppPassword: false,
		ApplicationPasswordInformationUrl: ['']
	}
	
	switch ( domain ) {
		//		yahoo domain have two different 
		//		the yahoo.co.jp is different other yahoo.*
		case 'yahoo.co.jp': {
			ret.imap = 'imap.mail.yahoo.co.jp'
			ret.smtp = 'smtp.mail.yahoo.co.jp'
			break
		}
		

		//			gmail
		case 'google.com':
		case 'googlemail.com':
		case 'gmail': {
			ret.haveAppPassword = true;
			ret.ApplicationPasswordInformationUrl = [
				'https://support.google.com/accounts/answer/185833?hl=zh-Hans',
				'https://support.google.com/accounts/answer/185833?hl=ja',
				'https://support.google.com/accounts/answer/185833?hl=en'
			]
			break
		}
		

        case 'gandi.net': {
			ret.imap = ret.smtp = 'mail.gandi.net'
        	break
		}
            
		
		//				yahoo.com
		case 'rocketmail.com':
		case 'y7mail.com':
		case 'ymail.com':
		case 'yahoo.com': {
			ret.imap = 'imap.mail.yahoo.com'
			ret.smtp = (/^bizmail.yahoo.com$/.test(emailSplit[1]))
				? 'smtp.bizmail.yahoo.com'
				: 'smtp.mail.yahoo.com'
			ret.haveAppPassword = true;
			ret.ApplicationPasswordInformationUrl = [
				'https://help.yahoo.com/kb/SLN15241.html',
				'https://help.yahoo.com/kb/SLN15241.html',
				'https://help.yahoo.com/kb/SLN15241.html'
			]
			break
		}
		

        case 'mail.ee': {
			ret.smtp = 'mail.ee'
            ret.imap = 'mail.inbox.ee'
        	break
		}
            

		
        //		gmx.com
        case 'gmx.co.uk':
        case 'gmx.de':
		case 'gmx.us':
		case 'gmx.com' : {
            ret.smtp = 'mail.gmx.com'
			ret.imap = 'imap.gmx.com'
			break
        }
		
		//		aim.com
		case 'aim.com': {
			ret.imap = 'imap.aol.com'
			break
		}
		
		
		//	outlook.com
		case 'windowslive.com':
		case 'hotmail.com': 
		case 'outlook.com': {
			ret.imap = 'imap-mail.outlook.com'
			ret.smtp = 'smtp-mail.outlook.com'
			break
		}
		
		
		//			apple mail
        case 'icloud.com':
        case 'mac.com':
		case 'me.com': {
			ret.imap = 'imap.mail.me.com'
			ret.smtp = 'smtp.mail.me.com'
			break
		}
		
		
		//			163.com
		case '126.com':
		case '163.com': {
			ret.imap = 'appleimap.' + domain
			ret.smtp = 'applesmtp.' + domain
			break
		}
		
		
		case 'sina.com':
		case 'yeah.net': {
			ret.smtpSsl = false
			break
		}

		case 'outlook.office365.com': {
			ret.imap = 'outlook.office365.com'
			break
		}

		case 'getseguro.io': {
			ret.imap = 'mail.privateemail.com'
			break
		}

		case 'zoho.com': {
			ret.imap = 'imappro.zoho.com'
		}
		
		
	}
	
	return ret
	
}



export const seneMessageToFolder = ( IMapConnect: imapConnect, writeFolder: string, message: string, subject: string, createFolder: boolean, CallBack ) => {
	const wImap = new qtGateImap ( IMapConnect, '', false, writeFolder, DEBUG, ()=> {}, false )
	let _callback = false 
	//console.log ( `seneMessageToFolder !!! ${ subject }`)
	wImap.once ( 'error', err => {
		logger (inspect (`wImap.once ( 'error')`, false, 3, true ), err )
		wImap.destroyAll ( err )
		if ( !_callback ) {
			CallBack ( err )
			return _callback = true 
		}
	})

	wImap.once ( 'ready', () => {
		return series ([
			next => {
                if ( !createFolder ) {
                    return next ()
                }
                return wImap.imapStream.createBox ( false, writeFolder, next )
            },
			next => wImap.imapStream.appendStreamV4( message, subject, writeFolder, next ),
			next => wImap.imapStream._logoutWithoutCheck ( next )
		], err => {
			logger (inspect (`seneMessageToFolder series error!`, false, 3, true ), err )
			_callback = true
			if ( err ) {
				wImap.destroyAll ( err )
			}
			return CallBack ( err )
		})
	})

	wImap.once ('end', err => {
		if (err) {
			logger (`seneMessageToFolder on end had ERROR try again`, err )
			return seneMessageToFolder (IMapConnect, writeFolder, message, subject, createFolder, CallBack)
		}
		logger (`seneMessageToFolder on end have no ERROR!`)
	})
	return 
}