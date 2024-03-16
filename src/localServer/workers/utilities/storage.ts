
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
	platform.passcode = 'NONE'
}

const checkStorage = async (plarformChannel: BroadcastChannel) => {
    const database = new PouchDB( databaseName, { auto_compaction: true })
    const cmd: worker_command = {
        cmd: 'READY',
        data: []
    }

	let doc
	let initData: CoNETIndexDBInit
	CoNET_Data = {
		isReady: false,
		encryptedString: '',
		mnemonicPhrase: '',
		ver: 0
	}
    try {
		doc = await database.get ('init', {latest: true})
		initData = JSON.parse ( buffer.Buffer.from (doc.title,'base64').toString ())
		passObj = initData.id
		preferences = initData.preferences
		doc = await database.get (initData.uuid, {latest: true})
		CoNET_Data.encryptedString = doc.title
		
	} catch (ex) {
        logger (`checkStorage have no CoNET data in IndexDB, INIT CoNET data`)
		plarformChannel.postMessage('NONE')
		return returnInitNull (cmd)
	}

	// if (initData.container) {
	// 	containerKeyObj = {
	// 		privateKeyArmor: initData.container.privateKeyArmor,
	// 		publicKeyArmor: initData.container.publicKeyArmor
	// 	}
	// }
	
	const data: systemInitialization = {
		preferences: preferences,
		passcode: {
			status: 'LOCKED'
		},
	}
	platform.passcode = 'LOCKED'
	cmd.data = [data]
	plarformChannel.postMessage('LOCKED')
	returnCommand (cmd)

    //          already init database
    // fetchProxyData(`http://localhost:3001/connecting`, data => {
    //     processCmd (data)
    // })
}


const deleteExistDB = async () => {
    const database = new PouchDB( databaseName, { auto_compaction: true  })
    return await database.destroy()
}

const cacheProfile = async (urlData: urlData) => {
	if (urlData.method !== 'GET') {
		return null
	}
	const hash = CoNETModule.Web3Utils.sha3(urlData.href)
	
    const database = new PouchDB( databaseName, { auto_compaction: true  })
    

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
	const database = new PouchDB( databaseName, { auto_compaction: true  })
	const putData = {
        _id: urlHash,
		title: buffer.Buffer.from(JSON.stringify(data)).toString('base64')
    }
	await database.post( putData )
}