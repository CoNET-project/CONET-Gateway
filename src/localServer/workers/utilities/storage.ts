
let database

const initNullSystemInitialization = () => {
    const data = {
        passcode: {
            status: 'NOT_SET'
        }
    }
    return data
}

const returnInitNull = async (cmd: worker_command) => {
	delete cmd.err
    cmd.data = [initNullSystemInitialization()]
    returnCommand ( cmd )
	await deleteExistDB()
	database = null
}

const checkStorage = async () => {
    database = new PouchDB( databaseName, { auto_compaction: true })
    const cmd: worker_command = {
        cmd: 'READY',
        data: []
    }

	let doc
	let initData: CoNETIndexDBInit
    try {
		doc = await database.get ('init', {latest: true})
		initData = JSON.parse ( buffer.Buffer.from (doc.title,'base64').toString ())
		
	} catch (ex) {
        logger (`checkStorage have no CoNET data in IndexDB, INIT CoNET data`)
		return returnInitNull (cmd)
	}


	if ( !initData.container || !initData.id ) {
		logger (`checkStorage have not USER profile!`)
		return returnInitNull (cmd)
	}

	containerKeyObj = {
		privateKeyArmor: initData.container.privateKeyArmor,
		publicKeyArmor: initData.container.publicKeyArmor
	}

	passObj = initData.id
	preferences = initData.preferences
	systemInitialization_UUID = initData.uuid
	doc = await getUUIDFragments (systemInitialization_UUID)

	if (!doc?.title) {
		logger (`checkStorage getUUIDFragments had NUll, IndexDB has DAMAGE` )
		return returnInitNull (cmd)
	}

	CoNET_Data = {
		isReady: false,
		encryptedString: doc.title,
		clientPool: []
	}

	const data: systemInitialization = {
		preferences: preferences,
		passcode: {
			status: 'LOCKED'
		},
	}
	
	cmd.data = [data]
	returnCommand (cmd)
	if (!activeNodes?.length ) {
		activeNodes = await _getSINodes ('CUSTOMER_REVIEW', 'USA')
	}

    //          already init database
    // fetchProxyData(`http://localhost:3001/connecting`, data => {
    //     processCmd (data)
    // })
}

const getUUIDFragments = async ( uuid: string ) => {
    if ( !database ) {
        database = new PouchDB( databaseName, { auto_compaction: true  })
    }
	let doc
	try {
		doc = await database.get (uuid, {latest: true} )
	} catch (ex) {
		return null
	}
    return doc
}

const storeUUID_Fragments = async () => {
	if ( !CoNET_Data?.encryptedString) {
		return logger (`storeUUID_Fragments Error! CoNET_Data?.encryptedString === null`)
	}
	if ( !database ) {
        database = new PouchDB(databaseName, { auto_compaction: true  })
    }
    const putData = {
        title: CoNET_Data?.encryptedString
    }
	const doc = await database.post( putData )
	return systemInitialization_UUID = doc.id
}

const storeCoNET_initData = async () => {
	if ( !containerKeyObj?.publicKeyArmor || !CoNET_Data || !passObj ) {
		const msg = `storeUUID_Fragments Error: encrypted === null`
		return logger (msg)
	}
    if ( !database ) {
        database = new PouchDB( databaseName, { auto_compaction: true  })
    }
	passObj.passcode = passObj._passcode = passObj.password = ''
	let preferences = {}
	if (CoNET_Data.preferences) {
		preferences =  {
			language: CoNET_Data.preferences?.langurge,
			theme: CoNET_Data.preferences?.theme
		}
	}
	
	try {
		await database.remove (await database.get ('init', {latest: true}))
		
	} catch (ex) {
		logger (`database.remove 'init' error! keep next`, ex)
	}

	const CoNETIndexDBInit: CoNETIndexDBInit = {
		container: {
			privateKeyArmor: containerKeyObj.privateKeyArmor,
			publicKeyArmor: containerKeyObj.publicKeyArmor
		},
		id: passObj,
		uuid: systemInitialization_UUID,
		preferences: preferences		
				
	}
    const putData = {
        _id: 'init',
        title: buffer.Buffer.from(JSON.stringify (CoNETIndexDBInit)).toString ('base64')
    }

	return await database.post( putData )
}

const deleteUUID_DFragments = async ( uuid: string) => {

	if ( !uuid ) {
        const err = 'deleteUUID_DFragments have NONE uuid Error'
        logger (err)
        return
    }
	if ( !database ) {
		database = new PouchDB( databaseName, { auto_compaction: true  })
	}
	try {
		await database.remove (await database.get (uuid, {latest: true}))
	} catch (ex) {
		return
	}
	
	return await database.compact()
	
}

const storage_StoreContainerData = async () => {
    
	if (!CoNET_Data) {
		const msg = `storage_StoreContainerData Error: CoNET_Data === null`
		return logger (msg)
	}
	await encryptCoNET_Data_WithContainerKey()
    const oldUuid = systemInitialization_UUID
    logger ('storage_StoreContainerData start! oldUuid = ', oldUuid)

	if ( oldUuid ) {
		await deleteUUID_DFragments (oldUuid)
	}
	const ret = await storeUUID_Fragments ()
	if ( !ret ) {
		return logger (`storage_StoreContainerData Error: storeUUID_Fragments () === null`)
	}
	return storeCoNET_initData ()
}

const deleteExistDB = async () => {
    if ( !database ) {
        database = new PouchDB( databaseName, { auto_compaction: true  })
    }
    return await database.destroy()
}

const storeProfile = async (cmd: worker_command, callback?) => {
	const _profiles: profile[] = cmd?.data[0]
	if ( !CoNET_Data || !CoNET_Data.profiles ) {
		cmd.err = 'INVALID_DATA'
		return callback ? callback () : returnCommand (cmd)
	}
	delete cmd.err
	callback ? callback () : returnCommand (cmd)

	if ( _profiles.length && typeof _profiles.filter === 'function'){
		CoNET_Data.profiles = CoNET_Data.profiles.map (n => {
			const prof = _profiles.filter (nn => nn.keyID === n.keyID)[0]
			if ( prof ) {
				prof.tokens = n.tokens
				return prof
			}
			return n
		})
	}
	
	await storage_StoreContainerData ()
}

const cacheProfile = async (urlData: urlData) => {
	if (urlData.method !== 'GET') {
		return null
	}
	const hash = CoNETModule.Web3Utils.sha3(urlData.href)
	if ( !database ) {
        database = new PouchDB( databaseName, { auto_compaction: true  })
    }

	let result: fetchCashStorageData
	try {
		const doc = await database.get (hash, {latest: true})
		if (!doc?.title) {
			return null
		}
		const data = buffer.Buffer.from(doc.title, 'base64').toString()
		result = JSON.parse (data)
	} catch (ex) {
		return null
	}

	return result
}

const storageCache = async (urlHash: string, data: fetchCashStorageData ) => {
	if ( !database ) {
        database = new PouchDB(databaseName, { auto_compaction: true  })
    }

	const putData = {
        _id: urlHash,
		title: buffer.Buffer.from(JSON.stringify(data)).toString('base64')
    }
	await database.post( putData )
}