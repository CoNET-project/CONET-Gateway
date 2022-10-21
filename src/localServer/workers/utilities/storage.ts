
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
		conetTokenPreferences: initCoNETTokenPreferences(),
		usdcTokenPreferences: initUSDCTokenPreferences()
	}

	const data: systemInitialization = {
		preferences: preferences,
		passcode: {
			status: 'LOCKED'
		},
		
	}

	cmd.data = [data]
	return returnCommand (cmd)
	
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
	
	try {
		await database.remove (await database.get ('init', {latest: true}))
		preferences =  {
			language: CoNET_Data.preferences.language,
			theme: CoNET_Data.preferences.theme
		}
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
