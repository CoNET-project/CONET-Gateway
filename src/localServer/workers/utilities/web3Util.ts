
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
	const ret: conet_tokens = {
		dWETH: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: conet_dWETH
		},
		dUSDT: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: conet_dUSDT
		},
		dWBNB: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: conet_dWBNB
		},
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
		bnb: {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: ''
		},
		wusdt: {
			balance: '0',
			history: [],
			network: 'BSC',
			decimal: 18,
			contract: bnb_usdt_contract
		}
	}
	return ret
}

const initCONET_HoleskyAssets = async (wallet: string) => {

}

const getBlastAssets = (wallet: string) => new Promise( resolve => {
	if (!wallet) {
		return resolve([])
	}

})


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
const scanCONET_dWBNB = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance (walletAddr, privideCONET, conet_dWBNB)
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
		const fee = ethers.formatEther(_fee * Fee.gasPrice)
		return resolve ({gasPrice, fee})
	} catch (ex) {
		return resolve (false)
	}

	
	
})

const transferAssetToCONET_guardian = (privateKey: string, asset: string, transferNumber: string) => new Promise(async resolve=> {
	const provide = new ethers.JsonRpcProvider(getNetwork(asset))
	const wallet = new ethers.Wallet(privateKey, provide)
	const toAddr = CONET_guardian_Address(asset)
	let _fee
	const smartContractAddr = getAssetERC20Address(asset)
	if (smartContractAddr) {
		const estGas = new ethers.Contract(smartContractAddr, blast_CNTPAbi, wallet)
		try {
			_fee = await estGas.approve(toAddr, transferNumber)
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
})

//