const returnCommand = ( cmd: worker_command ) => {
    self.postMessage ( JSON.stringify ( cmd ))
}

let workerReady = false

const logger = (...argv: any ) => {
    const date = new Date ()
    let dateStrang = `[Seguro-worker INFO ${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}] `
    return console.log ( dateStrang, ...argv )
}

const isAllNumbers = ( text: string ) => {
    return ! /\D/.test ( text )
}


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
            keypair.keyID = n.getKeyIDs()[1].toHex ().toUpperCase ()
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
        if ( pass ) {
            pass.passcode = pass.password = pass._passcode = ''
        }
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
    return makeKeypairOBJ (SeguroKeyChain.keyChain.seguroAccountKeyPair, '', CallBack)
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
        signingKeys: keyOpenPGP_obj.privateKeyObj
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