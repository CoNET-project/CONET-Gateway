

const registerReferrer = async (referrer: string) => {
	if (!CoNET_Data?.profiles) {
		return logger(`registerReferrer CoNET_Data?.profiles Empty error!`)
	}

	const profile = CoNET_Data.profiles[0]
	if (!profile||!referrer) {
		return false
	}

	if (referrer.toLowerCase() === profile.keyID.toLowerCase() || profile.referrer) {
		return false
	}

	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	const wallet = new ethers.Wallet(profile.privateKeyArmor, provideNewCONET)
	const CNTP_Referrals = new ethers.Contract(ReferralsAddressV2, CONET_ReferralsAbi, wallet)

	try {
		await CNTP_Referrals.addReferrer(referrer)
	} catch (ex: any) {
		if (/sender already has referrer/.test(ex.message)) {
			return false
		}
		logger(`registerReferrer Error`, ex)
		return false
	}
	profile.referrer = referrer
	return true
}

const getProfileAssetsBalance = async (profile: profile) => {

	const key = profile.keyID
	
	if (key) {
		const current = profile.tokens
		checkTokenStructure(current)

		const provideETH = new ethers.JsonRpcProvider(ethRpc)
		const provideBlast = new ethers.JsonRpcProvider(blast_sepoliaRpc)
		const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
		const provideBlastMainChain = new ethers.JsonRpcProvider(blast_mainnet)
		const provideBNB = new ethers.JsonRpcProvider(bsc_mainchain)
		// const walletETH = new ethers.Wallet(profile.privateKeyArmor, provideETH)
		const [balanceCNTP, balanceCNTPB, balanceUSDT, ETH, blastETH, usdb, bnb, wbnb, wusdt, conet_Holesky, dWBNB, dUSDT, dWETH] = await Promise.all([
			scanCNTP (key, provideBlast),
			scanCNTPB (key, provideCONET),
			scanUSDT (key, provideETH),
			scanETH (key, provideETH),
			scanBlastETH (key, provideBlastMainChain),
			scanUSDB (key, provideBlastMainChain),
			scanBNB (key, provideBNB),
			scanWBNB (key,provideBNB),
			scanWUSDT (key,provideBNB),
			scanCONETHolesky(key, provideCONET),
			scanCONET_dWBNB(key, provideCONET),
			scanCONET_dUSDT(key, provideCONET),
			scanCONET_dWETH(key, provideCONET)
		])
		

		current.cntp.balance = balanceCNTP === BigInt(0) ? '0' : parseFloat(ethers.formatEther(balanceCNTP)).toFixed(4)
		current.cntpb.balance = balanceCNTPB === BigInt(0) ? '0' : parseFloat(ethers.formatEther(balanceCNTPB)).toFixed(4)
		current.usdt.balance = balanceUSDT === BigInt(0) ? '0' :
		//	@ts-ignore
		parseFloat(balanceUSDT/BigInt(10**6)).toFixed(4)

		current.eth.balance = ETH === BigInt(0) ? '0' : parseFloat(ethers.formatEther(ETH)).toFixed(4)
		current.blastETH.balance = blastETH === BigInt(0) ? '0' : parseFloat(ethers.formatEther(blastETH)).toFixed(4)
		current.usdb.balance = usdb === BigInt(0) ? '0' : parseFloat(ethers.formatEther(usdb)).toFixed(4)
		current.wbnb.balance = wbnb === BigInt(0) ? '0' : parseFloat(ethers.formatEther(wbnb)).toFixed(4)
		current.bnb.balance = bnb === BigInt(0) ? '0' : parseFloat(ethers.formatEther(bnb)).toFixed(4)
		current.wusdt.balance = wusdt === BigInt(0) ? '0' : parseFloat(ethers.formatEther(wusdt)).toFixed(4)
		current.conet.balance = conet_Holesky === BigInt(0) ? '0' : parseFloat(ethers.formatEther(conet_Holesky)).toFixed(4)

		current.dWBNB.balance = dWBNB === BigInt(0) ? '0' :  parseFloat(ethers.formatEther(dWBNB)).toFixed(4)
		current.dUSDT.balance = dUSDT === BigInt(0) ? '0' :  parseFloat(ethers.formatEther(dUSDT)).toFixed(4)
		current.dWETH.balance = dWETH === BigInt(0) ? '0' :  parseFloat(ethers.formatEther(dWETH)).toFixed(4)


	}

	return false
}

const sendState = (state: listenState, value: any) => {
	const sendChannel = new BroadcastChannel(state)
	sendChannel.postMessage (JSON.stringify(value))
	sendChannel.close()
}

const listenProfileVer = (wallet: string) => {
	const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
	provideCONET.on('block', async block => {
		
		const nonce = await provideCONET.getTransactionCount (wallet)
		if (!CoNET_Data) {
			return logger(`listenProfileVer Error! have none CoNET_Data`)
		}

		if (nonce > CoNET_Data.nonce) {
			return checkUpdateAccount ()
		}
	})
}

let checkProfileVersionRoopCount = 0
const checkProfileVersion = (wallet: string, callback: (ver: number, nonce?: number) => void) => {
	if (++checkProfileVersionRoopCount > 5) {
		return callback(-1)
	}

	const provide = new ethers.JsonRpcProvider(conet_rpc)
	
	const conet_storage = new ethers.Contract(conet_storage_contract_address, conet_storageAbi, provide)

	conet_storage.count(wallet)
		.then (async count => {
			checkProfileVersionRoopCount = 0
			const nonce = await provide.getTransactionCount (wallet)
			return callback (parseInt(count.toString()), nonce)
		}).catch (ex => {
			logger(`checkCoNET_DataVersion error! Try again! roop = [${checkProfileVersionRoopCount}]`, ex)
			return setTimeout(() => {
				return checkProfileVersion( wallet, callback)
			}, 1000)
			
		})
}

const _storagePieceToLocal = (mnemonicPhrasePassword: string, fragment: string, index: number,
	totalFragment: number, targetFileLength: number, ver: number, privateArmor: string, keyID: string
) => new Promise( async resolve=> {

	const partEncryptPassword = encryptPasswordIssue(ver, mnemonicPhrasePassword, index)
	const localData = {
		data: fragment,
		totalFragment: totalFragment,
		index
	}
	const piece = {
		localEncryptedText: await CoNETModule.aesGcmEncrypt (JSON.stringify(localData), partEncryptPassword),
		fileName: createFragmentFileName(ver, mnemonicPhrasePassword, index),
	}
	//logger(`storage version ${ver} fragment  No.[${index}] [${piece.fileName}] with password ${partEncryptPassword}`)
	async.parallel([
		next => storageHashData (piece.fileName, piece.localEncryptedText).then(()=> next(null)),
	], err=> {
		logger(`async.parallel finished err = [${err}]`)
		resolve(false)
	})
})

const storagePieceToLocalAndIPFS = ( mnemonicPhrasePassword: string, fragment: string, index: number,
		totalFragment: number, targetFileLength: number, ver: number, privateArmor: string, keyID:string
	) => {
	return new Promise(async resolve=> {
		
		const _dummylength = targetFileLength - fragment.length > 1024 * 5 ? targetFileLength - totalFragment : 0
		const dummylength = (totalFragment === 2 && _dummylength )
			? Math.round((targetFileLength - fragment.length) * Math.random()) : 0
		const dummyData = buffer.Buffer.allocUnsafeSlow( dummylength)
		const partEncryptPassword = encryptPasswordIssue(ver, mnemonicPhrasePassword, index)
		const localData = {
			data: fragment,
			totalFragment: totalFragment,
			index
		}
		const IPFSData = {
			data: fragment,
			totalFragment: totalFragment,
			index,
			dummyData: dummyData
		}
		const piece: fragmentsObj = {
			localEncryptedText: await CoNETModule.aesGcmEncrypt (JSON.stringify(localData), partEncryptPassword),
			remoteEncryptedText: await CoNETModule.aesGcmEncrypt (JSON.stringify(IPFSData), partEncryptPassword),
			fileName: createFragmentFileName(ver, mnemonicPhrasePassword, index),
		}
		
		return async.parallel([
			next => storageHashData (piece.fileName, piece.localEncryptedText).then(()=> next(null)),
			next => updateFragmentsToIPFS(piece.remoteEncryptedText, piece.fileName, keyID, privateArmor)
				.then(() => getFragmentsFromPublic(piece.fileName)
				.then( data=> {
					if (!data) {
						const err = `storagePieceToLocalAndIPFS review storage version ${ver} fragment No.[${index}] Error! try again`
						logger(err)
						return next(err)
					}
					return next(null)
					}
				)
			)
		], err=> {
			if (err) {
				return storagePieceToLocalAndIPFS (mnemonicPhrasePassword, fragment, index, totalFragment, targetFileLength, ver, privateArmor, keyID)
			}
			
			return resolve(null)
		})
		
	})

}

const initSystemDataV1 = async (acc) => {
	
	const key = await createGPGKey('', '', '')

	const profile: profile = {
		tokens: initProfileTokens(),
		publicKeyArmor: acc.publicKey,
		keyID: acc.address,
		isPrimary: true,
		referrer: null,
		pgpKey: {
			privateKeyArmor: key.privateKey,
			publicKeyArmor: key.publicKey
		},
		privateKeyArmor: acc.signingKey.privateKey,
		hdPath: acc.path,
		index: acc.index,
		network: {
			recipients: []
		}
	}
	CoNET_Data = {
		mnemonicPhrase: acc.mnemonic.phrase,
		profiles:[profile],
		ver: 0,
		isReady: true,
		nonce: 0
	}
	
}

const initCoNET_Data = async ( passcode = '' ) => {
	
    //const acc = createKey (1)
	const acc = createKeyHDWallets()
	if (!acc) {
		return 
	}
	await initSystemDataV1(acc)
}

const storeSystemData = async () => {

	if (!CoNET_Data||! passObj?.passcode) {
		return
	}
	const password = passObj.passcode.toString()
	const data = {
		mnemonicPhrase: CoNET_Data.mnemonicPhrase,
		dammy: buffer.Buffer.allocUnsafeSlow( 1024 * ( 20 + ( Math.random()*20)))
	}

	const waitEntryptData = buffer.Buffer.from(JSON.stringify(data))
	
	const filenameIterate1 = ethers.id(password)
	const filenameIterate2 = ethers.id(filenameIterate1)
	const filenameIterate3 = ethers.id(ethers.id(ethers.id(filenameIterate2)))

	const encryptIterate1 = await CoNETModule.aesGcmEncrypt (waitEntryptData, password)
	const encryptIterate2 = await CoNETModule.aesGcmEncrypt (encryptIterate1, filenameIterate1)
	const encryptIterate3 = await CoNETModule.aesGcmEncrypt (encryptIterate2, filenameIterate2)
	
	const filename =  filenameIterate3

	CoNET_Data.encryptedString = encryptIterate3
	
	if (!CoNET_Data.encryptedString) {
		return logger(`encryptStoreData aesGcmEncrypt Error!`)
	}
	passObj.passcode = passObj.password = passObj._passcode = ''

	const CoNETIndexDBInit: CoNETIndexDBInit = {
		id: passObj,
		preferences: CoNET_Data.preferences
	}


	sendState('beforeunload', true)

	try {
		await storageHashData ('init', buffer.Buffer.from(JSON.stringify (CoNETIndexDBInit)).toString ('base64'))
		await storageHashData (filename, CoNET_Data.encryptedString)
	} catch (ex) {
		logger(`storeSystemData storageHashData Error!`, ex)
	}

	sendState('beforeunload', false)
}

const resizeImage = ( mediaData: string, imageMaxWidth: number, imageMaxHeight: number ) => {
	return new Promise(resolve => {
		const media = mediaData.split(',')
		const _media = buffer.Buffer.from ( media[1], 'base64')
		
		const ret = {
			total_bytes: media[1].length,
			media_type: 'image/png',
			rawData: media[1],
			media_id_string: null
		}
		
		
		//if ( mediaData.length > maxImageLength) {
		const exportImage = ( _type, img ) => {
			return img.getBuffer ( _type, ( err, _buf: Buffer ) => {
				if ( err ) {
					return resolve ( false )
				}
				ret.rawData = _buf.toString( 'base64' )
				ret.total_bytes = _buf.length
	
				return resolve ( ret )
			})
		}
	
		return Jimp.read ( _media, ( err, image ) => {
			if ( err ) {
				return resolve ( false )
			}
			const uu = image.bitmap
	
			if ( uu.height +  uu.width > imageMaxHeight + imageMaxWidth ) {
				if ( uu.height > uu.widt ) {
					image.resize ( Jimp.AUTO, imageMaxHeight )
				} else {
					image.resize ( imageMaxWidth, Jimp.AUTO )
				}
			
			}
			//		to PNG
	
			return image.deflateStrategy ( 2, () => {
				return exportImage ( ret.media_type, image )
			})
			
		})
	})

	
}

const checkUpdateAccount = () => {

	return new Promise(resolve=> {
		if (!CoNET_Data || !CoNET_Data.profiles?.length) {
			resolve(false)
			return logger(`checkUpdateAccount CoNET_Data or CoNET_Data.profiles hasn't ready Error!`)
		}
		const currentTimestamp = new Date().getTime()
		if (currentTimestamp - lastCheckcheckUpdateTimeStamp < minCheckTimestamp) {
			return resolve(false)
		}
		if (checkcheckUpdateLock) {
			return resolve(false)
		}
		checkcheckUpdateLock = true
		const profile = CoNET_Data.profiles[0]
		return checkProfileVersion( profile.keyID, async (_ver, nonce) => {
			if (!CoNET_Data || !nonce ||!_ver) {
				checkcheckUpdateLock = false
				return resolve(false)
			}
			CoNET_Data.nonce = nonce
			if (_ver <= CoNET_Data.ver) {
				checkcheckUpdateLock = false
				return resolve(true)
			}
			
			const result = _result => {
				if ( !_result ) {
					
					if (--_ver > 0 ) {
						logger(`checkUpdateAccount version [${_ver}] getVersonFragments got false ERROR!, try get previous version [${_ver}]`)
						return getVersonFragments (currentTimestamp, _ver, nonce, result)
					}
					checkcheckUpdateLock = false
					return resolve(false)
				}
				checkcheckUpdateLock = false
				resolve(true)
			}

			return getVersonFragments (currentTimestamp, _ver, nonce, result)
		})
	})
	
}



let assetPrice: assetsStructure[] = []
const OracolTime = 5 * 60 * 1000
const getAPIPrice: () => Promise<assetsStructure[]|boolean> = () => new Promise ( resolve => {
	if (assetPrice.length) {
		const time = new Date ().getTime()
		const dataTimestamp = parseInt(assetPrice[0].timestamp)
		if (time - dataTimestamp < OracolTime) {
			return resolve (assetPrice)
		}
	}
	const url = `${api_endpoint}asset-prices`
	fetch(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		},
		cache: 'no-store',
		referrerPolicy: 'no-referrer'
	}).then ( async res => {
		if (res.status!== 200) {
			const err = `getPrice [${url}] response not 200 Error! try again!`
			logger(err)
			return resolve (false)
		}
		return res.json()
	}).then((data: assetsStructure[]) => {
		assetPrice = data
		resolve(data)
	})
	.catch (ex=> {
		logger(ex.message)
		return resolve(false)
	})
})

const CoNET_initData_save = async (database, systemInitialization_uuid: string) => {
	if ( !CoNET_Data || !passObj ) {
		const msg = `storeUUID_Fragments Error: encrypted === null`
		
		return logger (msg)
	}
	
	
	let preferences = {}
	if (CoNET_Data.preferences) {
		preferences =  {
			language: CoNET_Data.preferences?.langurge,
			theme: CoNET_Data.preferences?.theme
		}
	}
	

	const CoNETIndexDBInit: CoNETIndexDBInit = {
		id: passObj,
		preferences: preferences	
	}
	let doc
	try {
		doc = await database.get ('init', {latest: true})
		
	} catch (ex) {
		logger (`database.get 'init' error! keep next`, ex)
		
	}
    const putData = {
        _id: 'init',
        title: buffer.Buffer.from(JSON.stringify (CoNETIndexDBInit)).toString ('base64')
    }
	
	if (doc?._rev) {
		putData['_rev']= doc._rev
	}
	sendState('beforeunload', true)
	const uu = await database.put( putData )
	logger(`storeCoNET_initData database.put return [${uu}]`)
	sendState('beforeunload', false)

}

const storagePieceToLocal = () => {
	
	return new Promise(resolve => {
		if (!CoNET_Data||! CoNET_Data.profiles) {
			logger(`storagePieceToLocal empty CoNET_Data Error!`)
			return resolve (false)
		}
		const profile = CoNET_Data.profiles[0]
		const fileLength = Math.round(1024 * (10 + Math.random() * 20))
		const profilesClearText = JSON.stringify(CoNET_Data.profiles)
		const chearTextFragments = splitTextLimitLength(profilesClearText, fileLength)
		const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
		const privateKeyArmor = profile.privateKeyArmor||''
		const chainVer = CoNET_Data.ver
	
		const series: any[] = []
	
		chearTextFragments.forEach((n, index)=> {
			const stage = next => _storagePieceToLocal(passward, n, index, chearTextFragments.length, 
					fileLength, chainVer, privateKeyArmor, profile.keyID ).then (() => {
				logger(`piece ${index} finished! goto next!`)
				return next(null,null)
			})
			series.push(stage)
		})
	
		return async.series(series).then (async () => {
			
			sendState('beforeunload', false)
			logger(`async.series finished`)
			resolve(true)
		}).catch (ex=> {
			sendState('beforeunload', false)
			logger(`async.series catch ex`, ex)
			resolve(false)
		}) 
	})


}

const recoverProfileFromSRP = () => {
	return new Promise((resolve, reject) => {
		if (!CoNET_Data || !CoNET_Data?.mnemonicPhrase) {
			const errMessage = 'recoverProfileFromSRP CoNET_Data.mnemonicPhrase is null Error!'
			return reject(new Error(errMessage))
		}
		const SRP = CoNET_Data.mnemonicPhrase
		let acc
		try {
			acc = ethers.Wallet.fromPhrase(SRP)
		} catch (ex) {
			logger(`recoverAccount Phrase SRP Error! [${SRP}]`)
			return reject (ex)
		}

		const privateKey = acc.signingKey.privateKey
		const publicKey = acc.address

		return checkProfileVersion(publicKey, async ver => {
			
			//		network error!
			if (ver < 0) {
				const errMessage =`recoverProfileFromSRP checkProfileVersion RoopCount > 5! Stop trying!`
				return reject (new Error(errMessage))
			}
			//		init
			await initSystemDataV1(acc)
			if (ver === 0) {
				// await getFaucet (publicKey)
				return resolve(true)
			}
			
			logger(`recoverProfileFromSRP has update file in IPFS!`)
			await getLocalProfile(ver)

			return resolve(true)
			//const firstprice = getFirstFragmentName(SRP, ver)
			
		})
	})

}

const createFragmentFileName = (ver: number, password: string, part: number) => {
	return ethers.id(ethers.id(ethers.id(ethers.id(ver.toString()) + ethers.id(password) + ethers.id(part.toString()))))
}

const getNextFragmentIPFS = async (ver: number, passObjPassword: string, i) => {
	const nextEncryptPassword = encryptPasswordIssue(ver, passObjPassword, i)
	const nextFragmentHash = createFragmentFileName(ver, passObjPassword, i)
	const nextFragmentText = await getFragmentsFromPublic(nextFragmentHash)
	logger(`getNextFragmentIPFS [${nextFragmentHash}] length = ${nextFragmentText.length}`)
	if (!nextFragmentText) {
		logger(`getNextFragmentIPFS Fetch [${nextFragmentHash}] got remote null Error!`)
		return ''
	}
	try {
		const decryptedText = await CoNETModule.aesGcmDecrypt (nextFragmentText, nextEncryptPassword)
		const decryptedFragment = JSON.parse(decryptedText)
		return decryptedFragment.data
	} catch (ex) {
		logger(`getNextFragmentIPFS aesGcmDecrypt [${nextFragmentText}] error!`, ex)
	}
}

const getFragmentsFromPublic: (hash: string) => Promise<string> = (hash) => {
	const fileUrl = cloudStorageEndpointUrl + `${hash}`
	return new Promise(resolve=> {fetchWithTimeout (fileUrl, 
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8',
				'Connection': 'close',
			},
			cache: 'no-store',
			referrerPolicy: 'no-referrer'
		}).then ( res => {
			if (res.status!== 200) {
				logger(`getFragmentsFromPublic can't get hash ${hash} Error!`)
				return ''
			}
			return res.text()
		}).then( async text => {
			return resolve(text)
		})
	})
}


const encryptPasswordIssue = (ver: number, passcode: string, part: number) => {
	const password =  ethers.id('0x' + (BigInt(ethers.id(ver.toString())) + BigInt(ethers.id(passcode))).toString(16))
	let _pass = ethers.id(password)
	for (let i = 0; i < part; i++) {
		_pass = ethers.id(_pass)
	}
	return _pass.substring(2)
}

const updateFragmentsToIPFS = async (encryptData: string, hash: string, keyID: string, privateKeyArmor: string) => {

		
	const url = `${ api_endpoint }storageFragments`
	
	const message =JSON.stringify({ walletAddress: keyID, data: encryptData, hash})
	const messageHash = ethers.id(message)

	const signMessage = CoNETModule.EthCrypto.sign(privateKeyArmor, messageHash)

	const sendData = {
		message, signMessage
	}
	const result: any = await postToEndpoint(url, true, sendData)
	logger(`updateProfiles got result [${result}] from conet api server!`)
}

const getCurrentProfileVer = async (storageVer: any, address: string) => {
	let rc
	try {
		rc = await storageVer.count(address)
	} catch(ex) {
		logger(`getCurrentVer error! try again`, ex)
		return -1
	}

	return parseInt(rc)
	
}

let updateChainVersionCount = 0
const updateChainVersion = async (storageVer: any) => {
	if (++updateChainVersionCount > 6) {
		updateChainVersionCount = 0
		return
	}

	let rc
	try {
		const tx = await storageVer.versionUp('0x0')
		rc = await tx.wait ()
	} catch(ex) {
		logger(`updateChainVersion error! try again`, ex)
		return await updateChainVersion (storageVer)
	}
	const logs = rc.logs[0]
	let ver = -1
	if (logs?.args) {
		ver = parseInt(logs.args[2])
	}
	return ver
}

const initProfileTokens = () => {
	const ret: conet_tokens = {
		dWETH: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: conet_dWETH,
			name: 'dWETH'
		},
		dUSDT: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: conet_dUSDT,
			name: 'dUSDT'
		},
		dWBNB: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: conet_dWBNB,
			name: 'dWBNB'
		},
		conet: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: '',
			name: 'conet'
		},
		cntp: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: blast_CNTP,
			name: 'cntp'
		},
		cntpb: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: CNTPB_contract,
			name: 'cntpb'
		},
		usdt: {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 6,
			contract: eth_usdt_contract,
			name: 'usdt'
		},
		usdb: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: eth_usdt_contract,
			name: 'usdb'
		},
		eth: {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 18,
			contract: '',
			name: 'eth'
		},
		blastETH: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: '',
			name: 'blastETH'
		},
		wbnb: {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_wbnb_contract,
			name: 'wbnb'
		},
		bnb: {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: '',
			name: 'bnb'
		},
		wusdt: {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_usdt_contract,
			name: 'wusdt'
		}
	}
	return ret
}

const getBlastAssets = (wallet: string) => new Promise( resolve => {
	if (!wallet) {
		return resolve([])
	}

})

const checkTokenStructure = (token: any) => {
	if (!token?.cntp) {
		token.cntp = {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: blast_CNTP,
			name: 'cntp'
		}
	} else {
		token.cntp.name = 'cntp'
	}
	if (!token?.cntpb) {
		token.cntpb = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: CNTPB_contract,
			name: 'cntpb'
		}
	} else {
		token.cntpb.name = 'cntpb'
	}
	if (!token?.usdt) {
		token.usdt = {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 6,
			contract: eth_usdt_contract,
			name: 'usdt'
		}
	} else {
		token.cntpb.name = 'usdt'
	}
	if (!token?.usdb) {
		token.usdb = {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: eth_usdt_contract,
			name: 'usdb'
		}
	} else {
		token.usdb.name = 'usdb'
	}
	if (!token?.eth) {
		token.eth = {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 18,
			contract: '',
			name: 'eth'
		}
	} else {
		token.eth.name = 'eth'
	}
	if (!token?.blastETH) {
		token.blastETH = {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: '',
			name: 'blastETH'
		}
	} else {
		token.blastETH.name = 'blastETH'
	}
	if (!token?.conet) {
		token.conet = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: '',
			name: 'conet'
		}
	} else {
		token.conet.name = 'conet'
	}
	if (!token?.wbnb) {
		token.wbnb = {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_wbnb_contract,
			name: 'wbnb'
		}
	} else {
		token.wbnb.name = 'wbnb'
	}
	if (!token?.bnb) {
		token.bnb = {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: '',
			name: 'bnb'
		}
	} else {
		token.bnb.name = 'bnb'
	}
	if (!token?.wusdt) {
		token.wusdt = {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_usdt_contract,
			name: 'wusdt'
		}
	} else {
		token.wusdt.name = 'wusdt'
	}
		
	
	if (!token?.dWETH) {
		token.dWETH = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: conet_dWETH,
			name: 'dWETH'
		}
	} else {
		token.dWETH.name = 'dWETH'
	}
	if (!token?.dUSDT) {
		token.dUSDT = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: conet_dUSDT,
			name: 'dUSDT'
		}
	} else {
		token.dUSDT.name = 'dUSDT'
	}
	if (!token?.dWBNB) {
		token.dWBNB = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: conet_dWBNB,
			name: 'dWBNB'
		}
	} else {
		token.dWBNB.name = 'dWBNB'
	}
}

let runningGetAllProfileAssetsBalance = false

let lastAllProfileAssetsBalanceTimeStamp = 0
const minCheckTimestamp = 1000 * 12 		//			must big than 12s

const getAllProfileAssetsBalance = async () => {
	return new Promise(async resolve => {
		if (!CoNET_Data?.profiles) {
			logger(`getAllProfileAssetsBalance Error! CoNET_Data.profiles empty!`)
			return resolve (false)
		}

		const timeStamp = new Date().getTime()

		if (timeStamp - lastAllProfileAssetsBalanceTimeStamp < minCheckTimestamp) {
			return resolve (true)
		}

		if (runningGetAllProfileAssetsBalance) {
			return resolve(true)
		}

		runningGetAllProfileAssetsBalance = true

		for (let profile of CoNET_Data.profiles) {
			await getProfileAssetsBalance(profile)
		}
		resolve (true)
		runningGetAllProfileAssetsBalance = false
	})
	
}

const getCONET_HoleskyAssets = (wallet: string) => new Promise( resolve => {
	if (!wallet) {
		return resolve([])
	}
	const api_url = `https://scan.conet.network/api/v2/addresses/${wallet.toLowerCase()}/tokens?type=ERC-20%2CERC-721%2CERC-1155`
	return fetch(api_url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		},
		cache: 'no-store',
		referrerPolicy: 'no-referrer'
	}).then ( async res => res.json())
	.then(result => {
		return resolve(result.items)
	}).catch (ex => {
		logger(`getCONET_HoleskyAssets Error!`, ex)
		return resolve([])
	})
})

let checkcheckUpdateLock = false
let lastCheckcheckUpdateTimeStamp = 0
const getVersonFragments = async (currentTimestamp, _ver, nonce, resolve) => {
	if (!CoNET_Data) {
		checkcheckUpdateLock = false
		logger(`checkUpdateAccount CoNET_Data is empty Error!`)
		return resolve(false)
	}
	lastCheckcheckUpdateTimeStamp = currentTimestamp
	logger(`checkUpdateAccount profile ver is [${_ver}] Local ver is [${CoNET_Data.ver}]`)
	if (typeof nonce !== 'undefined' && nonce > 0) {
		CoNET_Data.nonce = nonce
	}
	if (_ver > CoNET_Data.ver) {

		logger (`checkUpdateAccount current ver [${CoNET_Data.ver}] is old! remote is [${_ver}] Update it`)

		const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
		const partEncryptPassword = encryptPasswordIssue(_ver, passward, 0)
		const firstFragmentName = createFragmentFileName(_ver, passward, 0)
		
		const firstFragmentEncrypted = await getFragmentsFromPublic(firstFragmentName)
		if (!firstFragmentEncrypted) {
			logger(`checkUpdateAccount update error! cant get the first Fragment of ver number${_ver} `)
			checkcheckUpdateLock = false
			return resolve(false)
		}

		logger(`checkUpdateAccount fetch ${_ver} first Fragment [${firstFragmentName}] with passward [${partEncryptPassword}]`)

		let firstFragmentObj
		try{
			const firstFragmentdecrypted = await CoNETModule.aesGcmDecrypt (firstFragmentEncrypted, partEncryptPassword)
			firstFragmentObj = JSON.parse(firstFragmentdecrypted)
		} catch (ex) {
			logger(`checkUpdateAccount update create firstFragmentObj error!`, ex)
			checkcheckUpdateLock = false
			return resolve(false)
		}

		const totalFragment = firstFragmentObj.totalFragment
		let clearData: string = firstFragmentObj.data
		const series: any[] = []

		for (let i = 1; i < totalFragment; i ++) {
			const stage = next => {
				getNextFragmentIPFS(_ver, passward, i)
				.then(text=> {
					if (!text) {
						return next (`getNextFragment [${i}] return NULL Error`)
					}
					clearData += text
					return next(null)
				})
			}
			series.push(stage)
		}

		return async.series(series)
			.then (async () => {
				let profile
				try{
					profile = JSON.parse(clearData)
				} catch(ex){
					logger(`getLocalProfile JSON.parse(clearData) Error`, ex)
					checkcheckUpdateLock = false
					return resolve(false)
				}

				if (CoNET_Data) {
					CoNET_Data.profiles = profile
					CoNET_Data.ver = _ver
				}
				await storagePieceToLocal()
				checkcheckUpdateLock = false
				const versionMargin = _ver - pushedCurrentProfileVersion
				if (versionMargin > 0) {
					const cmd: channelWroker = {
						cmd: 'profileVer',
						data: [versionMargin]
					}
					sendState('toFrontEnd', cmd)
				}
				
				return resolve(true)
			}).catch ( ex=> {
				checkcheckUpdateLock = false
				logger(`checkUpdateAccount async.series catch ex`, ex)
				return resolve(false)
			})
	}

	checkcheckUpdateLock = false
	return resolve(false)
}

const splitTextLimitLength: (test: string, limitLength: number) => string[] = (test, limitLength) => {
	const ret: string[] = []
	let start = 0
	let _limitLength = test.length > limitLength ? limitLength : test.length/2
	const split = () => {

		
		const price = test.substring(start, _limitLength + start)
		if (price.length) {

			ret.push(price)

			start+=_limitLength
			
		}
		if (start < test.length) {
			return split()
		}
		return ret
	}
	return split()
}

const getLocalProfile = async (ver: number) => {
	if (!CoNET_Data?.profiles || !passObj) {
		return logger(`updateProfilesVersion !CoNET_Data[${!CoNET_Data}] || !passObj[${!passObj}] === true Error! Stop process.`)
	}
	
	const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
	const partEncryptPassword = encryptPasswordIssue(ver, passward, 0)
	const firstFragmentName = createFragmentFileName(ver, passward, 0)

	let firstFragmentObj
	try{
		const firstFragmentEncrypted = await getHashData (firstFragmentName)
		const firstFragmentdecrypted = await CoNETModule.aesGcmDecrypt (firstFragmentEncrypted, partEncryptPassword)
		firstFragmentObj = JSON.parse(firstFragmentdecrypted)
	} catch (ex){
		return logger(`getLocalProfile JSON.parse(firstFragmentdecrypted) Error!`)
	}
	//logger(`getLocalProfile ver [${ver}] first Fragment [${firstFragmentName}] with password [${partEncryptPassword}]`)
	const totalFragment = firstFragmentObj.totalFragment
	let clearData: string = firstFragmentObj.data
	const series: any[] = []
	for (let i = 1; i < totalFragment; i ++) {
		const stage = next => {
			getNextFragmentLocal(ver, passward, i).then(text=> {
				if (!text) {
					return next (`getNextFragment return NULL Error`)
				}
				clearData += text
				return next(null)
			})
		}
		series.push(stage)
	}

	return async.series(series).then (() => {
		sendState('beforeunload', false)
		try{
			const profile = JSON.parse(clearData)
			if (CoNET_Data) {
				CoNET_Data.profiles = profile
				CoNET_Data.ver = ver
			}
			
		} catch(ex){
			logger(`getLocalProfile JSON.parse(clearData) Error`, ex)
		}
	}).catch (ex=> {
		sendState('beforeunload', false)
		logger(`async.series catch ex`, ex)
	})
}

const getNextFragmentLocal = async (ver: number, passObjPassword: string, i) => {
	const nextEncryptPassword = encryptPasswordIssue(ver, passObjPassword, i)
	const nextFragmentName = createFragmentFileName(ver, passObjPassword, i)
	
	try {
		const EncryptedText = await getHashData (nextFragmentName)
		//logger(`getNextFragmentLocal get nextFragment [${nextFragmentName}] length = ${EncryptedText.length}`)
		const decryptedText = await CoNETModule.aesGcmDecrypt (EncryptedText, nextEncryptPassword)
		const decryptedFragment = JSON.parse(decryptedText)
		return decryptedFragment.data
	} catch (ex) {
		logger(`getNextFragment error!`, ex)
		return ''
	}
}

const getReferees = async (wallet: string, CNTP_Referrals) => {
	

	let result: string[] = []
	try {
		result = await CNTP_Referrals.getReferees(wallet)
	} catch (ex) {
		logger(`getReferees [${wallet}] Error! try again!`)
		return await getReferees (wallet, CNTP_Referrals)
	}
	return result
}

const getAllReferees = async (_wallet: string, CNTP_Referrals) => {

	const firstArray: string[] = await getReferees(_wallet, CNTP_Referrals)
	if (!firstArray.length) {
		return []
	}
	const ret: any = []
	const getData = async (wallet: string) => {
		const kkk = await getReferees(wallet, CNTP_Referrals)
		const data = JSON.parse(`{"${wallet}": ${JSON.stringify(kkk)}}`)
		return data
	}
	for (let i = 0; i < firstArray.length; i++) {
		const kk = await getReferees(firstArray[i], CNTP_Referrals)
		const ret1: any[] = []

		if (kk.length) {
			
			for (let j = 0; j < kk.length; j ++) {
				ret1.push(await getData(kk[j]))
			}

		}
		const data = `{"${firstArray[i]}": ${JSON.stringify(ret1)}}`
		const k = JSON.parse(data)
		ret.push(k)
	}
	
	return ret
}

let getFaucetRoop = 0
const getFaucet = async (keyID: string) => {
	return new Promise (async resolve => {
		if (++getFaucetRoop > 6) {
			getFaucetRoop = 0
			logger(`getFaucet Roop > 6 STOP process!`)
			return resolve(null)
		}
		const url = `${api_endpoint}conet-faucet`
		let result
		try {
			result = await postToEndpoint(url, true, { walletAddr: keyID })
		} catch (ex) {
			logger (`getFaucet postToEndpoint [${url}] error! `, ex)
			return setTimeout(() => {
				return getFaucet (keyID)
			}, 500)
		}
		getFaucetRoop = 0
		return resolve(result)
	})

}

const createKeyHDWallets = () => {
	let root
	try {
		root = ethers.Wallet.createRandom()
	} catch (ex) {
		return null
	}
	return root
}

const decryptSystemData = async () => {
	//	old version data

		if (!CoNET_Data||!passObj) {
			return new Error(`decryptSystemData Have no CoNET_Data Error!`)
		}

		const password = passObj.passcode.toString()

		if (!password) {
			throw new Error(`decryptSystemData Password Empty Error!`)
		}

		const filenameIterate1 = ethers.id(password)
		const filenameIterate2 = ethers.id(filenameIterate1)
		const filenameIterate3 = ethers.id(ethers.id(ethers.id(filenameIterate2)))
	

		const filename =  filenameIterate3
		const encryptedObj = await getHashData(filename)

		
		const encryptIterate3 = await CoNETModule.aesGcmDecrypt (encryptedObj, filenameIterate2)
		
		const encryptIterate2 = await CoNETModule.aesGcmDecrypt (encryptIterate3, filenameIterate1)
		const encryptIterate1 = await CoNETModule.aesGcmDecrypt (encryptIterate2, password)
		
		const obj = JSON.parse(encryptIterate1)
		CoNET_Data.mnemonicPhrase = obj.mnemonicPhrase
}

//*		scan assets
const scanCONET_dWBNB = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance (walletAddr, privideCONET, conet_dWBNB)
}

const updateProfilesVersion = async () => {
	if (!CoNET_Data?.profiles || !passObj) {
		return logger(`updateProfilesVersion !CoNET_Data[${!CoNET_Data}] || !passObj[${!passObj}] === true Error! Stop process.`)
	}
	const profile = CoNET_Data.profiles[0]
	const privateKeyArmor = profile.privateKeyArmor || ''
	const localCurrentVer = CoNET_Data.ver
	
	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	
	const checkVer = new ethers.Contract(conet_storage_contract_address, conet_storageAbi, provideNewCONET)
	const currentVer = await getCurrentProfileVer(checkVer, profile.keyID)
	if (currentVer < 0) {
		return logger(`storeFragmentToIPFS CONET RPC Error! STOP process`)
	}

	++CoNET_Data.ver
	sendState('beforeunload', true)
	const chainVer = currentVer + 1
	const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
	const profilesClearText = JSON.stringify(CoNET_Data.profiles)
	const fileLength = Math.round(1024 * (10 + Math.random() * 20))
	const chearTextFragments = splitTextLimitLength(profilesClearText, fileLength)

	const series: any[] = []
	
	chearTextFragments.forEach((n, index)=> {
		const stage = next => storagePieceToLocalAndIPFS(passward, n, index, chearTextFragments.length, 
				fileLength, chainVer, privateKeyArmor, profile.keyID).then (() => {
			logger(`piece ${index} finished! goto next!`)
			return next(null,null)
		})
		series.push(stage)
	})
	async.series(series).then (async () => {
		
		const wallet = new ethers.Wallet(profile.privateKeyArmor, provideNewCONET)
		const storageVer = new ethers.Contract(conet_storage_contract_address, conet_storageAbi, wallet)
		await updateChainVersion(storageVer)
		
		sendState('beforeunload', false)
		logger(`async.series finished`)
	}).catch (ex=> {
		sendState('beforeunload', false)
		logger(`async.series catch ex`, ex)
	}) 

}

const scanCONET_dUSDT = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance (walletAddr, privideCONET, conet_dUSDT)
}

const scanCONET_dWETH = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance (walletAddr, privideCONET, conet_dWETH)
}

const scanCONETHolesky = async (walletAddr: string, privideCONET: any) => {
	return await scan_natureBalance (privideCONET, walletAddr)
}

const scanCNTP = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance(walletAddr, privideCONET, blast_CNTP)
}

const scanCNTPB =  async (walletAddr: string, provideCONET: any) => {
	return await scan_erc20_balance(walletAddr, provideCONET, CNTPB_contract)
}

const scanUSDT = async (walletAddr: string, provideETH: any) => {
	return await scan_erc20_balance(walletAddr, provideETH, eth_usdt_contract)
}

const scanUSDB = async (walletAddr: string, provideBlast: any) => {
	return await scan_erc20_balance(walletAddr, provideBlast, blast_usdb_contract)
}

const scanETH = async (walletAddr: string, provideETH: any) => {
	return await scan_natureBalance(provideETH, walletAddr)
}

const scanBlastETH = async (walletAddr: string, provideBlast: any) => {
	return await scan_natureBalance(provideBlast, walletAddr)
}

const scanWBNB = async (walletAddr: string, provideBNB: any) => {
	return await scan_erc20_balance(walletAddr, provideBNB, bnb_wbnb_contract)
}

const scanWUSDT = async (walletAddr: string, provideBNB: any) => {
	return await scan_erc20_balance(walletAddr, provideBNB, bnb_usdt_contract)
}

const scanBNB = async (walletAddr: string, provideBNB: any) => {
	return await scan_natureBalance(provideBNB, walletAddr)
}

const scan_natureBalance = async (provide: any, walletAddr: string) => {
	try {
		return await provide.getBalance(walletAddr)
	} catch (ex) {
		logger(`scan_natureBalance Error!`, ex)
		return setTimeout(async () => {
			return await scan_natureBalance(walletAddr, provide)
		}, 1000)
	}
	
}

const scan_erc20_balance = async (walletAddr: string, rpcProdive: any, erc20Address: string) => {
	const erc20 = new ethers.Contract(erc20Address, blast_CNTPAbi, rpcProdive)
	try {
		return await erc20.balanceOf(walletAddr)
	} catch (ex) {
		logger(`scan_erc20_balance Error!`)
		return setTimeout(async () => {
			return await scan_erc20_balance(walletAddr, rpcProdive, erc20Address)
		}, 1000)
	}
}

const getNetwork = (networkName: string) => {
	switch (networkName) {
		case 'usdb':
		case 'blastETH': {
			return blast_mainnet
		}
		case 'dUSDT':
		case 'dWBNB':
		case 'dWETH':
		case 'conet':
		case 'cntpb': {
			return conet_rpc
		}
		case 'usdt':
		case 'eth': {
			return ethRpc
		}
		case 'wusdt': 
		case 'wbnb': {
			return bsc_mainchain
		}
		case 'cntp':
		default : {
			return blast_sepoliaRpc
		}
	}
}

const getAssetERC20Address = (assetName: string) => {
	switch (assetName) {
		
		case 'usdt':{
			return eth_usdt_contract
		}
		case 'wusdt':{
			return bnb_usdt_contract
		}
		case 'usdb': {
			return blast_usdb_contract
		}

		case 'dWBNB': {
			return conet_dWBNB
		}

		case 'dUSDT': {
			return conet_dUSDT
		}

		case 'dWETH': {
			return conet_dWETH
		}
	
		default: {
			return ``
		}
	}
}

const CONET_guardian_Address = (networkName: string) => {
	switch (networkName) {
		
		case 'usdt':
		case 'eth': {
			return '0x1C9f72188B461A1Bd6125D38A3E04CF238f6478f'
		}
		case 'wusdt': 
		case 'wbnb': {
			return '0xeabF22542500f650A9ADd2ea1DC53f158b1fFf73'
		}
		//		CONET holesky
		case 'dWETH':
		case 'dWBNB':
		case 'dUSDT':
		case '':
		//		blast mainnet
		case 'usdb':
		case 'blastETH':
		default: {
			return `0x4A8E5dF9F1B2014F7068711D32BA72bEb3482686`
		}
	}
}

const getEstimateGas = (privateKey: string, asset: string, transferNumber: string) => new Promise(async resolve=> {

	const provide = new ethers.JsonRpcProvider(getNetwork(asset))
	const wallet = new ethers.Wallet(privateKey, provide)
	const toAddr = CONET_guardian_Address(asset)
	let _fee
	const smartContractAddr = getAssetERC20Address(asset)
	if (smartContractAddr) {
		const estGas = new ethers.Contract(smartContractAddr, blast_CNTPAbi, wallet)
		try {
			_fee = await estGas.transfer.estimateGas(toAddr, transferNumber)
		} catch (ex) {
			return resolve (false)
		}
		
	} else {
		const tx = {
			to:toAddr,
			value: ethers.parseEther(transferNumber)
		}
		try {
			_fee = await wallet.estimateGas(tx)
		} catch (ex) {
			return resolve (false)
		}
		
	}
	try {
		const Fee = await provide.getFeeData()
		const gasPrice = ethers.formatUnits(Fee.gasPrice,'gwei')
		const fee = parseFloat(ethers.formatEther(_fee * Fee.gasPrice)).toFixed(8)
		return resolve ({gasPrice, fee})
	} catch (ex) {
		return resolve (false)
	}

	
	
})

const CONET_guardian_purchase: (profile: profile, nodes: number, _total: number, tokenName: string) => Promise<boolean> = async (profile, nodes, _total, tokenName ) => {
	const cryptoAsset: CryptoAsset = profile.tokens[tokenName]

	const total = await getAmountOfNodes(nodes, tokenName)

	if (_total - total > total * 0.01||!cryptoAsset||!CoNET_Data?.profiles) {
		return false
	}
	if (parseFloat(cryptoAsset.balance) - _total < 0 || !profile.privateKeyArmor) {
		return false
	}

	const tx = await transferAssetToCONET_guardian (profile.privateKeyArmor, cryptoAsset, _total.toString())
	if (typeof tx === 'boolean') {
		return false
	}
	await tx.wait()
	const kk1: CryptoAssetHistory = {
		status: 'Confirmed',
		Nonce: tx.nonce,
		to: tx.to,
		transactionFee: stringFix(ethers.formatEther(tx.maxFeePerGas * tx.gasLimit)),
		gasUsed: tx.maxFeePerGas.toString(),
		isSend: true,
		value: _total,
		time: new Date().toISOString(),
		transactionHash: tx.hash
	}
	cryptoAsset.history.push(kk1)
	const profiles = CoNET_Data.profiles
	const pIndex = profiles.map(n=> n.index)
	const root = ethers.Wallet.fromPhrase(CoNET_Data.mnemonicPhrase)
	const nextIndex = pIndex.sort((a,b) => b-a)[0]

	const publikPool: string[] = []
	for (let i=1; i <= nodes; i ++) {
		const newAcc = root.deriveChild(nextIndex+i)
		const key = await createGPGKey('', '', '')
		publikPool.push (newAcc.address)
		const _profile: profile = {
			isPrimary: false,
			keyID: newAcc.address,
			privateKeyArmor: newAcc.signingKey.privateKey,
			hdPath: newAcc.path,
			index: newAcc.index,
			pgpKey: {
				privateKeyArmor: key.privateKey,
				publicKeyArmor: key.publicKey
			},
			referrer: null,
			network: {
				recipients: []
			},
			tokens: initProfileTokens(),
			data: {
				alias: `CONET Guardian node${i}`,
				isNode: true
			}
		}
		profiles.push(_profile)
	}

	

	const data = {
		receiptTx: tx.hash,
		publishKeys: publikPool,
		nodes: nodes,
		tokenName,
		network: cryptoAsset.network,
		amount: ethers.parseEther(_total.toString())
	}

	const message =JSON.stringify({ walletAddress: profile.keyID, data})
	const messageHash = ethers.id(message)
	const signMessage = CoNETModule.EthCrypto.sign(profile.privateKeyArmor, messageHash)
	const sendData = {
		message, signMessage
	}
	const url = `${ api_endpoint }purchase-guardian`
	const result: any = await postToEndpoint(url, true, sendData)
	await updateProfilesVersion()
	return true
}

const stringFix = (num: string) => {
	const index = num.indexOf('.')
	if (index <0) {
		return num 
	}
	return num.substring(0, index+12)
}

const transferAssetToCONET_guardian: (privateKey: string, token: CryptoAsset, transferNumber: string) => Promise<boolean|transferTx> = (privateKey: string, token: CryptoAsset, transferNumber: string) => new Promise(async resolve=> {
	const provide = new ethers.JsonRpcProvider(getNetwork(token.name))
	const wallet = new ethers.Wallet(privateKey, provide)
	const toAddr = CONET_guardian_Address(token.name)
	let _fee
	const smartContractAddr = getAssetERC20Address(token.name)
	if (smartContractAddr) {
		const transferObj = new ethers.Contract(smartContractAddr, blast_CNTPAbi, wallet)
		try {
			return resolve(await transferObj.transfer(toAddr, ethers.parseEther(transferNumber)))
		} catch (ex) {
			return resolve (false)
		}
		
	} else {
		const tx = {
			to:toAddr,
			value: ethers.parseEther(transferNumber)
		}
		try {
			return resolve(await wallet.estimateGas(tx))
		} catch (ex) {
			return resolve (false)
		}
		
	}
})

const getProfileByWallet = (wallet: string) => {
	if (!CoNET_Data?.profiles) {
		return null
	}
	const index = CoNET_Data.profiles.findIndex (n => n.keyID.toLowerCase() === wallet.toLowerCase())
	if (index < 0) {
		return null
	}
	return CoNET_Data.profiles[index]
}

//

declare const ethers
declare const uuid
declare const Jimp

const CONET_ReferralsAbi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "referrer",
                "type": "address"
            }
        ],
        "name": "addReferrer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "refere",
                "type": "address"
            },
            {
                "internalType": "address[]",
                "name": "referees",
                "type": "address[]"
            }
        ],
        "name": "checkReferees",
        "outputs": [
            {
                "internalType": "bool",
                "name": "hasAddress",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "referrer",
                "type": "address"
            }
        ],
        "name": "getReferees",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "referees",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "referee",
                "type": "address"
            }
        ],
        "name": "getReferrer",
        "outputs": [
            {
                "internalType": "address",
                "name": "referrer",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

const conet_storageAbi = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "data",
                "type": "string"
            }
        ],
        "name": "FragmentsStorage",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "count",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "data",
                "type": "string"
            }
        ],
        "name": "versionUp",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "ver",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const blast_CNTPAbi = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "allowance",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "needed",
                "type": "uint256"
            }
        ],
        "name": "ERC20InsufficientAllowance",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "balance",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "needed",
                "type": "uint256"
            }
        ],
        "name": "ERC20InsufficientBalance",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "approver",
                "type": "address"
            }
        ],
        "name": "ERC20InvalidApprover",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "receiver",
                "type": "address"
            }
        ],
        "name": "ERC20InvalidReceiver",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "sender",
                "type": "address"
            }
        ],
        "name": "ERC20InvalidSender",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "ERC20InvalidSpender",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address[]",
                "name": "_addresses",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "_amounts",
                "type": "uint256[]"
            }
        ],
        "name": "multiTransferToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const blast_usdbAbi = [
	{
		"inputs":[{"internalType":"address","name":"_admin","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
		{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},
		{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},
		{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},
		{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},
		{"inputs":[{"internalType":"address","name":"_admin","type":"address"}],"name":"changeAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},
		{"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},
		{"inputs":[{"internalType":"address","name":"_implementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},
		{"inputs":[{"internalType":"address","name":"_implementation","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}
]
