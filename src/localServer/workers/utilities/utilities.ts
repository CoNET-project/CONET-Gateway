const returnCommand = ( cmd: worker_command ) => {
    self.postMessage ( JSON.stringify ( cmd ))
}



const logger = (...argv: any ) => {
    const date = new Date ()
    let dateStrang = `[Seguro-worker INFO ${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}] `
    return console.log ( dateStrang, ...argv )
}

const isAllNumbers = ( text: string ) => {
    return ! /\D/.test ( text )
}

const UuidV4Check = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/

const imapServers = [ 
    {
        server: 'imap.gmail.com',
        port: 993
    }, 
    {
        server: 'imap.mail.yahoo.com',
        port: 993
    }, 
    {
        server: 'imap.mail.me.com',
        port: 993
    },
    {
        server: 'outlook.office365.com',
        port: 993
    },
    {
        server: 'imap.zoho.com',
        port: 993
    },
    {
        server: 'api.stripe.com',
        port: 443
    }
]

const makePublicKeyOBJ = (publickeyArmor: string, CallBack: (err: Error|null, keyObj?: any) => void ) => {
    if  (!publickeyArmor) {
        return CallBack (new Error (`makePublicKeyOBJ have no publickeyArmor Error!`))
    }
    return openpgp.readKey ({ armoredKey: publickeyArmor })
    .then ((n: any ) => {
        return CallBack (null, n )
    })
    .catch ((ex: any) => {
        return CallBack (ex)
    })
}

const makePrivateKeyObj = (privateArmor: string, password: string, CallBack: (err: Error|null, keyObj?: any) => void ) => {
    if  (!privateArmor) {
        return CallBack (new Error (`makePublicKeyOBJ have no publickeyArmor Error!`))
    }
    return openpgp.readPrivateKey ({ armoredKey: privateArmor})
    .then ((n: any) => {
        if (password) {
            return openpgp.decryptKey ({ privateKey:n, passphrase: pass?.passcode })
        }
        return n
    }).then ((n: any ) => {
        return CallBack (null, n)
    }).catch ((ex: Error ) => {
        return CallBack ( ex )
    })

}

const loadWalletAddress = ( keypair: keyPair, password ) => {
	const account = new CoNETModule.Web3EthAccounts ()
	return account.wallet.decrypt ( keypair.privateKeyArmor, password )
}

const makeKeypairOBJ = (keypair: keyPair, password: string, CallBack: (err:Error|null) => void) => {
    if (!keypair) {
        return CallBack (new Error ('makeKeypairOBJ have no keypair!'))
    }
    if (!keypair.keyOpenPGP_obj) {
        keypair.keyOpenPGP_obj = {
            publicKeyObj: null,
            privateKeyObj: null
        }
    }
    const keyOpenPGP_obj = keypair.keyOpenPGP_obj
    const privateObj = () => {
        if ( keyOpenPGP_obj.privateKeyObj) {
            return CallBack (null)
        }
        return makePrivateKeyObj ( keypair.privateKeyArmor, password, (err, n)=> {
            if (err) {
                return CallBack ( err )
            }
            keyOpenPGP_obj.privateKeyObj = n
            return CallBack ( null )
        })
    }
    if (!keyOpenPGP_obj.publicKeyObj) {
        return makePublicKeyOBJ ( keypair.publicKeyArmor, (err, n) => {
            if (err) {
                return CallBack (err)
            }
            keyOpenPGP_obj.publicKeyObj  = n
            keypair.keyID = n.getKeyID().toHex().toUpperCase ()
            return privateObj ()
        })
    }
    return privateObj ()
}

const makeContainerKeyObj = ( CallBack: (err:Error|null) => void ) => {
    if (!SeguroKeyChain || !pass?.passcode) {
        const err = `makeContainerKeyObj SeguroKeyChain is NULL ERROR!`
        logger ( err )
        return CallBack ( new Error (err))
    }
    
    return makeKeypairOBJ (SeguroKeyChain.containerKeyPair, pass.passcode, err => {
        if ( err ) {
            return CallBack (err)
        }
        // if ( pass ) {
        //     pass.passcode = pass.password = pass._passcode = ''
        // }
        return CallBack (null)
    })
}

const makeDeviceKeyObj = (CallBack: (err:Error|null) => void ) => {
    if (!SeguroKeyChain ) {
        const err = `makeContainerKeyObj SeguroKeyChain is NULL ERROR!`
        logger ( err )
        return CallBack ( new Error (err))
    }
    return makeKeypairOBJ (SeguroKeyChain.keyChain.deviceKeyPair, '', CallBack)
}

const makeSeguroKeyObj = (CallBack: (err:Error|null) => void ) => {
    if (!SeguroKeyChain ) {
        const err = `makeContainerKeyObj SeguroKeyChain is NULL ERROR!`
        logger ( err )
        return CallBack ( new Error (err))
    }
    SeguroKeyChain.isReady = true

    //return makeKeypairOBJ (SeguroKeyChain.keyChain.seguroAccountKeyPair, '', CallBack)
}

const decryptWithContainerKey = ( encryptedMessage: string, CallBack: (err: Error|null, text?: string) => void) => {
    let ret = ''
    
    return openpgp.readMessage({armoredMessage: encryptedMessage})
    .then ((message: any) => {
        if ( !SeguroKeyChain || !SeguroKeyChain.containerKeyPair.keyOpenPGP_obj || !SeguroKeyChain.containerKeyPair.keyOpenPGP_obj.privateKeyObj) {
            const err = 'decryptWithContainerKey have no SeguroKeyChain.containerKeyPair.keyOpenPGP_obj ERROR!'
            logger (err)
            return CallBack (new Error (err))
        }
        return openpgp.decrypt({
            message,
            verificationKeys: SeguroKeyChain.containerKeyPair.keyOpenPGP_obj.publicKeyObj,
            decryptionKeys: SeguroKeyChain.containerKeyPair.keyOpenPGP_obj.privateKeyObj
        })
    })
    .then ((n: any) => {
        ret = n.data
        return n.verified
    })
    .then (() => {
        return CallBack (null, ret )
    })
    .catch (( ex: Error ) => {
        return CallBack ( ex )
    })
}

const decryptWithDeviceKey = (encryptedMessage: string, CallBack: (err: Error|null, text?: string) => void) => {
    let ret = ''
    return openpgp.readMessage({armoredMessage: encryptedMessage})
    .then ((message: any) => {
        if ( !SeguroKeyChain?.keyChain.deviceKeyPair.keyOpenPGP_obj?.privateKeyObj ) {
            const err = 'decryptWithDeviceKey have no SeguroKeyChain?.keyChain.deviceKeyPair.keyOpenPGP_obj?.privateKeyObj ERROR!'
            
            CallBack (new Error (err))
            return Promise.reject (new Error(err))
        }
        return openpgp.decrypt({
            message,
            verificationKeys: Seguro_PublickeyObj,
            decryptionKeys:SeguroKeyChain?.keyChain.deviceKeyPair.keyOpenPGP_obj?.privateKeyObj
        })
    })
    .then((n: any) => {
        ret = n.data
        return n.verified
    })
    .then (() => {
        return CallBack (null, ret )
    })
    .catch ((ex: Error) => {
        logger (ex)
    })
}

const encrypt_Seguro_INIT_data_ToPGP = ( cmd: worker_command ) => {

    if ( !SeguroKeyChain || !systemInitialization ) {
        logger (`encrypt.js encrypt_InitSeguroDataToPGP error: !SeguroKeyChain?.toStoreObj || !systemInitialization`, cmd )
        cmd.err = 'INVALID_DATA'
        return returnCommand(cmd)
    }
    
    const encryptObj = {
        SeguroKeyChain: SeguroKeyChain.toStoreObj(),
        Preferences: systemInitialization
    }
    
    return encryptWithContainerKey(JSON.stringify (encryptObj), (err, encryptedText) => {
        if ( err ) {
            logger(`encrypt.js encryptWithContainerKey OpenPGP error`, err)
            cmd.err = 'OPENPGP_RUNNING_ERROR'
            return returnCommand(cmd)
        }
        if ( encryptedText && SeguroKeyChain) {
            SeguroKeyChain.encryptedString = encryptedText
        }
        
        return storage_StoreContainerData(cmd)
    })

}

const encryptWithContainerKey = ( text: string, CallBack: ( err: Error|null, encryptedText?: string ) => void ) => {
    if ( !SeguroKeyChain?.isReady) {
        logger ('!SeguroKeyChain?.isReady waiting!')
        setTimeout (() => {
            return encryptWithContainerKey (text, CallBack )
        }, 1000)
        return
    }
    logger ('encryptWithContainerKey start!')
    const keyOpenPGP_obj = SeguroKeyChain.containerKeyPair.keyOpenPGP_obj
    if ( !keyOpenPGP_obj || !keyOpenPGP_obj.privateKeyObj ) {
        const err = `encryptWithContainerKey SeguroKeyChain.containerKeyPair.keyOpenPGP_obj have not ready Error!`
        logger (err)
        return CallBack (new Error (err))
    }
    const encryptObj = {
        message: null,
        encryptionKeys: keyOpenPGP_obj.publicKeyObj,
        signingKeys: keyOpenPGP_obj.privateKeyObj,
		config: { preferredCompressionAlgorithm: openpgp.enums.compression.zlib } // compress the data with zlib
    }
    return openpgp.createMessage({ text: buffer.Buffer.from (text).toString('base64') })
        .then ((n: any) => {
            encryptObj.message = n
            return openpgp.encrypt(encryptObj)
        }).then (( encrypted: string ) => {
            return CallBack ( null, encrypted )
        }).catch ((ex: Error) => {
            return CallBack ( ex )
        })

}

const localServerErrorBridge = ( status: number, CallBack : ( err: netWorkError|seguroError|null, payload?: any ) => void ) => {
    switch (status) {
        case 404: {
            return CallBack ('LOCAL_SERVER_ERROR')
        }
        case 405: {
            return CallBack ('NOT_STRIPE')
        }
        case 402: {
            return CallBack ('INVITATION_CODE_ERROR')
        }
        case 406: {
            return CallBack ('SEGURO_DATA_FORMAT_ERROR')
        }
        case 452: {
            return CallBack ('WAITING_SEGURO_RESPONSE_TIMEOUT')
        }
        default: {
            CallBack ('UNKNOW_ERROR')
        }
    }
}

const timeoutSetup = 30000

const localServerGetJSON = (command: string, method: string, postJSON: string, CallBack: (err: netWorkError|seguroError|null, payload?: any) => void ) => {
    const xhr = new XMLHttpRequest()
    const url = self.name + command
    xhr.open( method, url, true )
    xhr.withCredentials = false

    const timeout = setTimeout (()=> {
        return CallBack('LOCAL_SERVER_ERROR')
    }, timeoutSetup )

    xhr.setRequestHeader ("Content-Type", "application/json;charset=UTF-8")
    xhr.onload = () => {
        clearTimeout(timeout)
        const status = xhr.status
        if ( status === 200) {
            if ( !xhr.response ) {
                return CallBack( null, '')
            }
            let ret = ''
            try {
                ret = JSON.parse (xhr.response)
            } catch (ex) {
                logger (`localServerGetJSON JSON.parse (xhr.response) ERROR`)
                return CallBack ('LOCAL_RESPONE_NO_JSON_DATA')
            }
            return CallBack(null, ret)
        }
        logger (`localServerGetJSON [${ command }] response status[${ status }] !== 200 ERROR`)
        return localServerErrorBridge ( status, CallBack )
    }

    return xhr.send(postJSON)
}

const testNetwork = (CallBack: (err?: netWorkError|null, data?: testImapResult[]) => void) => {
    let ret: netWorkError
    return localServerGetJSON ( 'testImapServer', 'GET', '', (err, data: testImapResult[]) => {
        if (err) {
            ret = 'LOCAL_SERVER_ERROR'
            return CallBack (ret)
        }
        const errServer = data.filter ( n => n.error !== null )
        // if ( !errServer.length ) {
        //     return CallBack ( null, data )
        // }
        if ( errServer.length > 4 ) {
            ret = 'NOT_INTERNET'
            return CallBack ( ret )
        }
        // const ret: netWorkError[] = []
        const stripe = errServer.filter ( n => n.n.server === 'api.stripe.com')
        if ( stripe.length ) {
            ret = 'NOT_STRIPE'
            return CallBack (ret)
        }
        // const office365 = errServer.filter ( n => n.n.server === 'outlook.office365.com')
        // if ( office365.length ) {
        //     ret.push ('NOT_OFFICE365')
        // }
        // const me = errServer.filter ( n => n.n.server === 'imap.mail.me.com')
        // if (me.length) {
        //     ret.push ('NOT_ME_COM')
        // }
        // const zoho = errServer.filter ( n => n.n.server === 'imap.zoho.com')
        // if ( zoho.length ) {
        //     ret.push ('NOT_ZOHO')
        // }
        // const yahoo = errServer.filter ( n => n.n.server === 'imap.mail.yahoo.com')
        // if ( yahoo.length ) {
        //     ret.push ('NOT_YAHOO')
        // }
        // const gmail = errServer.filter ( n => n.n.server === 'imap.gmail.com')
        // if ( gmail.length ) {
        //     ret.push ('NOT_GMAIL')
        // }
        return CallBack ( null, data )
    })
}

const getNewNotice = ( connect: webEndpointConnect, CallBack ) => {
    connect.nextNoticeBlock = connect.nextNoticeBlock || connect.client_listening_folder
    const url = `${ connect.endPoints[0] }/${ connect.client_listening_folder }/${ connect.nextNoticeBlock }`
    return localServerGetJSON('newNotice', 'GET', '', CallBack)
}

const initCoNETTestnetUSDCAsset = () => {
	const ret: CryptoAsset = {
		history: [],
		balance: 0,
		networkName: 'CoNET Testnet',
		RpcURL:'0xCABCde7cC96F8FbD4e4a1A232C8bfc3aC46b1461',
		blockExplorerURL: '',
		chainID: 18,
		currencySymbol: 'CoNET-USDC',
	}
	return ret
}

const initCoNETTestnetTokenAsset = () => {
	const ret: CryptoAsset = {
		history: [],
		balance: 0,
		networkName: 'CoNET Testnet',
		RpcURL:'https://conettech.ca/testnet',
		blockExplorerURL: '',
		chainID: 22224,
		currencySymbol: 'CoNET-Testnet',
	}
	return ret
}

const denominator = 1000000000000000000
const testNet = 'https://conettech.ca/testnet'

const getCoNETTestnetBalance = async ( walletAddr: string ) => {
	const web3 = CoNETModule
}
