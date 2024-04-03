const listenProfileVer = (wallet: string) => {
	const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
	provideCONET.on('block', async event => {
		const block = await provideCONET.getBlock (event)
		if (block?.transactions) {
			return getCONETTransfer(block.transactions, provideCONET, wallet.toLowerCase())
		}
	})
}

const getCONETTransfer = async (transferArray: string[]|any, provideCONET, wallet: string) => {
	if (transferArray.length) {
		for (let u of transferArray) {
			await detailCONETTransfer(u, provideCONET, wallet)
		}
	}
}

const detailCONETTransfer = async (transferHash: string, provideCONET, wallet: string) => {

	const transObj = await provideCONET.getTransactionReceipt(transferHash)
	
	if (transObj?.to && transObj.to.toLowerCase() === conet_storage_contract_address ) {
		if (transObj.from.toLowerCase() === wallet) {
			return checkUpdateAccount ()
		}
	}
	
}

let checkProfileVersionRoopCount = 0
const checkProfileVersion = (wallet: string, callback: (ver: number) => void) => {
	if (++checkProfileVersionRoopCount > 5) {
		return callback(-1)
	}

	const provide = new ethers.JsonRpcProvider(conet_rpc)
	const conet_storage = new ethers.Contract(conet_storage_contract_address, conet_storageAbi, provide)
	conet_storage.count(wallet)
	.then (count => {
		checkProfileVersionRoopCount = 0
		return callback (parseInt(count.toString()))
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
	logger(`storage version ${ver} fragment  No.[${index}] [${piece.fileName}] with password ${partEncryptPassword}`)
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
		logger(`storage version ${ver} fragment  No.[${index}] [${piece.fileName}] with password ${partEncryptPassword}`)
		async.parallel([
			next => storageHashData (piece.fileName, piece.localEncryptedText).then(()=> next(null)),
			next => updateFragmentsToIPFS(piece.remoteEncryptedText, piece.fileName, keyID, privateArmor).then(()=> next(null))
		], err=> {
			logger(`async.parallel finished err = [${err}]`)
			resolve(null)
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
		isReady: true
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

const getAssetsPrice = (cmd: worker_command) => {
	cmd.data =[]
	const url = 'https://min-api.cryptocompare.com/data/pricemulti?fsyms=usdt,bnb,ETH&tsyms=USD'
	return fetch(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		},
		cache: 'no-store',
		referrerPolicy: 'no-referrer'
	}).then ( async res => {
		if (res.status!== 200) {
			getAssetsPrice(cmd)
			return logger(`getPrice [${url}] response not 200 Error! try again!`)
		}
		return res.json()
	}).then((data) => {
		cmd.data = [data]
		returnUUIDChannel(cmd)
	}).catch(ex=> {
		logger(`getPrice [${url}] catch err`, ex)
		cmd.err = 'FAILURE'
		returnUUIDChannel(cmd)
	})
	
}

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

const initProfileTokens = () => {
	return {
		conet: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: ''
		},
		cntp: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: blast_CNTP
		},
		cntpb: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: CNTPB_contract
		},
		usdt: {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 6,
			contract: eth_usdt_contract
		},
		usdb: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: eth_usdt_contract
		},
		eth: {
			balance: '0',
			history: [],
			network: 'ETH',
			decimal: 18,
			contract: ''
		},
		blastETH: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: ''
		},
		wbnb: {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_wbnb_contract
		},
		wusdt: {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_usdt_contract
		}
	}
}

let getFaucetRoop = 0
const getFaucet = async (keyID: string) => {
	return new Promise (async resolve => {
		if (++getFaucetRoop > 6) {
			getFaucetRoop = 0
			logger(`getFaucet Roop > 6 STOP process!`)
			return resolve(null)
		}
		const url = `${api_endpoint}/api/conet-faucet`
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

//*		scan assets
const scanCONETHolesky = async (walletAddr: string, privideCONET: any) => {
	try{
		const ret = privideCONET.getBalance(walletAddr)
		return ret
	} catch (ex) {
		logger(`scanCONETHolesky [${walletAddr}] try Again!`, ex)
		return setTimeout(async () => {
			return await scanCONETHolesky(walletAddr, privideCONET)
		}, 500)
	}
	
}

const scanCNTP = async (walletAddr: string, privideCONET: any) => {
	
	const CNTP = new ethers.Contract(blast_CNTP, blast_CNTPAbi, privideCONET)
	try {
		const ret = await CNTP.balanceOf(walletAddr)
		return ret
	} catch (ex) {
		logger(`scanCNTP [${walletAddr}]`, ex)
		return setTimeout(async () => {
			return await scanCNTP(walletAddr, privideCONET)
		}, 500)
	}

}

const scanCNTPB =  async (walletAddr: string, provideCONET: any) => {
	
	const CNTPB = new ethers.Contract(CNTPB_contract, blast_CNTPAbi, provideCONET)
	try {
		const ret = await CNTPB.balanceOf(walletAddr)
		return ret

	} catch (ex) {
		logger(`scanCNTPB Error, try again!`)
		return setTimeout(async () => {
			return await scanCNTPB(walletAddr, provideCONET)
		}, 1000)
		
	}
}

const scanUSDT = async (walletAddr: string, provideETH: any) => {
	
	const usdt = new ethers.Contract(eth_usdt_contract, blast_CNTPAbi, provideETH)
	try {
		return await usdt.balanceOf(walletAddr)

	} catch (ex) {
		logger(`scanUSDT [${walletAddr}]`, ex)
		return setTimeout(async () => {
			return await scanUSDT(walletAddr, provideETH)
		}, 500)
	}
}

const scanUSDB = async (walletAddr: string, provideBlast: any) => {

	const usdb = new ethers.Contract(blast_usdb_contract, blast_CNTPAbi, provideBlast)
	try {
		return await usdb.balanceOf(walletAddr)

	} catch (ex) {
		logger(`scanUSDB [${walletAddr}]`, ex)
		return setTimeout(async () => {
			return await scanUSDB(walletAddr, provideBlast)
		}, 500)
		
	}
}

const scanETH = async (walletAddr: string, provideETH: any) => {
	try {
		return await provideETH.getBalance(walletAddr)

	} catch (ex) {
		logger(`scanETH Error! try again!`)
		return setTimeout(async () => {
			return await scanETH(walletAddr, provideETH)
		}, 1000)
		
	}
}

const scanBlastETH = async (walletAddr: string, provideBlast: any) => {
	try {
		return await provideBlast.getBalance(walletAddr)

	} catch (ex) {
		logger(`scanBlastETH Error!`, ex)
		return setTimeout(async () => {
			return await scanBlastETH(walletAddr, provideBlast)
		}, 1000)
		
	}
}

const scanWBNB = async (walletAddr: string, provideBNB: any) => {
	const wbnb = new ethers.Contract(bnb_wbnb_contract, blast_CNTPAbi, provideBNB)
	try {
		return await wbnb.balanceOf(walletAddr)

	} catch (ex) {
		logger(`scanWBNB Error! try again!`)
		return setTimeout(async () => {
			return await scanWBNB(walletAddr, provideBNB)
		}, 1000)
	}
}

const scanWUSDT = async (walletAddr: string, provideBNB: any) => {
	const wusdt = new ethers.Contract(bnb_usdt_contract, blast_CNTPAbi, provideBNB)
	try {
		return await wusdt.balanceOf(walletAddr)

	} catch (ex) {
		logger(`scanWUSDT Error!`)
		return setTimeout(async () => {
			return await scanWUSDT(walletAddr, provideBNB)
		}, 1000)
	}
}
//