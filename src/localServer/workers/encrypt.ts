const encryptWorkerDoCommand = ( cmd: worker_command ) => {

    switch ( cmd.cmd ) {
        case 'encrypt_createPasscode': {
            if ( !cmd.data || cmd.data.length < 2) {
                cmd.err = 'INVALID_DATA'
                return returnCommand ( cmd )
            }
            delete cmd.err
            //          make password group
            systemInitialization = cmd.data [1]
            
            return createNumberPasscode ( cmd, ( err, _pass ) => {
                if ( err ) {
                    cmd.err = 'GENERATE_PASSCODE_ERROR'
                    return returnCommand (cmd)
                }
                pass = _pass
                return initSeguroData (cmd)
            })
            
        }

        case 'encrypt_TestPasscode': {
            return encrypt_TestPasscode (cmd)
        }

        case 'encrypt_lock': {
            if ( SeguroKeyChain ) {
                SeguroKeyChain.isReady = false
                SeguroKeyChain.containerKeyPair.keyOpenPGP_obj = SeguroKeyChain.keyChain.deviceKeyPair.keyOpenPGP_obj = 
                SeguroKeyChain.keyChain.seguroAccountKeyPair.keyOpenPGP_obj = 
                {
                    privateKeyObj: null,
                    publicKeyObj: null
                }
            }
            
            cmd.data = [{
                preferences: systemInitialization?.preferences,
                passcode: {
                    testPasscode: null,
                    createPasscode: null,
                    status: 'LOCKED'
                },
                profiles: []
            }]
            
            return returnCommand (cmd)
        }

        case 'invitation': {
            return invitation (cmd)
        }

        case 'encrypt_deletePasscode': {
            return encrypt_deletePasscode (cmd)
        }

        case 'storePreferences': {
            return storePreferences (cmd)
        }

        case 'newProfile': {
            return newProfile (cmd)
        }

        case 'storeProfile': {
            return storeProfile (cmd)
        }

        default: {
            cmd.err = 'INVALID_COMMAND'
            returnCommand (cmd)
            return console.log (`encryptWorkerDoCommand unknow command!`)
        }
    }
}

const initEncryptWorker = () => {
	
    const baseUrl = self.name + 'utilities/'
	
    self.importScripts ( baseUrl + 'Buffer.js' )
    self.importScripts ( baseUrl + 'openpgp.min.js' )
    self.importScripts ( baseUrl + 'UuidV4.js' )
    self.importScripts ( baseUrl + 'Pouchdb.js' )
    self.importScripts ( baseUrl + 'PouchdbFind.js' )
    self.importScripts ( baseUrl + 'PouchdbMemory.js' )
    self.importScripts ( baseUrl + 'scrypt.js' )
    self.importScripts ( baseUrl + 'async.js' )
    self.importScripts ( baseUrl + 'utilities.js' )
	self.importScripts ( baseUrl + 'EthCrypto.js' )
	self.importScripts ( baseUrl + 'web3.js' )
    self.importScripts ( baseUrl + 'generatePassword.js' )
    self.importScripts ( baseUrl + 'storage.js' )
    self.importScripts ( baseUrl + 'seguroSetup.js' )
    workerReady = true
    onmessage = e => {
        const jsonData = buffer.Buffer.from ( e.data ).toString()
		let cmd: worker_command
		try {
			cmd = JSON.parse ( jsonData )
		} catch ( ex ) {
			return console.dir ( ex )
		}
        if ( !workerReady ) {
            cmd.err = 'NOT_READY'
            return returnCommand ( cmd )
        }

        return encryptWorkerDoCommand ( cmd )
    }

    return checkStorage ()
}

let SeguroKeyChain: encrypt_keys_object | null = null
let systemInitialization: systemInitialization|null = null
let pass: passInit| null = null
let systemInitialization_UUID = ''
let workerReady = false
let Seguro_PublickeyObj:any = null

const initSeguroData = ( cmd: worker_command ) => {
    
    const ret: encrypt_keys_object = {
        containerKeyPair: {
            publicKeyArmor: '',
            privateKeyArmor: '',
            keyOpenPGP_obj: {
                privateKeyObj: null,
                publicKeyObj: null
            }
        },
        keyChain: {
            deviceKeyPair: {
                publicKeyArmor: '',
                privateKeyArmor: '',
                keyOpenPGP_obj: {
                    privateKeyObj: null,
                    publicKeyObj: null
                }
            },
            seguroAccountKeyPair: {
                publicKeyArmor: '',
                privateKeyArmor: '',
                keyOpenPGP_obj: {
                    privateKeyObj: null,
                    publicKeyObj: null
                }
            },
            profiles: []
        },
        isReady: false,
        toStoreObj: null,
        encryptedString: ''
    }
    createKey( pass?.passcode || '', '', '')
    .then (( data: any ) => {
        ret.containerKeyPair = {
            publicKeyArmor: data.publicKey,
            privateKeyArmor: data.privateKey,
            keyOpenPGP_obj: null
        }
        return createKey ('', '', '')
    })
    .then (( data: any) => {
        ret.keyChain.deviceKeyPair.publicKeyArmor = data.publicKey
        ret.keyChain.deviceKeyPair.privateKeyArmor = data.privateKey
        return createKey ('', '','')
    })
    .then (( data: any ) => {
        ret.keyChain.seguroAccountKeyPair.publicKeyArmor = data.publicKey
        ret.keyChain.seguroAccountKeyPair.privateKeyArmor = data.privateKey
        return createKey ('', '','')
    })
    .then (( data: any ) => {
        const _key: keyPair = {
            publicKeyArmor: data.publicKey,
            privateKeyArmor: data.privateKey,
            keyID: '',
            keyOpenPGP_obj: null,
            isPrimary: true
        }
        ret.keyChain.profiles.push(_key)
        SeguroKeyChain = ret
        return async.series ([
            ( next: any ) => createEncryptObject (next),
            (next: any ) => initEncryptObject (cmd, next)
            
        ], err => {
            if (err) {
                logger (`initEncryptObject ERROR`, err )
                cmd.err = 'OPENPGP_RUNNING_ERROR'
                return returnCommand (cmd)
            }

            return encrypt_Seguro_INIT_data_ToPGP (cmd)
        })
    })
    .catch (( ex: any ) => {
        cmd.err = 'OPENPGP_RUNNING_ERROR'
        cmd.data = []
        logger (`initSeguroData on ERROR`, ex)
        return returnCommand ( cmd )
    })
}

const encrypt_with_Seguro = (text: string, CallBack: (err?: WorkerCommandError|null, encryptedText?: string ) => void ) => {
    const encrypte = () => {
        const encryptObj = {
            message: '',
            encryptionKeys: Seguro_PublickeyObj,
            signingKeys: SeguroKeyChain?.keyChain.seguroAccountKeyPair.keyOpenPGP_obj?.privateKeyObj
        }
        openpgp.createMessage({ text: buffer.Buffer.from (text).toString('base64') })
        .then ((n: any)=> {
            encryptObj.message = n
            return openpgp.encrypt(encryptObj)
        })
        .then((n:string)=> {
            return CallBack (null, n)
        })
        .catch ((ex: Error) => {
            const ret: WorkerCommandError = 'OPENPGP_RUNNING_ERROR'
            return CallBack ( ret )
        })
    }
    if ( !Seguro_PublickeyObj ) {
        return makePublicKeyOBJ (seguroSetup.seguroPublicKey, (err, obj )=> {
            if ( err ) {
                const ret: WorkerCommandError = 'OPENPGP_RUNNING_ERROR'
                return CallBack (ret)
            }
            Seguro_PublickeyObj = obj
            return encrypte ()
        })
    }
    return encrypte ()
}

const createEncryptObject = ( CallBack: (err: Error|null) => void ) => {
    
    return makeDeviceKeyObj (err => {
        if (err) {
            return CallBack (err)
        }
        if ( !SeguroKeyChain ) {
            return CallBack ( new Error ('createEncryptObject Error! Have no obj') )
        }
        return async.eachSeries ( SeguroKeyChain.keyChain.profiles, ( n, next ) => makeKeypairOBJ(n, '', next), err => {
            if ( err ) {
                return CallBack (err)
            }
            return CallBack (null)
        })
    })
    
}

const initEncryptObject = (cmd: worker_command, CallBack: (err?: Error|null) => void ) => {
    if ( !SeguroKeyChain ||  !SeguroKeyChain.containerKeyPair || !pass ) {
        const err = `encrypt worker initEncryptObject Error: have no SeguroKeyChain!`
        logger ( err )
        return CallBack (new Error (err))
    }
    const _SeguroKeyChain = SeguroKeyChain
    const containerKey = _SeguroKeyChain.containerKeyPair
    const makeKeyChainObj = () => {
        if ( !SeguroKeyChain ) {
            const err = `initEncryptObject makeKeyChainObj !SeguroKeyChain ERROR! `
            logger (err)
            return CallBack ( new Error (err))
        }
        const deviceKey = SeguroKeyChain.keyChain.deviceKeyPair
        const seguroKey = SeguroKeyChain.keyChain.seguroAccountKeyPair
        _SeguroKeyChain.toStoreObj = () => {
            const kk: encrypt_keys_object = {
                containerKeyPair: {
                    privateKeyArmor: containerKey.privateKeyArmor,
                    publicKeyArmor: containerKey.publicKeyArmor,
                    keyOpenPGP_obj: null
                },
                keyChain: {
                    deviceKeyPair: {
                        publicKeyArmor: deviceKey.publicKeyArmor,
                        privateKeyArmor: deviceKey.privateKeyArmor,
                        keyOpenPGP_obj: null
                    },
                    seguroAccountKeyPair: {
                        publicKeyArmor: seguroKey.publicKeyArmor,
                        privateKeyArmor: seguroKey.privateKeyArmor,
                        keyOpenPGP_obj: null
                    },
                    profiles: []
                },
                isReady: false,
                toStoreObj: null,
                encryptedString: ''
            }
            _SeguroKeyChain.keyChain.profiles.forEach ( n => {
                const key = { publicKeyArmor: n.publicKeyArmor, privateKeyArmor: n.privateKeyArmor, keyID: n.keyID, keyOpenPGP_obj: null, alias: n.alias, nickname: n.nickname, tags: n.tags, bio: n.bio, isPrimary: n.isPrimary, profileImg: n.profileImg }
                kk.keyChain.profiles.push ( key )
            })
            return kk
        }
        return async.series ([
            next => makeDeviceKeyObj (next),
            next => makeSeguroKeyObj (next)
        ], CallBack)

    }

    const unlockContainerKeyPair = () => {
        return makeContainerKeyObj ( err => {
            if ( err ) {
                logger (`initEncryptObject makeContainerKeyObj Error`, err )
                return CallBack (err)
            }
            if ( !_SeguroKeyChain.keyChain.deviceKeyPair.publicKeyArmor ) {
            
                if (!SeguroKeyChain?.encryptedString) {
                    const err = 'SeguroKeyChain locked but have no SeguroKeyChain.encryptedString ERROR!'
                    logger ( err )
                    return returnCommand (cmd)
                }
                return decryptWithContainerKey ( SeguroKeyChain.encryptedString, (err, data ) =>{
                    if ( err ) {
                        return CallBack (err)
                    }
                    let sysInit
                        const _data = buffer.Buffer.from (data,'base64').toString()
                        try {
                            sysInit = JSON.parse (_data)
                        } catch ( ex ) {
                            const err = 'unlockContainerKeyPair decryptWithContainerKey JSON.parse Error'
                            CallBack (new Error (err))
                            return logger (err)
                        }
                        if ( SeguroKeyChain) {
                            SeguroKeyChain.keyChain = sysInit.SeguroKeyChain.keyChain
                        }
                        //@ts-ignore
                        systemInitialization.SeguroNetwork = sysInit.Preferences.SeguroNetwork
                        return createEncryptObject ( err => {
                            if ( err ) {
                                return CallBack (err)
                            }
                            return makeKeyChainObj ()
                        })
                })
            }
            return makeKeyChainObj ()
        })
    }

    if ( !pass.passcode ) {
        return decodePasscode (cmd, (err) => {
            if ( err ) {
                logger (`initEncryptObject decodePasscode ERROR!`, err )
                cmd.err = 'FAILURE'
                return returnCommand (cmd)
            }
            return unlockContainerKeyPair ()
        })
    }

    return unlockContainerKeyPair ()
}

const createKey = ( passwd: string, name: string, email: string ) => {
	const userId = {
		name: name,
		email: email
	}
	const option = {
        type: 'ecc',
		passphrase: passwd,
		userIDs: [ userId ],
		curve: 'curve25519',
        format: 'armored'
	}

	return openpgp.generateKey ( option )
}

const encrypt_TestPasscode = (cmd: worker_command) => {
    if ( !cmd.data?.length || !pass ) {
        cmd.err = 'INVALID_DATA'
        return returnCommand (cmd)
    }
    
    pass.password = cmd.data[0]

    return initEncryptObject (cmd, ( err )=> {
        
        if ( err ) {
            cmd.err = 'FAILURE'
            return returnCommand ( cmd )
        }

        return storage_StoreContainerData (cmd)
    })
}

const invitation = (cmd: worker_command) => {
    const code: string = cmd.data [0]

    let kk: SeguroInvitation|null = null
    let SeguroObject = null
    return async.waterfall ([
        (next: any ) => testNetwork ( next ),
        ( data: testImapResult[], next: any ) => {
            
            if ( !SeguroKeyChain?.keyChain) {
                const ret: WorkerCommandError = 'NOT_READY'
                return next ( ret )
            }

            kk = {
                device_publickey_armor: SeguroKeyChain.keyChain.deviceKeyPair.publicKeyArmor,
                seguro_key_armor: SeguroKeyChain.keyChain.seguroAccountKeyPair.privateKeyArmor,
                imapTest: JSON.stringify(data),
                invitation: code
            }
            return encrypt_with_Seguro (JSON.stringify (kk), next)
        }, 
        ( encryptedText: string, next: any ) => localServerGetJSON ('sendToStripe','POST', JSON.stringify({ postData: encryptedText }), next ),
        ( encrypted: string, next: any ) => decryptWithDeviceKey(encrypted, next),
        ( data: string, next: any) => {
            try {
                SeguroObject = JSON.parse (data)
            } catch (ex) {
                return next (ex)
            }
            //@ts-ignore
            systemInitialization.SeguroNetwork.SeguroObject = SeguroObject
            //@ts-ignore
            systemInitialization.SeguroNetwork.SeguroStatus = 'CONNECTING_SEGURO_NETWORK'
            return encrypt_Seguro_INIT_data_ToPGP(cmd)
        }
    ], ( err: any, data) => {
        if ( err ) {
            cmd.err = err
            logger (`invitation Error`, err )
        } else {
            logger(`invitation SUCCESS!`)
        }
        
        return returnCommand (cmd)
    })
}


const newProfile = (cmd: worker_command) => {
    const profile: profile = cmd.data[0]
    const ret: profile = {
        publicKeyArmor: '',
        privateKeyArmor: '',
        keyOpenPGP_obj: null,
        alias: profile.alias,
        nickname: profile.nickname,
        keyID: '',
        tags: profile.tags,
        bio: profile.bio,
        isPrimary: profile.isPrimary,
        profileImg: profile.profileImg
    }
    return createKey('','','')
    .then((n: any) => {
        ret.privateKeyArmor = n.privateKey
        ret.publicKeyArmor = n.publicKey
        return makeKeypairOBJ (ret, '', err => {
            if ( err ) {
                logger (`newProfile makeKeypairOBJ ERROR`, err )
                cmd.err = 'OPENPGP_RUNNING_ERROR'
                return returnCommand (cmd)
            }
            SeguroKeyChain?.keyChain.profiles.push (ret)
            return encrypt_Seguro_INIT_data_ToPGP ( cmd )
        })
    })
    .catch (( ex: any ) => {
        cmd.err = 'OPENPGP_RUNNING_ERROR'
        cmd.data = []
        logger (`initSeguroData on ERROR`, ex)
        return returnCommand ( cmd )
    })
}

const storeProfile = (cmd: worker_command) => {
    const profile: profile[]  = cmd.data[0]
    if ( !profile || !profile.length ) {
        logger (`storeProfile have no profile data ERROR!` )
        cmd.err = 'INVALID_DATA'
        return returnCommand (cmd)
    }
    
    profile.forEach ( n => {
        if ( !SeguroKeyChain ) {
            return 
        }
        const index = SeguroKeyChain.keyChain.profiles.findIndex ( _n => _n.keyID === n.keyID)
        if ( index < 0 ) {
            return
        }
        const current = SeguroKeyChain.keyChain.profiles[index]
        current.alias = n.alias
        current.nickname = n.nickname
        current.bio = n.bio
        current.tags = n.tags
        current.isPrimary = n.isPrimary
        current.profileImg = n.profileImg
    })
    return encrypt_Seguro_INIT_data_ToPGP ( cmd )
}

const startGetNoticeDaemon = () => {
    if (!systemInitialization) {
        return logger (`startGetNoticeDaemon have no systemInitialization ERROR!`)
    }
    const connect = systemInitialization.SeguroNetwork.SeguroObject 
    const start = () => {
        
    }
    start ()
}

const CoNETModule = {
	EthCrypto: null,
	Web3EthAccounts: null
}

initEncryptWorker()