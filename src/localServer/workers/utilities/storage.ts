

let database: PouchDB.Database

const initNullSystemInitialization = () => {
    const data: systemInitialization = {
        preferences: {
            preferences: null
        },
        passcode: {
            status: 'NOT_SET'
        },
        profile: {
            profiles: []
        },
        SeguroNetwork: {
            SeguroStatus: 'FINISHED',
            SeguroObject: {}
        }
    }
    systemInitialization = data
    systemInitialization_UUID = ''
    pass = SeguroKeyChain = null
    return data
}
const returnInitNull = (cmd: worker_command) => {
    cmd.data = [initNullSystemInitialization()]
    returnCommand ( cmd )
}

const checkStorage = () => {
    database = new PouchDB('SEGURO', { auto_compaction: true })
    const cmd: worker_command = {
        cmd: 'READY',
        data: []
    }
    
    //invitation (cmd)
    return database.get ('init')
    .then ((doc: any) => {
        try {
            cmd.data = [JSON.parse ( buffer.Buffer.from (doc.title,'base64').toString ())]
        } catch ( ex ) {
            cmd.err = 'PouchDB_ERROR'
            logger (`checkStorage JSON.parse error`, buffer.Buffer.from (doc.title,'base64').toString ())
            return returnInitNull (cmd)
        }
        const initData = cmd.data[0]
        if ( systemInitialization_UUID = initData.uuid ) {
            return getUUIDFragments (cmd.data[0].uuid, ( err, data: any ) => {
                if ( err ) {
                    cmd.err = 'PouchDB_ERROR'
                    logger (`checkStorage getUUIDFragments [${ cmd.data[0] }] ERROR`, err )
                    return returnInitNull (cmd)
                }
                
                SeguroKeyChain = {
                    containerKeyPair: initData.container,
                    encryptedString: data,
                    toStoreObj: null,
                    keyChain: {
                        deviceKeyPair: {
                            privateKeyArmor: '',
                            publicKeyArmor: '',
                            keyOpenPGP_obj: null
                        },
                        seguroAccountKeyPair: {
                            privateKeyArmor: '',
                            publicKeyArmor: '',
                            keyOpenPGP_obj: null
                        },
                        profiles: []
                    },
                    isReady: false
                }

                pass = initData.id
				
                const initLocked = () => {
                    const data: systemInitialization = {
                        preferences: {
                            preferences: initData.preferences,
                        },
                        passcode: {
                            status: 'LOCKED'
                        },
                        profile: {
                            profiles: []
                        },
                        SeguroNetwork: {
                            SeguroStatus: 'INIT',
                            SeguroObject: {}
                        }
                    }
                    cmd.data = [systemInitialization = data]
                    returnCommand ( cmd )
                }

                return initLocked ()
            })
        }
        return returnInitNull (cmd)
    }).catch ((ex: Error ) => {
        return returnInitNull (cmd)
    })
}

const storeContainer = ( CallBack: ( err?: Error ) => void ) => {

    if (!SeguroKeyChain) {
        return CallBack (new Error ('have no SeguroKeyChain!'))
    }
    const container: encrypt_keys_object = SeguroKeyChain.toStoreObj ()
    const putData = {
        _id: 'init',
        title: buffer.Buffer.from(JSON.stringify ({
            container: container.containerKeyPair,
            id: pass,
            uuid: systemInitialization_UUID,
            preferences: systemInitialization?.preferences.preferences
        })).toString ('base64')
    }
    if ( !database ) {
        database = new PouchDB('SEGURO', { auto_compaction: true })
    }
    return database.get ('init')
    .then(res => database?.remove (res))
    .then(() => database?.put(putData))
    .then (() => database?.compact())
    .then(() => CallBack())
    .catch ( ex => {
        database?.put(putData)
        .then(() => CallBack())
        .catch ( ex => {
            CallBack ( ex )
        })
    })
}

const getUUIDFragments = ( uuid: string, CallBack: ( ex: Error|null, data?: PouchDB.Core.Attachments|undefined ) => void ) => {
    if ( !database ) {
        database = new PouchDB('SEGURO', { auto_compaction: true })
    }
    database.get (uuid)
    .then ((data: any ) => {
        return CallBack ( null, data.title )
    })
    .catch ( ex => {
        return CallBack ( ex )
    })
}

const storeUUID_Fragments = ( encrypted: string, CallBack: ( ex: Error|null, data?: any ) => void ) => {
    if ( !database ) {
        database = new PouchDB('SEGURO', { auto_compaction: true })
    }
    const putData = {
        title: encrypted
    }
    
    database.post( putData )
    .then( data => CallBack ( null, data ))
    .catch ( ex => CallBack ( ex ))
}

const deleteUUID_DFragments = (uuid: string, CallBack: (ex: Error|null) => void ) => {
    if ( !database ) {
        database = new PouchDB('SEGURO', { auto_compaction: true })
    }
    if ( !uuid ) {
        const err = 'deleteUUID_DFragments uuid have NONE Error'
        logger (err)
        return CallBack (new Error (err))
    }
    return database.get (uuid)
        .then ( res => database?.remove (res))
        .then (() => database?.compact())
        .then (() => CallBack(null))
        .catch(ex => CallBack (ex))
}

const storage_StoreContainerData = (cmd: worker_command) => {
    
    const encryptedText = SeguroKeyChain?.encryptedString ||''
    const oldUuid = systemInitialization_UUID
    logger ('storage_StoreContainerData start!')
    return async.waterfall ([
        (next:any) => {
            if (!oldUuid) {
                return next ()
            }
            return deleteUUID_DFragments (oldUuid, next)
        },
        (next: any) => storeUUID_Fragments ( encryptedText, next ),
        ( data: any, next: any )  => {
            logger (`storeUUIDFragments SUCCESS UUID = [${ data.id }]`)
            systemInitialization_UUID = data.id
            return storeContainer ( next )
        },
    ], err => {
        if ( err ) {
            logger (`storage_StoreContainerData ERROR!`, err )
            cmd.err = 'PouchDB_ERROR'
            return returnCommand ( cmd )
        }
        return returnSeguroInitializationData (cmd)
    })
}

const returnSeguroInitializationData = (cmd: worker_command) => {
    delete cmd.err
    if ( !systemInitialization || !SeguroKeyChain ) {
        cmd.err = 'NOT_READY'
        logger (`storage_StoreContainerData !systemInitialization Error!`)
        return returnCommand ( cmd )
    }
    const preferences = systemInitialization.preferences
    const profile = SeguroKeyChain.keyChain.profiles
    // const _profile: profile[] = []
    // profile.forEach ( n => {
    //     const ret: profile = {
    //         publicKeyArmor: '',
    //         keyID: n.keyID,
    //         privateKeyArmor: '',
    //         keyOpenPGP_obj: null,
    //         nickname: n.nickname || '',
    //         tags: n.tags || [],
    //         alias: n.alias || '',
    //         bio: n.bio||'',
    //         isPrimary: n.isPrimary||false,
    //         profileImg: n.profileImg||''
    //     }
        
    //     _profile.push (ret)
    // })

    const data: systemInitialization = {
        preferences: {
            preferences: preferences.preferences
        },
        passcode: {
            status: 'UNLOCKED'
        },
        profile: {
            profiles: profile
        },
        SeguroNetwork: systemInitialization.SeguroNetwork
    }

    cmd.data = [data]
    return returnCommand (cmd)
    
}

const encrypt_deletePasscode = (cmd: worker_command) => {
    if ( !database ) {
        database = new PouchDB('SEGURO', { auto_compaction: true })
    }
    delete cmd.err
    cmd.data = []
    database.destroy()
    .then (() => returnInitNull (cmd))
    .catch ( err => {
        logger (`encrypt_deletePasscode ERROR`, err )
        cmd.err = 'PouchDB_ERROR'
        return returnCommand (cmd)
    })
}

const storePreferences = (cmd: worker_command) => {
    if ( !cmd.data || !cmd.data.length || !systemInitialization || !SeguroKeyChain) {
        logger (`storePreferences ERROR have not attach preferences DATA`)
        cmd.err = 'INVALID_DATA'
        return returnCommand (cmd)
    }
    systemInitialization.preferences.preferences = cmd.data[0]
    return storeContainer( err => {
        if ( err) {
            logger (`storePreferences Database Error`, err)
            cmd.err = 'PouchDB_ERROR'
            return returnCommand (cmd)
        }
        return returnCommand (cmd)
    })

}