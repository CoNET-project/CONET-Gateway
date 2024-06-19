

const getRegion = async () => {
	const regionContract = new ethers.Contract(CONET_Guardian_NodeInfoV4, CONET_Guardian_NodeInfo_ABI, provideCONET)
	try {
		const gasPrice = await regionContract.getAllRegions()
		return gasPrice
	} catch (ex) {
		logger(ex)
		return null
	}
}



const registerReferrer = async (referrer: string) => {
	if (!CoNET_Data?.profiles) {
		logger(`registerReferrer CoNET_Data?.profiles Empty error!`)
		return false
	}

	const profile = CoNET_Data.profiles[0]

	if (!profile || !referrer) {
		return false
	}

	if (referrer.toLowerCase() === profile.keyID.toLowerCase() ) {
		return false
	}

	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	const wallet = new ethers.Wallet(profile.privateKeyArmor, provideNewCONET)
	const CNTP_Referrals = new ethers.Contract(ReferralsAddressV3, CONET_ReferralsAbi, wallet)

	try {
		const ref = await CNTP_Referrals.getReferrer(profile.keyID)
		if (ref === '0x0000000000000000000000000000000000000000') {
			await CNTP_Referrals.addReferrer(referrer)
		}
		
	} catch (ex: any) {
		return false
	}

	profile.referrer = referrer
	return true
}

const preBurnCCNTP = async (profile: profile, totalBurn: string) => {
	const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
	const walletObj = new ethers.Wallet(profile.privateKeyArmor, provideCONET)
	
	const erc20 = new ethers.Contract(cCNTP_new_Addr, blast_CNTPAbi, walletObj)
	let total
	try {
		const gasPrice = await provideCONET.getFeeData()
		const gasFees = await erc20.burn.estimateGas(parseEther(totalBurn, 'ccntp'))
		total = gasPrice.gasPrice * gasFees
	} catch (ex) {
		return false
	}

	return ethers.formatEther(total)
}

const burnCCNTP = async (profile: profile, totalBurn: string) => {
	const walletObj = new ethers.Wallet(profile.privateKeyArmor, provideCONET)
	const erc20 = new ethers.Contract(cCNTP_new_Addr, blast_CNTPAbi, walletObj)
	const value = parseEther(totalBurn, 'ccntp')
	let tx
	try {
		tx = await erc20.burn(value)
	} catch (ex) {
		return false
	}
	await tx.wait()
	const [_tx1] = await Promise.all([
		provideCONET.getTransactionReceipt(tx.hash),
		//provideCONET.getTransaction(tx.hash)
	])


	const kk1: CryptoAssetHistory = {
		status: 'Confirmed',
		Nonce: tx.nonce,
		to: tx.to,
		transactionFee: stringFix(ethers.formatEther((tx.maxFeePerGas||tx.gasPrice) *tx.gasLimit)),
		gasUsed: (tx.maxFeePerGas||tx.gasPrice).toString(),
		isSend: true,
		value: ethers.formatEther(value),
		time: new Date().toISOString(),
		transactionHash: tx.hash,
		cCNTPBurn: true,
		epoch: _tx1.blockNumber,
		rate: leaderboardData.minerRate
	}

	profile.tokens.cCNTP.history.push(kk1)

	if ( !profile.pgpKey) {
		logger(`burnCCNTP profile.pgpKey Error!`)
		return kk1
	}
 
    return kk1
}

const startSilentPass = async (profile: profile, region: string): Promise<Object | false> => {
	if (!profile) {
        logger(`startSilentPass profile is null Error!`)
		return false 
	}
	if (!region) {
        logger(`startSilentPass region is null Error!`)
		return false
	}

    const regions: string[] = await getRegion()
	if (!regions) {
        logger(`CONET region unavailable`)
		return false 
	}

    if (profile.pgpKey) {
        const publicKeyArmor = profile.pgpKey.publicKeyArmor;
        const privateKeyArmor = profile.pgpKey.privateKeyArmor;
        profile.pgpKey = {privateKeyArmor, publicKeyArmor};
    }

	const filter = new RegExp(`${region}$`, 'i')
	const filterRegion: string[] = regions.filter(n => filter.test(n))
	const GuardianNodesSC = new ethers.Contract(CONET_Guardian_NodeInfoV4, CONET_Guardian_NodeInfo_ABI, provideCONET)
	const nodes: nodes_info[] = []

	await async.mapLimit(filterRegion, 5, async (n, next) => {
		
		const ipaddress: string[] = await GuardianNodesSC.getReginNodes(n)
		ipaddress.forEach(nn => {
			const node: nodes_info = {
				region: n,
				country: region,
				ip_addr: nn,
				armoredPublicKey: '',
				last_online: true
			}
			nodes.push (node)
		})
	})

	await async.mapLimit(nodes, 5, async (n, next) => {
		const k = await GuardianNodesSC.getNodePGP(n.ip_addr)
		n.armoredPublicKey = buffer.Buffer.from(k,'base64').toString()
	})

	const activeNodes = nodes
	const egressNodes =  [nodes[Math.floor(nodes.length * Math.random())]]

	await postToEndpoint('http://localhost:3001/conet-profile',true,  {profile, activeNodes, egressNodes})

    return {status: 'Confirmed'};
}

const getProfileAssets_allOthers_Balance = async (profile: profile) => {

	const key = profile.keyID
	
	if (key) {
		const current = profile.tokens
		checkTokenStructure(current)

		const provideETH = new ethers.JsonRpcProvider(ethRpc())
		const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
		const provideBlastMainChain = new ethers.JsonRpcProvider(blast_mainnet())
		const provideBNB = new ethers.JsonRpcProvider(bsc_mainchain)
		// const walletETH = new ethers.Wallet(profile.privateKeyArmor, provideETH)
		const [ balanceUSDT, ETH, blastETH, usdb, bnb, wusdt] = 
		await Promise.all([
			scanUSDT (key, provideETH),
			scanETH (key, provideETH),
			scanBlastETH (key, provideBlastMainChain),
			scanUSDB (key, provideBlastMainChain),
			scanBNB (key, provideBNB),
			scanWUSDT (key,provideBNB),
		])
		
		current.usdt.balance = balanceUSDT === BigInt(0) ? '0' : typeof balanceUSDT!== 'boolean' ?
															//	@ts-ignore
															parseFloat(balanceUSDT/BigInt(10**6)).toFixed(4): ''

		current.eth.balance = ETH === BigInt(0) ? '0' : typeof ETH!== 'boolean' ? parseFloat(ethers.formatEther(ETH)).toFixed(6) : ''
		current.blastETH.balance = blastETH === BigInt(0) ? '0' : typeof blastETH!== 'boolean' ? parseFloat(ethers.formatEther(blastETH)).toFixed(6) : ''
		current.usdb.balance = usdb === BigInt(0) ? '0' : typeof usdb!== 'boolean' ? parseFloat(ethers.formatEther(usdb)).toFixed(6): ''
		
		current.bnb.balance = bnb === BigInt(0) ? '0' :  typeof bnb!== 'boolean' ? parseFloat(ethers.formatEther(bnb)).toFixed(6): ''
		current.wusdt.balance = wusdt === BigInt(0) ? '0' : typeof wusdt!== 'boolean' ?  parseFloat(ethers.formatEther(wusdt)).toFixed(6): ''
		
	}

	return true
}

const getProfileAssets_CONET_Balance = async (profile: profile) => {

	const key = profile.keyID
	
	if (key) {
		const current = profile.tokens
		checkTokenStructure(current)

		const provideETH = new ethers.JsonRpcProvider(ethRpc())
		const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
		const provideBlastMainChain = new ethers.JsonRpcProvider(blast_mainnet())
		const provideBNB = new ethers.JsonRpcProvider(bsc_mainchain)
		// const walletETH = new ethers.Wallet(profile.privateKeyArmor, provideETH)
		const [
			balanceCNTPV1,balanceCCNTP, conet_Holesky,
			BNBUSDT, BlastUSDB, ETHUSDT, 
			CGPNs, CGPN2s
		] = await Promise.all([
			//scanCNTP (key, provideBlastMainChain),
			scanCNTPV1 (key, provideCONET),
			scanCCNTP (key, provideCONET),
			scanCONETHolesky(key, provideCONET),

			scanCONET_Claimable_BNBUSDT(key, provideCONET),
			scanCONET_Claimable_BlastUSDB(key, provideCONET),
			scanCONET_Claimable_ETHUSDT(key, provideCONET),

			scan_Guardian_Nodes(key, provideCONET),
			scan_Guardian_ReferralNodes(key, provideCONET)
		])
		

		//current.CNTP.balance = balanceCNTP === BigInt(0) ? '0' : typeof balanceCNTP !== 'boolean' ? parseFloat(ethers.formatEther(balanceCNTP)).toFixed(6) : ''
		current.CNTPV1.balance = balanceCNTPV1 === BigInt(0) ? '0' : typeof balanceCNTPV1!== 'boolean' ? parseFloat(ethers.formatEther(balanceCNTPV1)).toFixed(6) : ''
		current.cCNTP.balance = balanceCCNTP === BigInt(0) ? '0' : typeof balanceCCNTP!== 'boolean' ? parseFloat(ethers.formatEther(balanceCCNTP)).toFixed(6): ''
		current.conet.balance = conet_Holesky === BigInt(0) ? '0' : typeof conet_Holesky!== 'boolean' ?  parseFloat(ethers.formatEther(conet_Holesky)).toFixed(6): ''

		current.cBNBUSDT.balance = BNBUSDT === BigInt(0) ? '0' : typeof BNBUSDT!== 'boolean' ? parseFloat(ethers.formatEther(BNBUSDT)).toFixed(6): ''
		current.cUSDB.balance = BlastUSDB === BigInt(0) ? '0' :  typeof BlastUSDB!== 'boolean' ? parseFloat(ethers.formatEther(BlastUSDB)).toFixed(6): ''
		current.cUSDT.balance = ETHUSDT === BigInt(0) ? '0' :  typeof ETHUSDT!== 'boolean' ? parseFloat(ethers.formatEther(ETHUSDT)).toFixed(6): ''

		current.CGPNs.balance = CGPNs !== 'boolean' ? 
			//	@ts-ignore
			CGPNs.toString() : ''
		
		current.CGPN2s.balance = CGPN2s !== 'boolean' ? 
			//	@ts-ignore
			CGPN2s.toString() : ''
	}

	return true
}

const maxfindNodeAddressNumber = 1000

const findNodeAddress: (nodeAddress: string, mnemonicPhrase: string) => number = (nodeAddress, mnemonicPhrase) => {
	const root = ethers.Wallet.fromPhrase(mnemonicPhrase)
	if (!root?.deriveChild) {
		logger(`findNodeAddress got null root?.deriveChild ERROR!`)
		return -1
	}
	let index = 1
	const _nodeAddress = nodeAddress.toLowerCase()
	const findIndex = () => {
		
		const addr = root.deriveChild(index).address.toLowerCase()
		if (_nodeAddress === addr) {
			return index
		}

		if (++index > maxfindNodeAddressNumber) {
			logger(`findNodeAddress reached maxfindNodeAddressNumber ERROR!`)
			return -1
		}
		return findIndex()
	}
	return findIndex ()
}

const checkGuardianNodes = async () => {
	if (!CoNET_Data||!CoNET_Data?.profiles) {
		return logger(`checkGuardianNodes !CoNET_Data||!CoNET_Data?.profiles Error! STOP process.`)
	}
	const mnemonicPhrase = CoNET_Data.mnemonicPhrase
	const mainIndex = CoNET_Data.profiles.findIndex(n => n.index === 0)
	if (mainIndex < 0) {
		return logger(`checkGuardianNodes cannot find main profile STOP process.`)
	}
	const profiles =  CoNET_Data.profiles
	const profile = CoNET_Data.profiles[mainIndex]
	const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
	const erc1155 = new ethers.Contract(CONET_Guardian_NodesV3, guardian_erc1155, provideCONET)
	const ercGuardianNodesInfoV3 = new ethers.Contract(CONET_Guardian_NodeInfoV4, GuardianNodesInfoV3_ABI, provideCONET)

	GuardianNodesInfoV3_ABI
	let nodeAddress: string[] = [], Ids, numbers
	try {
		const ownerIds = await erc1155.getOwnerNodesAddress(profile.keyID)
		if (!ownerIds) {
			return (`checkGuardianNodes getOwnerNodesAddress null!`)
		}
		Ids = ownerIds.map(n => n.toString())
		const IdAddressProcess = Ids.map(n => erc1155.getOwnership(n))
		const _nodeAddress = await Promise.all(IdAddressProcess)
		const batchAddress: string[] = []
		const batchIds: string[] = []
		_nodeAddress.forEach((n, index) => {
			
			nodeAddress.push (n.toLowerCase())
			batchIds.push (Ids[index])
			
		})
		numbers = await erc1155.balanceOfBatch(nodeAddress, batchIds)
		
	} catch (ex) {
		return logger(`call erc1155 smart contract `)
	}

	const _assetNodesAddr: string[] = []
	numbers.forEach((n, index) => {
		if ( n > 0 ){
			_assetNodesAddr.push(nodeAddress[index])
		}
	})
	const assetNodesAddr: any[] = []
	_assetNodesAddr.forEach(n => {
		const index = profiles.findIndex(nn => nn.keyID.toLowerCase() === n)
		if (index < 0) {
			assetNodesAddr.push(n)
		}
	})
	
	if (!assetNodesAddr.length) {
		return 
	}

	const IdsIndex: number[] = assetNodesAddr.map (n => findNodeAddress(n, mnemonicPhrase))
	




	profiles.forEach(n => {
		n.isNode = false
	})
	const root = ethers.Wallet.fromPhrase(mnemonicPhrase)

	const checkInfo = async (_index: number) => {
		const index = profiles.findIndex(n => n.index === _index)
		let profile: profile
		if (index < 0 ) {
			const newAcc = root.deriveChild(_index)
			const key = await createGPGKey('', '', '')
			profile = {
				isPrimary: false,
				keyID: newAcc.address,
				privateKeyArmor: newAcc.signingKey.privateKey,
				hdPath: newAcc.path,
				index: newAcc.index,
				isNode: true,
				nodeID: 0,
				nodeIP_address: '',
				nodeRegion: '',
				pgpKey: {
					privateKeyArmor: key.privateKey,
					publicKeyArmor: key.publicKey
				},
				referrer: null,
				tokens: initProfileTokens(),
				data: null
			}
			profiles.push(profile)
			profile
		} else {
			profile = profiles[index]
		}
		
		
		profile.nodeID = (await erc1155.ownershipForNodeID(profile.keyID)).toString()
		const nodeInfo = await ercGuardianNodesInfoV3.getNodeInfoById(profile.nodeID)
		profile.nodeRegion = nodeInfo?.regionName
		profile.nodeIP_address = nodeInfo?.ipaddress
		profile.isNode = true
		
		
	}

	const execPool: any[] = []

	IdsIndex.forEach( async idIndex=> {
		execPool.push(checkInfo (idIndex))
	})
	
	await Promise.all([
		...execPool
	])
	await storagePieceToLocal()
	await storeSystemData ()
}

let sendStateBeforeunload = false

const sendState = (state: listenState, value: any) => {
	const sendChannel = new BroadcastChannel(state)
	let data = ''
	try {
		data = JSON.stringify(value)
	} catch (ex) {
		logger(`sendState JSON.stringify(value) Error`)

	}
	sendChannel.postMessage (data)
	sendChannel.close()
}

const checkSmartContractAsset = async (eventLogs: any[], tokenABILog: any, tokenName: string, profiles: profile[], smartContractObj: any) => {
	let ret = false
	for (let transferLog of eventLogs) {
		let uuu
		try{
			uuu = tokenABILog.parseLog(transferLog)
		} catch(ex) {
			console.log (`ifaceFor_cCNTP_ABI.parseLog transferLog!`)
			continue
		}
		if (uuu?.name === 'Transfer') {
			const toAddr = uuu.args[1].toLowerCase()
			const index = profiles.findIndex(n => n.keyID.toLowerCase() === toAddr)
			if (index > -1) {
				const profile = profiles[index]
				const balance = await smartContractObj.balanceOf(profile.keyID)
				if (balance) {
					profile.tokens[tokenName].balance = parseFloat(ethers.formatEther(balance)).toFixed(8)
				} else {
					profile.tokens[tokenName].balance = '0'
				}
				
				ret = true
			}
		}
	}
	return ret
}


const listeningAddress = []

const checkAssets = async (block: number, provider: any, profiles: profile[]|undefined) => {
	const blockInfo = await provider.getBlock(block)
	const ifaceFor_cCNTP_ABI = new ethers.Interface(cCNTP_ABI)
	
	if (!blockInfo?.transactions) {
		return logger(`block [${block}] hasn't transactions`)
	}
	if (!profiles?.length) {
		return logger(`checkAssets profiles length is none!`)
	}


	const cCNTP_Contract = new ethers.Contract(cCNTP_new_Addr, cCNTP_ABI, provider)
	const CNTPV1_Contract = new ethers.Contract(CNTPV1, cCNTP_ABI, provider)
	const CNTP_Referrals = new ethers.Contract(ReferralsAddressV3, CONET_ReferralsAbi, provider)
	const bcUSDT_Contract = new ethers.Contract(Claimable_BNBUSDTv3, cCNTP_ABI, provider)
	const cUSDT_Contract = new ethers.Contract(Claimable_ETHUSDTv3, cCNTP_ABI, provider)
	const cUSDB_Contract = new ethers.Contract(Claimable_BlastUSDBv3, cCNTP_ABI, provider)

	
	let hasChange = false
	
	for (let tx of blockInfo.transactions) {
		const event = await provider.getTransactionReceipt(tx)
		const to = event?.to?.toLowerCase()
		
		logger(`block [${block}] transactions ${to}`)
		if (to) {
			const index = profiles.findIndex(n => n.keyID.toLowerCase() === to)
			if (index > -1) {
				const profile = profiles[index]
				const balance = await provider.getBalance(profile.keyID)
				profile.tokens.conet.balance = parseFloat(ethers.formatEther(balance)).toFixed(8)
				hasChange = true
				logger(`profile [${profile.keyID}] got new Balance [${profile.tokens.conet }]`)
				continue
			}
			//		cCNTP
			if (to === cCNTP_new_Addr) {
				hasChange = await checkSmartContractAsset(event.logs, ifaceFor_cCNTP_ABI, 'cCNTP', profiles, cCNTP_Contract)
				continue
			}

			if (to === CNTPV1) {
				hasChange = await checkSmartContractAsset(event.logs, ifaceFor_cCNTP_ABI, 'CNTPV1', profiles, CNTPV1_Contract)
				continue
			}

			if (to === Claimable_BNBUSDTv3) {
				hasChange = await checkSmartContractAsset(event.logs, ifaceFor_cCNTP_ABI, 'cBNBUSDT', profiles, bcUSDT_Contract)
				continue
			}

			if (to === Claimable_ETHUSDTv3) {
				hasChange = await checkSmartContractAsset(event.logs, ifaceFor_cCNTP_ABI, 'cUSDT', profiles, cUSDT_Contract)
				continue
			}

			if (to === Claimable_BlastUSDBv3) {
				hasChange = await checkSmartContractAsset(event.logs, ifaceFor_cCNTP_ABI, 'cUSDB', profiles, cUSDB_Contract)
				continue
			}

			if (to === ReferralsAddressV3) {
				RefereesList = await getAllReferees(profiles[0].keyID, CNTP_Referrals)
				continue
			}
			
		}
	}
	
}


let provideCONET
let lesteningBlock = false


const listenProfileVer = async () => {
	
	lesteningBlock = true
	provideCONET.on ('block', async block => {
		const profiles = CoNET_Data?.profiles
		
		await 
		Promise.all([
			selectLeaderboard(block),
			checkAssets(block, provideCONET, profiles)
		])
		const cmd: channelWroker = {
			cmd: 'assets',
			data: [profiles, RefereesList, leaderboardData]
		}

		sendState('toFrontEnd', cmd)
		
	})
	const block = await provideCONET.getBlockNumber()
	selectLeaderboard(block)

}

const checkProfileVersion = async (wallet: string) => {
	
	const conet_storage = new ethers.Contract(profile_ver_addr, conet_storageAbi, provideCONET)
	const [count, nonce] = await
		Promise.all([
			conet_storage.count(wallet),
			provideCONET.getTransactionCount (wallet)
		])
	
	return [parseInt(count.toString()), parseInt(nonce.toString())]
}

const checkOldProfileVersion = async (wallet: string ) => {
	const obdGethRPC = 'https://rpc-old.conet.network'
	const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
	const provideOldCONET = new ethers.JsonRpcProvider(obdGethRPC)
	const old_conet_storage = new ethers.Contract(conet_storage_old_address, conet_storageAbi, provideOldCONET)
	const new_conet_storage = new ethers.Contract(profile_ver_addr, conet_storageAbi, provideCONET)
	const [oldVer, newVer] = await
		Promise.all([
			old_conet_storage.count(wallet),
			new_conet_storage.count(wallet)
		])
	
	return [oldVer, newVer]
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
	storageHashData (piece.fileName, piece.localEncryptedText).then(() => {
		resolve (true)
	})
})

const storagePieceToIPFS = (mnemonicPhrasePassword: string, fragment: string, index: number,
	totalFragment: number, targetFileLength: number, ver: number, privateArmor: string, keyID:string) => new Promise(async resolve => {
		


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
		const result = await updateFragmentsToIPFS(piece.remoteEncryptedText, piece.fileName, keyID, privateArmor)
		resolve (result)

	})

// const storagePieceToLocalAndIPFS = ( mnemonicPhrasePassword: string, fragment: string, index: number,
// 		totalFragment: number, targetFileLength: number, ver: number, privateArmor: string, keyID:string
// 	) => {
// 	return new Promise(async resolve=> {
		
// 		const _dummylength = targetFileLength - fragment.length > 1024 * 5 ? targetFileLength - totalFragment : 0
// 		const dummylength = (totalFragment === 2 && _dummylength )
// 			? Math.round((targetFileLength - fragment.length) * Math.random()) : 0
// 		const dummyData = buffer.Buffer.allocUnsafeSlow( dummylength)
// 		const partEncryptPassword = encryptPasswordIssue(ver, mnemonicPhrasePassword, index)
// 		const localData = {
// 			data: fragment,
// 			totalFragment: totalFragment,
// 			index
// 		}
// 		const IPFSData = {
// 			data: fragment,
// 			totalFragment: totalFragment,
// 			index,
// 			dummyData: dummyData
// 		}
// 		const piece: fragmentsObj = {
// 			localEncryptedText: await CoNETModule.aesGcmEncrypt (JSON.stringify(localData), partEncryptPassword),
// 			remoteEncryptedText: await CoNETModule.aesGcmEncrypt (JSON.stringify(IPFSData), partEncryptPassword),
// 			fileName: createFragmentFileName(ver, mnemonicPhrasePassword, index),
// 		}
		
// 		return async.parallel([
// 			next => storageHashData (piece.fileName, piece.localEncryptedText).then(()=> next(null)),
// 			next => updateFragmentsToIPFS(piece.remoteEncryptedText, piece.fileName, keyID, privateArmor)
// 				.then(() => getFragmentsFromPublic(piece.fileName)
// 				.then( data=> {
// 					if (!data) {
// 						const err = `storagePieceToLocalAndIPFS review storage version ${ver} fragment No.[${index}] Error! try again`
// 						logger(err)
// 						return next(new Error(err))
// 					}
// 					return next(null)
// 					}
// 				)
// 			)
// 		], err=> {
// 			if (err) {
// 				resolve(false)
// 				return storagePieceToLocalAndIPFS (mnemonicPhrasePassword, fragment, index, totalFragment, targetFileLength, ver, privateArmor, keyID)
// 			}
			
// 			return resolve(true)
// 		})
		
// 	})

// }

const initSystemDataV1 = async (acc) => {
	
	const key = await createGPGKey('', '', '')

	const profile: profile = {
		tokens: initProfileTokens(),
		publicKeyArmor: acc.publicKey,
		keyID: acc.address,
		isPrimary: true,
		referrer: null,
		isNode: false,
		pgpKey: {
			privateKeyArmor: key.privateKey,
			publicKeyArmor: key.publicKey
		},
		privateKeyArmor: acc.signingKey.privateKey,
		hdPath: acc.path,
		index: acc.index
	}
	if (!CoNET_Data) {
		return CoNET_Data = {
			mnemonicPhrase: acc.mnemonic.phrase,
			profiles:[profile],
			isReady: true,
			nonce: 0,
			upgradev2: true,
			ver: 0
		}
	} 
	CoNET_Data.profiles = [profile]
	CoNET_Data.isReady = true
	CoNET_Data.mnemonicPhrase = acc.mnemonic.phrase
	CoNET_Data.upgradev2 = true
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
		fx168Order: CoNET_Data.fx168Order||[],
		dammy: buffer.Buffer.allocUnsafeSlow( 1024 * ( 20 + ( Math.random()*20))),
		ver: (CoNET_Data.ver || 1),
		upgradev2: CoNET_Data.upgradev2
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


	const CoNETIndexDBInit: CoNETIndexDBInit = {
		id: passObj,
		preferences: CoNET_Data.preferences
	}

	sendStateBeforeunload = true
	sendState('beforeunload', true)

	try {
		await storageHashData ('init', buffer.Buffer.from(JSON.stringify (CoNETIndexDBInit)).toString ('base64'))
		await storageHashData (filename, CoNET_Data.encryptedString)
	} catch (ex) {
		logger(`storeSystemData storageHashData Error!`, ex)
	}
	sendStateBeforeunload = false

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

const checkUpdateAccount = () => new Promise(async resolve => {
	
	return resolve (true)

	// if ( ! CoNET_Data || ! CoNET_Data?.profiles ) {
	// 	logger(`checkUpdateAccount CoNET_Data?.profiles hasn't ready!`)
	// 	return resolve (false)
	// }

	// const profiles = CoNET_Data.profiles

	// if (checkcheckUpdateLock) {
	// 	return resolve (false)
	// }

	// checkcheckUpdateLock = true
	
	// const [nonce, _ver] = await checkProfileVersion( profiles[0].keyID)

	// CoNET_Data.nonce = nonce
	// CoNET_Data.ver = CoNET_Data.ver||1
	// if (CoNET_Data.ver && _ver === CoNET_Data.ver) {
	// 	return resolve (true)
	// }

	// //	Local version big then remote
	// if (_ver < CoNET_Data.ver ) {
	// 	await updateProfilesVersionToIPFS()
	// 	checkcheckUpdateLock = false
	// 	return resolve (true)
	// }
	// await getDetermineVersionProfile(_ver, CoNET_Data)
	
	// checkcheckUpdateLock = false
	// return resolve (true)
	
})

let assetPrice: assetsStructure[] = []

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

        let firstProfilePgpKey = {publicKeyArmor: '', privateKeyArmor: ''}
        if(CoNET_Data.profiles[0].pgpKey) {
            firstProfilePgpKey = {publicKeyArmor: CoNET_Data.profiles[0].pgpKey.publicKeyArmor, privateKeyArmor: CoNET_Data.profiles[0].pgpKey.privateKeyArmor}
            CoNET_Data.profiles[0].pgpKey = firstProfilePgpKey
        }

		const profilesClearText = JSON.stringify(CoNET_Data.profiles)
		const chearTextFragments = splitTextLimitLength(profilesClearText, fileLength)
		const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
		const privateKeyArmor = profile.privateKeyArmor||''
		const ver = CoNET_Data.ver = (CoNET_Data.ver||0) + 1
	
		// chearTextFragments.forEach((n, index)=> {
		// 	const stage = next => _storagePieceToLocal(passward, n, index, chearTextFragments.length, 
		// 			fileLength, ver, privateKeyArmor, profile.keyID ).then (() => {
		// 		logger(`piece ${index} finished! goto next!`)
		// 		return next(null,null)
		// 	})
		// 	series.push(stage)
		// })
		let index = 0
		sendState('beforeunload', true)
		return async.mapLimit(chearTextFragments, 1, async (n: any, next: any) => {
			await _storagePieceToLocal(passward, n, index++, chearTextFragments.length, 
				fileLength, ver, privateKeyArmor, profile.keyID )
		}, () => {
			sendState('beforeunload', false)
			logger(`async.series finished`)
			resolve(true)
		})
	})


}

const recoverProfileFromSRP = () => {
	return new Promise(async(resolve, reject) => {
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


		
			
			// //		network error!
			// if (ver < 0) {
			// 	const errMessage =`recoverProfileFromSRP checkProfileVersion RoopCount > 5! Stop trying!`
			// 	return reject (new Error(errMessage))
			// }
			//		init
			await initSystemDataV1(acc)
			// if (ver === 0) {
			// 	// await getFaucet (publicKey)
			// 	return resolve(true)
			// }
			
			
			await getLocalProfile(CoNET_Data.ver)

			return resolve(true)
			//const firstprice = getFirstFragmentName(SRP, ver)
			
		
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
		return ''

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

const updateFragmentsToIPFS = (encryptData: string, hash: string, keyID: string, privateKeyArmor: string) => new Promise( async resolve => {

	const url = `${ apiv2_endpoint }storageFragments`
	
	const message =JSON.stringify({ walletAddress: keyID, data: encryptData, hash})
	const messageHash = ethers.id(message)

	const signMessage = CoNETModule.EthCrypto.sign(privateKeyArmor, messageHash)

	const sendData = {
		message, signMessage
	}

	try {
		await postToEndpoint(url, true, sendData)
	} catch (ex) {
		return resolve (false)
	}
	return resolve (true)

})

let updateChainVersionCount = 0


const updateChainVersion = async (storageVer: any, conetData: encrypt_keys_object) => {
	const profile = conetData.profiles
	if (!profile) {
		return 
	}
	try {
		const tx = await storageVer.versionUp('0x0')
		await tx.wait()
		const ver = await storageVer.count(profile[0].keyID)
		conetData.ver = ver.toString()
	} catch(ex) {
		return logger(`updateChainVersion error! try again`, ex)
	}

}

const initProfileTokens = () => {
	const ret: conet_tokens = {
		CGPNs: {
			balance: '0',
			history: [],
			network: 'CONET Guardian Nodes (CGPNs)',
			decimal: 1,
			contract: CONET_Guardian_NodesV3,
			name: 'CGPNs'
		},
		CGPN2s: {
			balance: '0',
			history: [],
			network: 'CONET Guardian Nodes (CGPN2s)',
			decimal: 1,
			contract: CONET_Guardian_NodesV3,
			name: 'CGPN2s'
		},
		cCNTP: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: cCNTP_new_Addr,
			name: 'cCNTP'
		},
		cBNBUSDT:{
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: Claimable_BNBUSDTv3,
			name: 'cBNBUSDT'
		},
		cUSDB:{
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: Claimable_BlastUSDBv3,
			name: 'cUSDB'
		},
		CNTP: {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: blast_mainnet_CNTP,
			name: 'CNTP'
		},
		// cBNB : {
		// 	balance: '0',
		// 	history: [],
		// 	network: 'CONET Holesky',
		// 	decimal: 18,
		// 	contract: Claimable_BNB,
		// 	name: 'cBNB'
		// },
		cUSDT :{
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: Claimable_ETHUSDTv3,
			name: 'cUSDT'
		},
		// cETH:{
		// 	balance: '0',
		// 	history: [],
		// 	network: 'CONET Holesky',
		// 	decimal: 18,
		// 	contract: Claimable_ETH,
		// 	name: 'cETH'
		// },
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
		CNTPV1: {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: CNTPV1,
			name: 'CNTPV1'
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

const checkTokenStructure = (token: any) => {
	if (!token?.CGPNs) {
		token.CGPNs = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 1,
			contract: CONET_Guardian_NodesV3,
			name: 'CGPNs'
		}
	} else {
		token.CGPNs.name = 'CGPNs'
	}
	if (!token?.CGPN2s) {
		token.CGPN2s = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 1,
			contract: CONET_Guardian_NodesV3,
			name: 'CGPN2s'
		}
	} else {
		token.CGPN2s.name = 'CGPN2s'
	}

	if (!token?.CNTPV1) {
		token.CNTPV1 = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: CNTPV1,
			name: 'CNTPV1'
		}
	} else {
		token.CNTPV1.name = 'CNTPV1'
	}

	if (!token?.cCNTP) {
		token.cCNTP = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: cCNTP_new_Addr,
			name: 'cCNTP'
		}
	} else {
		token.cCNTP.name = 'cCNTP'
	}

	if (!token?.CNTP) {
		token.CNTP = {
			balance: '0',
			history: [],
			network: 'Blast Mainnet',
			decimal: 18,
			contract: blast_mainnet_CNTP,
			name: 'CNTP'
		}
	} else {
		token.CNTP.name = 'CNTP'
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
		token.usdt.name = 'usdt'
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

	if (!token?.cUSDT) {
		token.cUSDT = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: Claimable_ETHUSDTv3,
			name: 'cUSDT'
		}
	} else {
		token.cUSDT.name = 'cUSDT'
	}

	// if (!token?.cETH) {
	// 	token.cETH = {
	// 		balance: '0',
	// 		history: [],
	// 		network: 'CONET Holesky',
	// 		decimal: 18,
	// 		contract: Claimable_ETH,
	// 		name: 'cETH'
	// 	}
	// } else {
	// 	token.cETH.name = 'cETH'
	// }

	// if (!token?.cBNB) {
	// 	token.cBNB = {
	// 		balance: '0',
	// 		history: [],
	// 		network: 'CONET Holesky',
	// 		decimal: 18,
	// 		contract: Claimable_BNB,
	// 		name: 'cBNB'
	// 	}
	// } else {
	// 	token.cBNB.name = 'cBNB'
	// }

	// if (!token?.cBlastETH) {
	// 	token.cBlastETH = {
	// 		balance: '0',
	// 		history: [],
	// 		network: 'CONET Holesky',
	// 		decimal: 18,
	// 		contract: Claimable_BlastETH,
	// 		name: 'cBlastETH'
	// 	}
	// } else {
	// 	token.cBlastETH.name = 'BlastETH'
	// }

	if (!token?.cUSDB) {
		token.cUSDB = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: Claimable_BlastUSDBv3,
			name: 'cUSDB'
		}
	} else {
		token.cUSDB.name = 'cUSDB'
	}

	if (!token?.cBNBUSDT) {
		token.cBNBUSDT = {
			balance: '0',
			history: [],
			network: 'CONET Holesky',
			decimal: 18,
			contract: Claimable_BNBUSDTv3,
			name: 'cBNBUSDT'
		}
	} else {
		token.cBNBUSDT.name = 'cBNBUSDT'
	}
}

let runningGetAllProfileAssetsBalance = false
let runninggetAllOtherAssets = false

let lastAllProfileAssetsBalanceTimeStamp = 0
let lastgetAllOtherAssetsBalanceTimeStamp = 0
const minCheckTimestamp = 1000 * 12 		//			must big than 12s

const getAllOtherAssets = async () => {
	return new Promise(async resolve => {

		if (!CoNET_Data?.profiles) {
			logger(`getAllOtherAssets Error! CoNET_Data.profiles empty!`)
			return resolve (false)
		}

		const timeStamp = new Date().getTime()

		if (timeStamp - lastgetAllOtherAssetsBalanceTimeStamp < minCheckTimestamp) {
			return resolve (true)
		}

		if (runninggetAllOtherAssets) {
			logger(`getAllOtherAssets already running! return false`)
			return resolve(true)
		}
		
		runninggetAllOtherAssets = true
		lastgetAllOtherAssetsBalanceTimeStamp = timeStamp
		
		const runningList: any = []
		for (let profile of CoNET_Data.profiles) {
			runningList.push(getProfileAssets_allOthers_Balance(profile))
		}
		
		await Promise.all (runningList)
		
		runninggetAllOtherAssets = false
		resolve (true)
		logger(`getAllOtherAssets stoped!`)
	})
	
}

let leaderboardData: leaderboardData


const leaderboardDataDelay = 20
const selectLeaderboard: (block: number) => Promise<boolean> = (block) => new Promise(async resolve => {
	const readBlock = block - leaderboardDataDelay
	const [leaderboardFree, allWalletsFree, leaderboardNodes] = await Promise.all([
		getWasabiFile(`${readBlock}_free`),
		getWasabiFile(`free_wallets_${readBlock}`),
		getWasabiFile(`${readBlock}_node`)
	])

	if (!leaderboardFree) {
		return resolve(false)
	}
	
	leaderboardData = {
		epoch: block - leaderboardDataDelay,
		free_cntp: leaderboardFree.cntp.slice(0,10),
		free_referrals: leaderboardFree.referrals.slice(0,10),
		minerRate: (parseFloat(leaderboardFree.minerRate)/12).toFixed(8),
		totalMiner: leaderboardFree.totalMiner,

	}

	const profiles = CoNET_Data?.profiles

	if (profiles) {
		const profile = profiles[0]
		if (profile) {
			
			const key = profile.keyID.toLowerCase()
			const referrals_rate_list: referrals_rate_list[]= leaderboardNodes?.referrals_rate_list
			if (referrals_rate_list.length) {
				const findIndex = referrals_rate_list.findIndex(n => n.wallet.toLowerCase() === key)
				if (findIndex > -1) {
					leaderboardData.guardian = referrals_rate_list[findIndex]
				}
			}
			const free_rate_list: referrals_rate_list[]= leaderboardFree.cntp
			
			if (free_rate_list.length) {
				const findIndex = free_rate_list.findIndex(n => n.wallet.toLowerCase() === key)
				if (findIndex > -1) {
                    leaderboardData.free = free_rate_list[findIndex]
				}
			}

		}
		
	}

	resolve (true)
	
})

const getWasabiFile: (fileName: string) => Promise<any> = async (fileName: string) => new Promise(resolve=> {
	//const cloudStorageEndpointPath = `/conet-mvp/storage/FragmentOcean/${fileName}`
	const cloudStorageEndpointUrl = `https://s3.us-east-1.wasabisys.com/conet-mvp/storage/FragmentOcean/${fileName}`
	return fetch(cloudStorageEndpointUrl, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		},
		cache: 'no-store',
		referrerPolicy: 'no-referrer'
	}).then ( async res => {
		if (res.status !== 200){
			throw(`!200 Error`)
		}
		return res.json()
	}).then(result => {
		return resolve(result)
	}).catch (ex => {
		logger(`getCONET_HoleskyAssets Error!`, ex)
		return resolve([])
	})
})

const getAllProfileAssetsBalance = () => 
	new Promise ( async resolve => {

		if (!CoNET_Data?.profiles) {
			logger(`getAllProfileAssetsBalance Error! CoNET_Data.profiles empty!`)
			return resolve (false)
		}
		
		const profiles = CoNET_Data.profiles
		
		const runningList: any = []

		for (let profile of CoNET_Data.profiles) {

			runningList.push(getProfileAssets_CONET_Balance(profile))
			
			// runningList.push(getProfileAssets_allOthers_Balance(profile))
		}

		await Promise.all (runningList)
		const CNTP_Referrals = new ethers.Contract(ReferralsAddressV3, CONET_ReferralsAbi, provideCONET)
		RefereesList = await getAllReferees(profiles[0].keyID, CNTP_Referrals)
		const constBalance = profiles[0].tokens.conet.balance


		if (constBalance > '0.0001') {
			let update = false
			if ( referrer ) {
				update = await registerReferrer (referrer)
			}

			await checkUpdateAccount()
		
		} else {
			const health = await getCONET_api_health()
			if (!health) {
				return logger(`getAllProfileAssetsBalance getCONET_api_health Err`)
			}

			await getFaucet(profiles[0].keyID)
		}

		const cmd: channelWroker = {
			cmd: 'assets',
			data: [profiles]
		}
		sendState('toFrontEnd', cmd)
		return resolve(true)
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

let checkcheckUpdateLock = false
let lastCheckcheckUpdateTimeStamp = 0



const checkIPFSFragmenReadyOrNot = (ver: number, CoNET_data: encrypt_keys_object) => new Promise ( async resolve => {
	let _chainVer = ver
		
	const passward = ethers.id(ethers.id(CoNET_data.mnemonicPhrase))
	const partEncryptPassword = encryptPasswordIssue(_chainVer, passward, 0)
	const firstFragmentName = createFragmentFileName(_chainVer, passward, 0)
	if (!CoNET_data?.fragmentClass) {
		CoNET_data.fragmentClass = {
			mainFragmentName: firstFragmentName,
			failures: 0
		}
	} else {
		CoNET_data.fragmentClass.mainFragmentName = firstFragmentName
	}
	

	const firstFragmentEncrypted = await getFragmentsFromPublic(firstFragmentName)
	if (!firstFragmentEncrypted) {
		return resolve (false)
	}

	let firstFragmentObj

		try {
			const firstFragmentdecrypted = await CoNETModule.aesGcmDecrypt (firstFragmentEncrypted, partEncryptPassword)
			firstFragmentObj = JSON.parse(firstFragmentdecrypted)

		} catch (ex) {
			return resolve (false)
		}

		const totalFragment = firstFragmentObj.totalFragment
		let clearData: string = firstFragmentObj.data
		const series: any[] = []

		for (let i = 1; i < totalFragment; i ++) {
			const stage = next => {
				getNextFragmentIPFS (_chainVer, passward, i)
				.then( text=> {
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

				
				profile = JSON.parse(clearData)
				

				if (CoNET_Data) {
					CoNET_Data.profiles = profile
					CoNET_Data.ver = _chainVer
					if (CoNET_Data?.fragmentClass) {
						CoNET_Data.fragmentClass.failures = 0
					} else {
						CoNET_Data.fragmentClass = {
							failures: 0,
							mainFragmentName: ''
						}
					}
					
				}

				await storagePieceToLocal()
				
				await storeSystemData()
				
				const cmd: channelWroker = {
					cmd: 'profileVer',
					data: [_chainVer]
				}
				sendState('toFrontEnd', cmd)
				return resolve(true)
				
				
			}).catch ( ex=> {
				return resolve (false)
			})
	
})

const getDetermineVersionProfile = (ver: number, CoNET_Data) => new Promise(async resolve => {


		//	give up get remote version， try back to previous version
		// const failures = async () => {
		// 	logger(`getVersonFragments getFragmentsFromPublic error! Fragment of ver number${chainVer1} `)
		// 	fragmentClass.failures = _chainVer - 1
		// 	return await tryGetProfile (CoNET_Data)
		// }

		let _chainVer = ver
		
		const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
		const partEncryptPassword = encryptPasswordIssue(_chainVer, passward, 0)
		const firstFragmentName = createFragmentFileName(_chainVer, passward, 0)
		if (!CoNET_Data.fragmentClass) {
			CoNET_Data.fragmentClass = {
				mainFragmentName: firstFragmentName
			}
		}
		CoNET_Data.fragmentClass.mainFragmentName = firstFragmentName

		const firstFragmentEncrypted = await getFragmentsFromPublic(firstFragmentName)
		
		if (!firstFragmentEncrypted) {
			return resolve (false)
		}

		
		logger(`checkUpdateAccount fetch ${_chainVer} first Fragment [${firstFragmentName}] with passward [${partEncryptPassword}]`)

		let firstFragmentObj

		try {
			const firstFragmentdecrypted = await CoNETModule.aesGcmDecrypt (firstFragmentEncrypted, partEncryptPassword)
			firstFragmentObj = JSON.parse(firstFragmentdecrypted)

		} catch (ex) {
			return resolve (false)
		}

		const totalFragment = firstFragmentObj.totalFragment
		let clearData: string = firstFragmentObj.data
		const series: any[] = []

		for (let i = 1; i < totalFragment; i ++) {
			const stage = next => {
				getNextFragmentIPFS (_chainVer, passward, i)
				.then( text=> {
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

				
				profile = JSON.parse(clearData)
				

				if (CoNET_Data) {
					CoNET_Data.profiles = profile
					CoNET_Data.ver = _chainVer
					CoNET_Data.fragmentClass.failures = 0
				}

				await storagePieceToLocal()
				
				await storeSystemData()
				
				const cmd: channelWroker = {
					cmd: 'profileVer',
					data: [_chainVer]
				}
				sendState('toFrontEnd', cmd)
				return resolve(true)
				
				
			}).catch ( ex=> {
				return resolve (false)
			})
	
	
})


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

const getLocalProfile = (ver: number) => new Promise(async resolve => {
	if (!CoNET_Data?.profiles || !passObj) {
		resolve(false)
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
		resolve(false)
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
		
		const profile = JSON.parse(clearData)
		if (CoNET_Data) {
			CoNET_Data.profiles = profile
			CoNET_Data.ver = ver
		}
		resolve(true)
	}).catch ( ex => {
		sendState('beforeunload', false)
		logger(`async.series catch ex`, ex)
		resolve(false)
	})
})
	

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
		return null
	}
	return result
}

const getReferee = async (wallet: string, CNTP_Referrals) => {
	

	let result: string[] = []
	try {
		result = await CNTP_Referrals.getReferrer(wallet)
	} catch (ex) {
		logger(`getReferees [${wallet}] Error! try again!`)
		return null
	}
	return result
}


const getAllReferees = async (_wallet: string, CNTP_Referrals) => {

	const firstArray: string[]|null = await getReferees(_wallet, CNTP_Referrals)
	if (!firstArray?.length) {
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

		if (kk?.length) {
			
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

const getFaucet = async (keyID: string) => 
	new Promise (async resolve => {
		
		if (++getFaucetRoop > 6) {
			getFaucetRoop = 0
			logger(`getFaucet Roop > 6 STOP process!`)
			return resolve(null)
		}
	
		const url = `${apiv2_endpoint}conet-faucet`
		let result
		try {
			result = await postToEndpoint(url, true, { walletAddr: keyID })
		} catch (ex) {
			logger (`getFaucet postToEndpoint [${url}] error! `, ex)
			return resolve(null)
		}

		getFaucetRoop = 0
		const txHash = result?.tx

		if (txHash) {
			return resolve (true)
		}
		return resolve (null)
	})


const createKeyHDWallets = () => {
	let root
	try {
		root = ethers.Wallet.createRandom()
	} catch (ex) {
		return null
	}
	return root
}

const decryptSystemData = async () => new Promise((resolve, reject) => {
	//	old version data

	if (!CoNET_Data||!passObj) {
		resolve (null)
		return new Error(`decryptSystemData Have no CoNET_Data Error!`)
	}

	const password = passObj.passcode.toString()

	if (!password) {
		resolve (null)
		throw new Error(`decryptSystemData Password Empty Error!`)
	}

	const filenameIterate1 = ethers.id(password)
	const filenameIterate2 = ethers.id(filenameIterate1)
	const filenameIterate3 = ethers.id(ethers.id(ethers.id(filenameIterate2)))

	const process = async (CoNET_Data) => {
		const filename =  filenameIterate3
		const encryptedObj = await getHashData(filename)
		let encryptIterate1
		try {
			const encryptIterate3 = await CoNETModule.aesGcmDecrypt (encryptedObj, filenameIterate2)
		
			const encryptIterate2 = await CoNETModule.aesGcmDecrypt (encryptIterate3, filenameIterate1)
			encryptIterate1 = await CoNETModule.aesGcmDecrypt (encryptIterate2, password)
		} catch (ex) {
			return reject(false)
		}
		const obj = JSON.parse(encryptIterate1)
		CoNET_Data.mnemonicPhrase = obj.mnemonicPhrase
		CoNET_Data.fx168Order = obj.fx168Order
		CoNET_Data.ver = obj.ver||1
		CoNET_Data.upgradev2 = obj.upgradev2
		return resolve (true)
	}

	if (sendStateBeforeunload) {
		const sendChannel = new BroadcastChannel('beforeunload')
		
		return sendChannel.onmessage = (ev) => {
			return process (CoNET_Data)
		}
		
	}

	return process (CoNET_Data)
})
	



//*		scan assets
const scanCONET_dWBNB = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance (walletAddr, privideCONET, conet_dWBNB)
}


const updateProfilesVersionToIPFS: () => Promise<boolean> = () => new Promise (async resolve => {
	
	if (!CoNET_Data?.profiles || !passObj) {
		
		logger(`updateProfilesVersion !CoNET_Data[${!CoNET_Data}] || !passObj[${!passObj}] === true Error! Stop process.`)
		return resolve (false)
	}

	const profile = CoNET_Data.profiles[0]
	const privateKeyArmor = profile.privateKeyArmor || ''
	
	if (!profile || !privateKeyArmor) {
		
		logger(`updateProfilesVersion Error! profile empty Error! `)
		return resolve (false)
	}
	const constBalance = profile.tokens.conet.balance
	if (constBalance < '0.0001') {
		await getFaucet(profile.keyID)
		
		logger(`updateProfilesVersion hasn't enough CONET to pay GAS`)
		return resolve (false)
	}
	let chainVer

	try {

		[,chainVer] = await checkProfileVersion( profile.keyID)
		const health = await getCONET_api_health()
		if (!health) {
			logger (`CONET api server hasn't health`)
			return resolve (false)
		}
	} catch (ex: any) {
		logger(`updateProfilesVersion checkProfileVersion or getCONET_api_health had Error!`, ex.message )
		return resolve (false)
	}


	const wallet = new ethers.Wallet(profile.privateKeyArmor, provideCONET)
	const storageVer = new ethers.Contract(profile_ver_addr, conet_storageAbi, wallet)
	
	
	const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
	const profilesClearText = JSON.stringify(CoNET_Data.profiles)
	const fileLength = Math.round(1024 * (10 + Math.random() * 20))
	const chearTextFragments = splitTextLimitLength(profilesClearText, fileLength)
	const series: any[] = []
	
	sendState('beforeunload', true)
	chearTextFragments.forEach (( n, index ) => {
		series.push(storagePieceToIPFS(passward, n, index, chearTextFragments.length, 
			fileLength, chainVer, privateKeyArmor, profile.keyID))
	})
	
	try {
		await Promise.all([
			...series
		])
		await updateChainVersion(storageVer, CoNET_Data)
		const [nonce, chainVer1] = await checkProfileVersion( profile.keyID)
		CoNET_Data.ver = parseInt(chainVer1.toString())
		CoNET_Data.nonce = nonce

	} catch (ex) {
		sendState('beforeunload', false)
		logger(`updateProfilesVersion Error!`)
		return resolve (false)
	}
	
	resolve(true)
	await storagePieceToLocal()
	await storeSystemData ()
	logger(`updateProfilesVersion finished`)
	
})


const updateProfilesVersionToIPFS_old: () => Promise<boolean> = () => new Promise (async resolve => {
	
	if (!CoNET_Data?.profiles || !passObj) {
		
		logger(`updateProfilesVersion !CoNET_Data[${!CoNET_Data}] || !passObj[${!passObj}] === true Error! Stop process.`)
		return resolve (false)
	}

	const profile = CoNET_Data.profiles[0]
	const privateKeyArmor = profile.privateKeyArmor || ''
	
	if (!profile || !privateKeyArmor) {
		
		logger(`updateProfilesVersion Error! profile empty Error! `)
		return resolve (false)
	}
	const constBalance = profile.tokens.conet.balance
	if (constBalance < '0.0001') {
		await getFaucet(profile.keyID)
		
		logger(`updateProfilesVersion hasn't enough CONET to pay GAS`)
		return resolve (false)
	}
	let chainVer

	try {

		[,chainVer] = await checkProfileVersion( profile.keyID)
		const health = await getCONET_api_health()
		if (!health) {
			logger (`CONET api server hasn't health`)
			return resolve (false)
		}
	} catch (ex: any) {
		logger(`updateProfilesVersion checkProfileVersion or getCONET_api_health had Error!`, ex.message )
		return resolve (false)
	}


	const wallet = new ethers.Wallet(profile.privateKeyArmor, provideCONET)
	const storageVer = new ethers.Contract(profile_ver_addr, conet_storageAbi, wallet)
	
	
	const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
	const profilesClearText = JSON.stringify(CoNET_Data.profiles)
	const fileLength = Math.round(1024 * (10 + Math.random() * 20))
	const chearTextFragments = splitTextLimitLength(profilesClearText, fileLength)
	const series: any[] = []
	
	sendState('beforeunload', true)
	chearTextFragments.forEach (( n, index ) => {
		series.push(storagePieceToIPFS(passward, n, index, chearTextFragments.length, 
			fileLength, chainVer, privateKeyArmor, profile.keyID))
	})
	
	
	await Promise.all([
		...series
	])
		
	
	try {
		await updateChainVersion(storageVer, CoNET_Data)
		const [nonce, chainVer1] = await checkProfileVersion( profile.keyID)
		CoNET_Data.ver = parseInt(chainVer1.toString())
		CoNET_Data.nonce = nonce

	} catch (ex) {
		sendState('beforeunload', false)
		logger(`updateProfilesVersion Error!`)
		return resolve (false)
	}
	
	resolve(false)
	sendState('beforeunload', false)
	logger(`updateProfilesVersion finished`)
	
})

const scanCONET_dUSDT = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance (walletAddr, privideCONET, conet_dUSDT)
}

const scanCONET_dWETH = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance (walletAddr, privideCONET, conet_dWETH)
}

const scanCONETHolesky = async (walletAddr: string, privideCONET: any) => {
	return await scan_natureBalance (privideCONET, walletAddr)
}

const scanCNTPV1 = async (walletAddr: string, privide: any) => {
	return await scan_erc20_balance(walletAddr, privide, CNTPV1)
}

const scanCCNTP = async (walletAddr: string, privide: any ) => {
	return await scan_erc20_balance(walletAddr, privide, cCNTP_new_Addr)
}

const scanCNTP =  async (walletAddr: string, privide: any) => {
	return await scan_erc20_balance(walletAddr, privide, blast_mainnet_CNTP)
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

const scan_natureBalance = (provide: any, walletAddr: string, provideUrl = '') => new Promise( async resolve => {
	try {
		const result = await provide.getBalance(walletAddr)
		return resolve (result)
	} catch (ex) {
		logger(`scan_natureBalance Error!`, ex)
		return resolve (false)
		// return setTimeout(async () => {
		// 	return resolve(await scan_natureBalance(walletAddr, provide))
		// }, 1000)
	}
	
})

const scanCONET_Claimable_BNBUSDT = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance(walletAddr, privideCONET, Claimable_BNBUSDTv3)
}

const scanCONET_Claimable_BlastUSDB = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance(walletAddr, privideCONET, Claimable_BlastUSDBv3)
}

// const scanCONET_Claimable_BlastETH = async (walletAddr: string, privideCONET: any) => {
// 	return await scan_erc20_balance(walletAddr, privideCONET, Claimable_BlastETH)
// }

// const scanCONET_Claimable_BNB = async (walletAddr: string, privideCONET: any) => {
// 	return await scan_erc20_balance(walletAddr, privideCONET, Claimable_BNB)
// }

// const scanCONET_Claimable_ETH = async (walletAddr: string, privideCONET: any) => {
// 	return await scan_erc20_balance(walletAddr, privideCONET, Claimable_ETH)
// }

const scanCONET_Claimable_ETHUSDT = async (walletAddr: string, privideCONET: any) => {
	return await scan_erc20_balance(walletAddr, privideCONET, Claimable_ETHUSDTv3)
}

const scan_erc20_balance = (walletAddr: string, rpcProdive: any, erc20Address: string) => new Promise (async resolve => {
	const erc20 = new ethers.Contract(erc20Address, blast_CNTPAbi, rpcProdive)

	try {
		const result = await erc20.balanceOf(walletAddr)
		return resolve(result)
	} catch (ex) {
		logger(`scan_erc20_balance Error!`)
		return resolve (false)
		// return setTimeout(async () => {
		// 	return resolve(await scan_erc20_balance(walletAddr, rpcProdive, erc20Address))
		// }, 1000)
	}
})


const scan_Guardian_Nodes = async (walletAddr: string, rpcProdive: any) => {
	return await scan_src1155_balance(walletAddr, rpcProdive, CONET_Guardian_NodesV3, 1)
}

const scan_Guardian_ReferralNodes = async (walletAddr: string, rpcProdive: any) => {
	return await scan_src1155_balance(walletAddr, rpcProdive, CONET_Guardian_NodesV3, 2)
}

const scan_src1155_balance = (walletAddr: string, rpcProdive: any, erc1155Address: string, id: number) => new Promise(async resolve => {
	const erc1155 = new ethers.Contract(erc1155Address, guardian_erc1155, rpcProdive)
	try {
		const result = await erc1155.balanceOf(walletAddr, id)
		return resolve(result)
	} catch (ex) {
		logger(`scan_src1155_balance Error!`)
		return resolve (false)
		// return setTimeout(async () => {
		// 	return resolve(await scan_src1155_balance(walletAddr, rpcProdive, erc1155Address, id))
		// }, 1000)
	}
})

const getNetwork = (networkName: string) => {
	switch (networkName) {
		case 'usdb':
		case 'blastETH': 
			{
				return blast_mainnet()
			}
		// case 'dUSDT':
		// case 'dWBNB':
		// case 'dWETH':
		case 'cCNTP':
		case 'cUSDB':
		case 'cCNTP':
		case 'cUSDT':
		case 'cBNBUSDT':
		case 'conet':
		case 'cntpb': 
			{
				return conet_rpc
			}
		case 'usdt':
		case 'eth': 
			{
				return ethRpc()
			}
		case 'wusdt': 
		case 'bnb': 
			{
				return bsc_mainchain
			}
		case 'cntp':
			{
				return blast_sepoliaRpc
			}
		default: {
			return ''
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

		case 'cCNTP': {
			return cCNTP_new_Addr
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

const parseEther = (ether: string, tokenName: string ) => {
	switch (tokenName) {
		case 'usdt': {
			return ethers.parseUnits(ether, 6)
		}
		default: {
			return ethers.parseEther(ether)
		}
	}
}

const getEstimateGas = (privateKey: string, asset: string, _transferNumber: string, keyAddr: string) => new Promise(async resolve=> {

	const provide = new ethers.JsonRpcProvider(getNetwork(asset))
	const wallet = new ethers.Wallet(privateKey, provide)
	const toAddr = CONET_guardian_Address(asset)
	let _fee, _fee1
	const transferNumber = parseEther(_transferNumber, asset)
	const smartContractAddr = getAssetERC20Address(asset)
	if (smartContractAddr) {
		const estGas = new ethers.Contract(smartContractAddr, blast_CNTPAbi, wallet)
		try {
			_fee = await estGas.transfer.estimateGas(toAddr, transferNumber)
			//_fee = await estGas.safetransferFrom(keyAddr, toAddr, transferNumber)
		} catch (ex) {
			return resolve (false)
		}
		
	} else {
		const tx = {
			to:toAddr,
			value: transferNumber
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

	// const total = await getAmountOfNodes(nodes, tokenName)

	if (!cryptoAsset|| !CoNET_Data?.profiles ) {
		const cmd1: channelWroker = {
			cmd: 'purchaseStatus',
			data: [-1]
		}
		sendState('toFrontEnd', cmd1)
		return false
	}
	
	if (parseFloat(cryptoAsset.balance) - _total < 0 || !profile.privateKeyArmor) {
		const cmd1: channelWroker = {
			cmd: 'purchaseStatus',
			data: [-1]
		}
		sendState('toFrontEnd', cmd1)
		return false
	}
	const cmd1: channelWroker = {
		cmd: 'purchaseStatus',
		data: [1]
	}

	sendState('toFrontEnd', cmd1)

	const tx = await transferAssetToCONET_guardian (profile.privateKeyArmor, cryptoAsset, _total.toString(), profile.keyID)
	if (typeof tx === 'boolean') {
		const cmd1: channelWroker = {
			cmd: 'purchaseStatus',
			data: [-1]
		}
		sendState('toFrontEnd', cmd1)
		return false
	}
	
	const cmd2: channelWroker = {
		cmd: 'purchaseStatus',
		data: [2]
	}
	sendState('toFrontEnd', cmd2)

	await tx.wait()

	const kk1: CryptoAssetHistory = {
		status: 'Confirmed',
		Nonce: tx.nonce,
		to: tx.to,
		transactionFee: stringFix(ethers.formatEther((tx.maxFeePerGas||tx.gasPrice) *tx.gasLimit)),
		gasUsed: (tx.maxFeePerGas||tx.gasPrice).toString(),
		isSend: true,
		value: parseEther(_total.toString(), cryptoAsset.name).toString(),
		time: new Date().toISOString(),
		transactionHash: tx.hash,

	}

	cryptoAsset.history.push(kk1)
	
	const profiles = CoNET_Data.profiles
	const publikPool = await createWallet(profiles, CoNET_Data.mnemonicPhrase, nodes)

	const data = {
		receiptTx: tx.hash,
		publishKeys: publikPool,
		nodes: nodes,
		tokenName,
		network: cryptoAsset.network,
		amount: parseEther(_total.toString(),cryptoAsset.name ).toString()
	}

	const message =JSON.stringify({ walletAddress: profile.keyID, data})
	const messageHash = ethers.id(message)
	const signMessage = CoNETModule.EthCrypto.sign(profile.privateKeyArmor, messageHash)
	const sendData = {
		message, signMessage
	}
	
	const cmd3: channelWroker = {
		cmd: 'purchaseStatus',
		data: [3]
	}
	sendState('toFrontEnd', cmd3)
	const url = `${ apiv2_endpoint }Purchase-Guardian`
	let result: any
	try {
		result = await postToEndpoint(url, true, sendData)
	} catch (ex) {
		const cmd3: channelWroker = {
			cmd: 'purchaseStatus',
			data: [-2, kk1]
		}
		sendState('toFrontEnd', cmd3)
		return false
	}

	
	if (!result) {
		const cmd3: channelWroker = {
			cmd: 'purchaseStatus',
			data: [-2, kk1]
		}
		sendState('toFrontEnd', cmd3)
		return false
	}
	await storagePieceToLocal()
	await storeSystemData ()
	
	return true
}

const stringFix = (num: string) => {
	const index = num.indexOf('.')
	if (index <0) {
		return num 
	}
	return num.substring(0, index+12)
}

const transferAssetToCONET_guardian: (privateKey: string, token: CryptoAsset, transferNumber: string, keyID: string) => Promise<boolean|transferTx> = (privateKey, token, transferNumber, keyID) => new Promise(async resolve=> {
	const provide = new ethers.JsonRpcProvider(getNetwork(token.name))
	const wallet = new ethers.Wallet(privateKey, provide)
	const toAddr = CONET_guardian_Address(token.name)
	const smartContractAddr = getAssetERC20Address(token.name)
	if (smartContractAddr) {
		const transferObj = new ethers.Contract(smartContractAddr, blast_CNTPAbi, wallet)
		const amount = parseEther(transferNumber, token.name)
		try {
			// const k1 = await transferObj.approve(toAddr, amount)
			const k2 = (await transferObj.transfer(toAddr, amount))
			resolve(k2)
		} catch (ex) {
			return resolve (false)
		}
		
	} else {
		const tx = {
			to:toAddr,
			value: ethers.parseEther(transferNumber)
		}
		try {

			return resolve(await wallet.sendTransaction(tx))
		} catch (ex) {
			return resolve (false)
		}
		
	}
})

const CONET_transfer_token: (
  profile: profile,
  to: string,
  _total: number,
  tokenName: string
) => Promise<boolean | transferTx> = async (profile, to, _total, tokenName) => {
  const cryptoAsset: CryptoAsset = profile.tokens[tokenName];

  if (!cryptoAsset || !CoNET_Data?.profiles) {
    const cmd1: channelWroker = {
      cmd: 'tokenTransferStatus',
      data: [-1],
    };
    sendState('toFrontEnd', cmd1);
    return false;
  }

  if (
    parseFloat(cryptoAsset.balance) - _total < 0 ||
    !profile.privateKeyArmor
  ) {
    const cmd1: channelWroker = {
      cmd: 'tokenTransferStatus',
      data: [-1],
    };
    sendState('toFrontEnd', cmd1);
    return false;
  }

  const cmd1: channelWroker = {
    cmd: 'tokenTransferStatus',
    data: [1],
  };

  sendState('toFrontEnd', cmd1);

  const tx = await transferAssetToCONET_wallet(
    profile.privateKeyArmor,
    cryptoAsset,
    _total.toString(),
    to
  );

  if (typeof tx === 'boolean') {
    const cmd1: channelWroker = {
      cmd: 'tokenTransferStatus',
      data: [-1],
    };
    sendState('toFrontEnd', cmd1);
    return false;
  }

  const cmd2: channelWroker = {
    cmd: 'tokenTransferStatus',
    data: [2],
  };
  sendState('toFrontEnd', cmd2);

  await tx.wait();

  const kk1: CryptoAssetHistory = {
    status: 'Confirmed',
    Nonce: tx.nonce,
    to: tx.to,
    transactionFee: stringFix(
      ethers.formatEther((tx.maxFeePerGas || tx.gasPrice) * tx.gasLimit)
    ),
    gasUsed: (tx.maxFeePerGas || tx.gasPrice).toString(),
    isSend: true,
    value: parseEther(_total.toString(), cryptoAsset.name).toString(),
    time: new Date().toISOString(),
    transactionHash: tx.hash,
  };

  cryptoAsset.history.push(kk1);
  
  Promise.all([
    await updateProfilesVersionToIPFS(),
    await storagePieceToLocal(),
  ]);

  await storeSystemData();

  return tx;
};

const transferAssetToCONET_wallet: (
  privateKey: string,
  token: CryptoAsset,
  transferNumber: string,
  toAddr: string
) => Promise<boolean | transferTx> = (
  privateKey,
  token,
  transferNumber,
  toAddr
) =>
  new Promise(async (resolve) => {
    const provide = new ethers.JsonRpcProvider(getNetwork(token.name));
    const wallet = new ethers.Wallet(privateKey, provide);
    const smartContractAddr = getAssetERC20Address(token.name);

    if (smartContractAddr) {
      const transferObj = new ethers.Contract(
        smartContractAddr,
        blast_CNTPAbi,
        wallet
      );

      const amount = parseEther(transferNumber, token.name);

      try {
        // const k1 = await transferObj.approve(toAddr, amount)
        const k2 = await transferObj.transfer(toAddr, amount);
        resolve(k2);
      } catch (ex) {
        return resolve(false);
      }
    } else {
      const tx = {
        to: toAddr,
        value: ethers.parseEther(transferNumber),
      };

      try {
        return resolve(await wallet.sendTransaction(tx));
      } catch (ex) {
        return resolve(false);
      }
    }
  }
);

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

const createWallet =async (profiles: profile[], mnemonicPhrase: string, total: number) => {
	const pIndex = profiles.map(n=> n.index)
	const root = ethers.Wallet.fromPhrase(mnemonicPhrase)
	const nextIndex = pIndex.sort((a,b) => b-a)[0]
	const publikPool: string[] = []
	for (let i=1; i <= total; i ++) {
		const newAcc = root.deriveChild(nextIndex+i)
		const key = await createGPGKey('', '', '')
		publikPool.push (newAcc.address)
		const _profile: profile = {
			isPrimary: false,
			keyID: newAcc.address,
			privateKeyArmor: newAcc.signingKey.privateKey,
			hdPath: newAcc.path,
			index: newAcc.index,
			isNode: true,
			pgpKey: {
				privateKeyArmor: key.privateKey,
				publicKeyArmor: key.publicKey
			},
			referrer: null,
			tokens: initProfileTokens(),
			data: {
				alias: `CONET Guardian node${i}`,
				isNode: true
			}
		}
		profiles.push(_profile)
	}
	return publikPool
}

const getFx168OrderStatus= async (oederID: number, fx168ContractObj: any, wallet: string) => {
	try {
		const tx = await fx168ContractObj.OrderStatus(oederID)
		const nodes = await fx168ContractObj.balanceOf(wallet, oederID)
		return {id: oederID.toString(), nodes: nodes.toString(), status: tx.toString()}
	} catch (ex) {
		return null
	}
}

const fx168PrePurchase =  async (cmd: worker_command) => {
	const [nodes] = cmd.data
	if (!nodes||!CoNET_Data||!CoNET_Data.profiles) {
		cmd.err = 'INVALID_DATA'
		return returnUUIDChannel(cmd)
	}
	const profiles = CoNET_Data.profiles
	if (!CoNET_Data.fx168Order) {
		CoNET_Data.fx168Order = []
	}
	const publikPool = await createWallet(profiles, CoNET_Data.mnemonicPhrase, nodes)

	const provideCONET = new ethers.JsonRpcProvider(conet_rpc)
	const wallet = new ethers.Wallet(profiles[0].privateKeyArmor, provideCONET)
	const fx168ContractObj = new ethers.Contract(fx168OrderContractAddress, fx168_Order_Abi, wallet)
	const fx168ContractObjRead = new ethers.Contract(fx168OrderContractAddress, fx168_Order_Abi, provideCONET)
	let tx, kk
	try {
		tx = await fx168ContractObj.newOrder(publikPool)
		await tx.wait()
		kk = await fx168ContractObjRead.getOwnerOrders(profiles[0].keyID)

	} catch (ex) {
		logger(`await fx168ContractObj.newOrder(nodes, publikPool) Error!`, ex)
	}
	const fx168OrderArray: any[] = []
	for (let i of kk) {
		const status = await getFx168OrderStatus(i, fx168ContractObjRead, profiles[0].keyID)
		fx168OrderArray.push (status)
	}
	if (!fx168OrderArray.length ) {
		cmd.err = 'NOT_READY'
		return returnUUIDChannel(cmd)
	}
	const last = fx168OrderArray[fx168OrderArray.length - 1]
	cmd.data = [[last]]
	return returnUUIDChannel(cmd)
}

let miningConn
let Stoping = false



const _startMining = async (cmd: worker_command, profile: profile) => {
	

	const message =JSON.stringify({walletAddress: profile.keyID})
	const messageHash =  ethers.id(message)
	const signMessage = CoNETModule.EthCrypto.sign(profile.privateKeyArmor, messageHash)
	const sendData = {
		message, signMessage
	}

	const url = `${ api_endpoint }startMining`

	logger(url)
	let first = true
	let cCNTPcurrentTotal = parseFloat(profile.tokens.cCNTP.balance||'0')
	let cCNTPcurrentEarn = 0
	miningConn = postToEndpointSSE(url, true, JSON.stringify(sendData), async (err, _data) => {
		if (Stoping) {
			if (miningConn) {
				miningConn.abort()
			}
			return
			
		}
		if (err) {
			logger(err)
			cmd.err = err
			return returnUUIDChannel(cmd)
		}
		logger('success', _data)
		const kk = JSON.parse(_data)
		
		if (first) {
			first = false
			kk['currentCCNTP'] = '0'
			cmd.data = ['success', JSON.stringify(kk)]
			return returnUUIDChannel(cmd)
		}
		
		kk.rate = typeof kk.rate ==='number' ? kk.rate.toFixed(10) : parseFloat(kk.rate).toFixed(10)
		kk['currentCCNTP'] = (parseFloat(profile.tokens.cCNTP.balance||'0') - cCNTPcurrentTotal).toFixed(8)
		const cmdd: channelWroker = {
			cmd: 'miningStatus',
			data: [JSON.stringify(kk)]
		}
		
		sendState('toFrontEnd', cmdd)
	})
}

const startMining = async (cmd: worker_command) => {
	const _authorization_key: string = cmd.data[0]
	const _profile: profile = cmd.data[1]
	if (!CoNET_Data || !CoNET_Data?.profiles|| authorization_key !== _authorization_key||!_profile) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	const index = CoNET_Data.profiles.findIndex(n => n.keyID.toLowerCase() === _profile.keyID.toLowerCase())

	if (index < 0||Stoping) {
		cmd.err = 'FAILURE'
		return returnUUIDChannel(cmd)
	}
	const profile =  CoNET_Data.profiles[index]
	return await _startMining(cmd, profile)
}

//

declare const ethers
declare const uuid
declare const Jimp

const getAllReferrer = async () => {
	if (!CoNET_Data?.profiles) {
		return null
	}

	const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	const CNTP_Referrals = new ethers.Contract(ReferralsAddressV3, CONET_ReferralsAbi, provideNewCONET)
	for (let i of CoNET_Data?.profiles) {

		const kk = await getReferrer(i.keyID, CNTP_Referrals)
		if (!kk||kk === '0x0000000000000000000000000000000000000000') {
			delete i.referrer
			continue
		}
		i.referrer = kk
	}
}


const getReferrer = async (wallet: string, CNTP_Referrals) => {
	let result: string 
	try {
		result = await CNTP_Referrals.getReferrer(wallet)
	} catch (ex) {
		logger(`getReferees [${wallet}] Error! try again!`)
		return null
	}
	return result
}

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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "burnFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "status",
                "type": "bool"
            }
        ],
        "name": "changeAddressInWhitelist",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bool",
                "name": "_rule",
                "type": "bool"
            }
        ],
        "name": "changeWhitelistRule",
        "outputs": [],
        "stateMutability": "nonpayable",
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
                "name": "_to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "internalType": "bool",
                "name": "success",
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
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "whiteList",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "whitelistRule",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
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

const fx168_Order_Abi = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
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
            },
            {
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "name": "ERC1155InsufficientBalance",
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
        "name": "ERC1155InvalidApprover",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "idsLength",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "valuesLength",
                "type": "uint256"
            }
        ],
        "name": "ERC1155InvalidArrayLength",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "operator",
                "type": "address"
            }
        ],
        "name": "ERC1155InvalidOperator",
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
        "name": "ERC1155InvalidReceiver",
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
        "name": "ERC1155InvalidSender",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "ERC1155MissingApprovalForAll",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bool",
                "name": "approved",
                "type": "bool"
            }
        ],
        "name": "ApprovalForAll",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
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
                "internalType": "uint256[]",
                "name": "ids",
                "type": "uint256[]"
            },
            {
                "indexed": false,
                "internalType": "uint256[]",
                "name": "values",
                "type": "uint256[]"
            }
        ],
        "name": "TransferBatch",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
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
                "name": "id",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "TransferSingle",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "string",
                "name": "value",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "URI",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "OrderNodes",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "OrderStatus",
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
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
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
        "inputs": [
            {
                "internalType": "address[]",
                "name": "accounts",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "ids",
                "type": "uint256[]"
            }
        ],
        "name": "balanceOfBatch",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "currentNodeID",
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
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "exists",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "status",
                "type": "uint256"
            }
        ],
        "name": "fx168OrderStatus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "orderID",
                "type": "uint256"
            }
        ],
        "name": "getNodesAddress",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "nodes",
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
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "getOwnerOrders",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "orders",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "operator",
                "type": "address"
            }
        ],
        "name": "isApprovedForAll",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
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
        "inputs": [
            {
                "internalType": "address[]",
                "name": "_nodes",
                "type": "address[]"
            }
        ],
        "name": "newOrder",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "ownerOrders",
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
                "name": "from",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256[]",
                "name": "ids",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "values",
                "type": "uint256[]"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "safeBatchTransferFrom",
        "outputs": [],
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
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "approved",
                "type": "bool"
            }
        ],
        "name": "setApprovalForAll",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes4",
                "name": "interfaceId",
                "type": "bytes4"
            }
        ],
        "name": "supportsInterface",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
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
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
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
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "uri",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

const claimableContract = [
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "burnFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
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
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "mint",
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

const guardian_erc1155 = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
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
            },
            {
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "name": "ERC1155InsufficientBalance",
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
        "name": "ERC1155InvalidApprover",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "idsLength",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "valuesLength",
                "type": "uint256"
            }
        ],
        "name": "ERC1155InvalidArrayLength",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "operator",
                "type": "address"
            }
        ],
        "name": "ERC1155InvalidOperator",
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
        "name": "ERC1155InvalidReceiver",
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
        "name": "ERC1155InvalidSender",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "ERC1155MissingApprovalForAll",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bool",
                "name": "approved",
                "type": "bool"
            }
        ],
        "name": "ApprovalForAll",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
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
                "internalType": "uint256[]",
                "name": "ids",
                "type": "uint256[]"
            },
            {
                "indexed": false,
                "internalType": "uint256[]",
                "name": "values",
                "type": "uint256[]"
            }
        ],
        "name": "TransferBatch",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
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
                "name": "id",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "TransferSingle",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "string",
                "name": "value",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "URI",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "BUYER",
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
        "name": "REFERRER",
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
                "internalType": "uint256",
                "name": "nodeId",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_metadata",
                "type": "string"
            }
        ],
        "name": "_changeNodeMetadata",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
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
        "inputs": [
            {
                "internalType": "address[]",
                "name": "accounts",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "ids",
                "type": "uint256[]"
            }
        ],
        "name": "balanceOfBatch",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "uint256[]",
                "name": "ids",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "values",
                "type": "uint256[]"
            }
        ],
        "name": "burnBatch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "canTransferRule",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "currentNodeID",
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
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "exists",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllIdOwnershipAndBooster",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "nodeAddress",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "boosters",
                "type": "uint256[]"
            },
            {
                "internalType": "address[]",
                "name": "referrerAddress",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "referrerNodes",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "nodeId",
                "type": "uint256"
            }
        ],
        "name": "getNodeMetadata",
        "outputs": [
            {
                "internalType": "string",
                "name": "nodeMetadata",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "getOwnerNodesAddress",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "nodesAddress",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "nodeId",
                "type": "uint256"
            }
        ],
        "name": "getOwnership",
        "outputs": [
            {
                "internalType": "address",
                "name": "ownerWallet",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "operator",
                "type": "address"
            }
        ],
        "name": "isApprovedForAll",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "metadata",
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
        "inputs": [
            {
                "internalType": "address[]",
                "name": "to",
                "type": "address[]"
            },
            {
                "internalType": "address",
                "name": "paymentWallet",
                "type": "address"
            }
        ],
        "name": "mint",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "nodeIdBooster",
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
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "nodeOwnershipAddress",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "nodeReferrerAddress",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "ownershipForIDs",
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
                "name": "",
                "type": "address"
            }
        ],
        "name": "ownershipForNodeID",
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
                "name": "from",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256[]",
                "name": "ids",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "values",
                "type": "uint256[]"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "safeBatchTransferFrom",
        "outputs": [],
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
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "approved",
                "type": "bool"
            }
        ],
        "name": "setApprovalForAll",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bool",
                "name": "status",
                "type": "bool"
            }
        ],
        "name": "setCanTransferRule",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "url",
                "type": "string"
            }
        ],
        "name": "setNFTUrl",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes4",
                "name": "interfaceId",
                "type": "bytes4"
            }
        ],
        "name": "supportsInterface",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
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
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
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
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "uri",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

const CONET_Guardian_NodeInfo_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "getAllRegions",
        "outputs": [
            {
                "internalType": "string[]",
                "name": "allRegions",
                "type": "string[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            }
        ],
        "name": "getIpAddressOwn",
        "outputs": [
            {
                "internalType": "address",
                "name": "ownership",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            }
        ],
        "name": "getIpAddressReg",
        "outputs": [
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "getNodeInfoById",
        "outputs": [
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            }
        ],
        "name": "getNodePGP",
        "outputs": [
            {
                "internalType": "string",
                "name": "pgp",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            }
        ],
        "name": "getReginNodes",
        "outputs": [
            {
                "internalType": "string[]",
                "name": "nodes",
                "type": "string[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "id_region",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "ipaddress_owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "ipaddress_pgp",
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
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "ipaddress_reg",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            }
        ],
        "name": "isRegionExisting",
        "outputs": [
            {
                "internalType": "bool",
                "name": "region_existing",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "pgp",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "modify_nodes",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "addAddress",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "setup",
                "type": "bool"
            }
        ],
        "name": "modify_whiteList",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "nodeIpAddress",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "pgp_public",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "regionList",
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
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "region_hashs",
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
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "region_nodes",
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
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "whiteList",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

const cCNTP_ABI = [
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "burnFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "status",
                "type": "bool"
            }
        ],
        "name": "changeAddressInWhitelist",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bool",
                "name": "_rule",
                "type": "bool"
            }
        ],
        "name": "changeWhitelistRule",
        "outputs": [],
        "stateMutability": "nonpayable",
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
                "name": "_to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "internalType": "bool",
                "name": "success",
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
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "whiteList",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "whitelistRule",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

const GuardianNodesInfoV3_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "getAllRegions",
        "outputs": [
            {
                "internalType": "string[]",
                "name": "allRegions",
                "type": "string[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            }
        ],
        "name": "getIpAddressOwn",
        "outputs": [
            {
                "internalType": "address",
                "name": "ownership",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            }
        ],
        "name": "getIpAddressReg",
        "outputs": [
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "getNodeInfoById",
        "outputs": [
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            }
        ],
        "name": "getNodePGP",
        "outputs": [
            {
                "internalType": "string",
                "name": "pgp",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            }
        ],
        "name": "getReginNodes",
        "outputs": [
            {
                "internalType": "string[]",
                "name": "nodes",
                "type": "string[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "id_region",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "ipaddress_owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "ipaddress_pgp",
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
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "ipaddress_reg",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            }
        ],
        "name": "isRegionExisting",
        "outputs": [
            {
                "internalType": "bool",
                "name": "region_existing",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "ipaddress",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "regionName",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "pgp",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "modify_nodes",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "addAddress",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "setup",
                "type": "bool"
            }
        ],
        "name": "modify_whiteList",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "nodeIpAddress",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "pgp_public",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "regionList",
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
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "region_hashs",
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
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "region_nodes",
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
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "whiteList",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

const openPGPKeys_ABI = [
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "keyHash",
                "type": "bytes32"
            }
        ],
        "name": "getRegiestWallet",
        "outputs": [
            {
                "internalType": "address",
                "name": "wallet",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "wallet",
                "type": "address"
            }
        ],
        "name": "getWalletPGP",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "keyHash",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "keyHash",
                "type": "bytes32"
            }
        ],
        "name": "regiestPGP",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]