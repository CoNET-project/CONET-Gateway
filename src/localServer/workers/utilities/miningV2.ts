

let Guardian_Nodes:nodes_info[]  = []

let getAllNodesProcess = false

const getAllNodes = async () => {
	if (getAllNodesProcess) {
		return
	}
	getAllNodesProcess = true
	const GuardianNodes = new ethers.Contract(CONET_Guardian_Nodes_V6, guardian_erc1155, provideCONET)
	let scanNodes = 0
	try {
		const maxNodes: BigInt = await GuardianNodes.currentNodeID()
		scanNodes = parseInt(maxNodes.toString())

	} catch (ex) {
		return logger (`getAllNodes currentNodeID Error`, ex)
	}
	if (!scanNodes) {
		return logger(`getAllNodes STOP scan because scanNodes == 0`)
	}
	Guardian_Nodes = []
	for (let i = 0; i < scanNodes; i ++) {
		
		Guardian_Nodes.push({
			region: '',
			country: '',
			ip_addr: '',
			armoredPublicKey: '',
			last_online: false,
			nftNumber: 100 + i
		})
	}
	const GuardianNodesInfo = new ethers.Contract(CONET_Guardian_NodeInfoV6, CONET_Guardian_NodeInfo_ABI, provideCONET)
	
	await async.mapLimit(Guardian_Nodes, 5, async (n: nodes_info, next) => {
		const nodeInfo = await GuardianNodesInfo.getNodeInfoById(n.nftNumber)
		n.region = nodeInfo.regionName
		n.ip_addr = nodeInfo.ipaddress
		n.armoredPublicKey = buffer.Buffer.from(nodeInfo.pgp,'base64').toString()
		const pgpKey1 = await openpgp.readKey({ armoredKey: n.armoredPublicKey})
		n.domain = pgpKey1.getKeyIDs()[1].toHex().toUpperCase() + '.conet.network'

	})
	getAllNodesProcess = false
}

const getRandomNodeV2: (index: number) => null|nodes_info = (index = -1) => { 
	const totalNodes = Guardian_Nodes.length - 1
	if (!totalNodes ) {
		return null
	}

	const nodoNumber = Math.floor(Math.random() * totalNodes)
	if (index > -1 && nodoNumber === index) {
		logger(`getRandomNodeV2 nodoNumber ${nodoNumber} == index ${index} REUNING AGAIN!`)
		return getRandomNodeV2(index)
	}

	const node = Guardian_Nodes[nodoNumber]
	logger(`getRandomNodeV2 Guardian_Nodes length =${Guardian_Nodes.length} nodoNumber = ${nodoNumber} `)
	return node
}

const createGPGKey = async ( passwd: string, name: string, email: string ) => {
	const userId = {
		name: name,
		email: email
	}
	const option = {
        type: 'ecc',
		passphrase: passwd,
		userIDs: [userId],
		curve: 'curve25519',
        format: 'armored'
	}

	return await openpgp.generateKey ( option )
}


const _startMiningV2 = async (profile: profile, cmd: worker_command|null = null) => {
	await getAllNodes()
    miningAddress = profile.keyID.toLowerCase()
	const totalNodes = Guardian_Nodes.length - 1
	if (!totalNodes ) {
		if (cmd) {
			cmd.err = 'FAILURE'
        	return returnUUIDChannel(cmd)
		}
		return 
	}
	const nodoNumber = Math.floor(Math.random() * totalNodes)
	const connectNode = Guardian_Nodes[nodoNumber]
	
	if (!connectNode) {
		if (cmd) {
			cmd.err = 'FAILURE'
        	return returnUUIDChannel(cmd)
		}
		return 
	}
	
	if (!profile?.pgpKey) {
		profile.pgpKey = await createGPGKey('', '', '')
	}

	const index = Guardian_Nodes.findIndex(n => n.ip_addr === connectNode.ip_addr)
	Guardian_Nodes.splice(index, 1)
	
    const postData = await createConnectCmd(profile, connectNode)
    let first = true

	const balance = profile?.tokens?.cCNTP?.balance
	cCNTPcurrentTotal = !balance ? 0 : parseFloat(balance)

	if (!connectNode?.domain || !postData) {
		if (cmd) {
			cmd.err = 'FAILURE'
        	return returnUUIDChannel(cmd)
		}
		return
	}

	const url = `https://${connectNode.domain}/post`

    miningConn = postToEndpointSSE(url, true, {data:postData.requestData[0]}, async (err, _data) => {

        if (err) {
            logger(err);
            if (cmd) {
                cmd.err = err;
                return returnUUIDChannel(cmd)
            }
            return
        }

        logger('_startMiningV2 success', _data)
        const response: nodeResponse = JSON.parse(_data)
        mining_epoch = epoch

		if (!profile?.tokens) {
			profile.tokens = {}
		}

		if (!profile.tokens?.cCNTP) {
			profile.tokens.cCNTP = {
				balance: '0',
				history: [],
				network: 'CONET Holesky',
				decimal: 18,
				contract: cCNTP_new_Addr,
				name: 'cCNTP'
			}
			
		}

		const cCNTP = profile.tokens.cCNTP

        if (first) {
            miningProfile = profile
            first = false

            if (cmd) {

                cCNTPcurrentTotal = parseFloat(cCNTP.balance || '0');
                response.currentCCNTP = '0'
                cmd.data = ['success', JSON.stringify(response)]
                return returnUUIDChannel(cmd)
            }

            return
        }
		const kk = parseFloat(response.rate)
        response.rate = isNaN(kk) ? '' : kk.toFixed(8)
        response.currentCCNTP = (parseFloat(profile.tokens.cCNTP.balance || '0') - cCNTPcurrentTotal).toFixed(8)
        if (response.currentCCNTP < '0') {
            cCNTPcurrentTotal = parseFloat(profile.tokens.cCNTP.balance)
            response.currentCCNTP = '0'
        }

        const cmdd = {
            cmd: 'miningStatus',
            data: [JSON.stringify(response)]
        }

        sendState('toFrontEnd', cmdd)
		const entryNode = getRandomNodeV2(nodoNumber)
		if (!entryNode) {
			logger(`_startMiningV2 Error! getRandomNodeV2 return null!`)
			return
		}

		validator(response, profile, entryNode)
    })
}

const validator = async (response: nodeResponse, profile: profile, sentryNode: nodes_info) => {
	if (!response.hash) {
		logger(response)
		return logger(`checkMiningHash got NULL response.hash ERROR!`)
	}
	const message = JSON.stringify({epoch: response.epoch, wallet: profile.keyID.toLowerCase()})
	const va = ethers.verifyMessage(message, response.hash)
	if (va.toLowerCase() !== response.nodeWallet.toLowerCase()) {
		return logger(`validator va${va.toLowerCase()} !== response.nodeWallet ${response.nodeWallet.toLowerCase()}`)
	}
	const wallet = new ethers.Wallet (profile.privateKeyArmor)
	response.minerResponseHash = await wallet.signMessage(response.hash)
	//	clean data
	response.userWallets = response.nodeWallets = []
	const request = await ceateMininngValidator(profile, sentryNode, response)
	if (!request) {
		return logger(`ceateMininngValidator got null Error!`)
	}

	const url = `https://${sentryNode.domain}/post`
	const req = await postToEndpoint(url, true, {data: request.requestData[0]}).catch(ex => {
		logger(ex)
	})

	logger(req)
}

const ceateMininngValidator = async (currentProfile: profile, node: nodes_info, requestData: any = null) => {
	if (!currentProfile || !currentProfile.pgpKey|| !node.armoredPublicKey) {
		logger (`currentProfile?.pgpKey[${currentProfile?.pgpKey}]|| !SaaSnode?.armoredPublicKey[${node?.armoredPublicKey}] Error`)
		return null
	}
	const key = buffer.Buffer.from(self.crypto.getRandomValues(new Uint8Array(16))).toString('base64')
	const command: SICommandObj = {
		command: 'mining_validator',
		algorithm: 'aes-256-cbc',
		Securitykey: key,
		requestData,
		walletAddress: currentProfile.keyID.toLowerCase()
	}


	const message =JSON.stringify(command)
	const wallet = new ethers.Wallet(currentProfile.privateKeyArmor)
	const signMessage = await wallet.signMessage(message)
	let privateKeyObj = null

	try {
		privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey.privateKeyArmor)
	} catch (ex){
		return logger (ex)
	}

	const encryptedCommand = await encrypt_Message( privateKeyObj, node.armoredPublicKey, {message, signMessage})
	command.requestData = [encryptedCommand, '', key]
	return (command)
}

const makePrivateKeyObj = async ( privateArmor: string, password = '' ) => {

	if  (!privateArmor) {
		const msg = `makePrivateKeyObj have no privateArmor Error!`
		return logger (msg)
	}

	let privateKey = await openpgp.readPrivateKey ({armoredKey: privateArmor})

	if (!privateKey.isDecrypted()) {
		privateKey = await openpgp.decryptKey({
			privateKey,
			passphrase: password
		})
	}

	return privateKey
}

const createConnectCmd = async (currentProfile: profile, node: nodes_info, requestData: any = null) => {
	if (!currentProfile || !currentProfile.pgpKey|| !node.armoredPublicKey) {
		logger (`currentProfile?.pgpKey[${currentProfile?.pgpKey}]|| !SaaSnode?.armoredPublicKey[${node?.armoredPublicKey}] Error`)
		return null
	}

	const key = buffer.Buffer.from(self.crypto.getRandomValues(new Uint8Array(16))).toString('base64')
	const command: SICommandObj = {
		command: 'mining',
		algorithm: 'aes-256-cbc',
		Securitykey: key,
		requestData,
		walletAddress: currentProfile.keyID.toLowerCase()
	}
	
	logger(`mining`)
	const message =JSON.stringify(command)
	const wallet = new ethers.Wallet(currentProfile.privateKeyArmor)
	const signMessage = await wallet.signMessage(message)
	

	let privateKeyObj = null

	try {
		privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey.privateKeyArmor)
	} catch (ex){
		return logger (ex)
	}


	const encryptedCommand = await encrypt_Message( privateKeyObj, node.armoredPublicKey, {message, signMessage})
	command.requestData = [encryptedCommand, '', key]
	return (command)
}

const encrypt_Message = async (privatePgpObj: any, armoredPublicKey: string, message: any) => {
	const encryptObj = {
        message: await openpgp.createMessage({text: buffer.Buffer.from(JSON.stringify (message)).toString('base64')}),
        encryptionKeys: await openpgp.readKey ({ armoredKey: armoredPublicKey }),
        signingKeys: privatePgpObj,
		config: { preferredCompressionAlgorithm: openpgp.enums.compression.zlib } 		// compress the data with zlib
    }
	return await openpgp.encrypt(encryptObj)
}

const getGuardianPrice = (nftNumber: number) => {
	switch(nftNumber) {
		case 0 : {
			return 100
		}
		default: {
			return 0
		}
	}
}

const getOracleAssets = (tokenName: string) => {
	if (!assetOracle) {
		return 0
	}
	const index = assetOracle.assets.findIndex(n => n.name == tokenName)
	if (index < 0) {
		return 0
	}
	const rate = parseFloat(assetOracle.assets[index].price.toString())
	return rate
}

const convertUSDTToCurrency = (currencyName: string, usdtAmount: number) => {
	if (/usdt/.test(currencyName)) {
		return usdtAmount
	}
	const rate = /bnb/.test(currencyName) ? getOracleAssets('bnb') : getOracleAssets('eth')
	if (!rate) {
		return 0
	}

	return (usdtAmount/rate)
}

const CONETianPlan_purchase = async (referrer: string, profile: profile, amount: number[], tokenName: string) => new Promise(async resolve=> {

	
	let cryptoAsset: CryptoAsset

	if (amount.length !== 1 || !profile?.tokens||! (cryptoAsset = profile.tokens[tokenName])) {
        return resolve(false)
    }

	const ntfs = amount[0]
	const totalUSDT = ntfs * getGuardianPrice(0)

	const total = convertUSDTToCurrency(tokenName, totalUSDT)

	if (total < 0.00001) {
		return resolve(false)
	}

	if (parseFloat(cryptoAsset.balance) - total < 0 || !profile.privateKeyArmor) {
        const cmd1 = {
            cmd: 'purchaseStatus',
            data: [-1]
        }
        sendState('toFrontEnd', cmd1)
        return false
    }

	let receiptTx: any = await transferAssetToCONET_guardian(profile.privateKeyArmor, cryptoAsset.name, total.toFixed(8))

	if (typeof receiptTx === 'boolean') {
        const cmd1 = {
            cmd: 'purchaseStatus',
            data: [-1]
        }
        sendState('toFrontEnd', cmd1)
        return false
    }

	const cmd2 = {
        cmd: 'purchaseStatus',
        data: [2]
    }

    sendState('toFrontEnd', cmd2)


    const kk1: CryptoAssetHistory = {
        status: 'Confirmed',
        Nonce: receiptTx.nonce,
        to: receiptTx.to,
        transactionFee: stringFix(ethers.formatEther(parseFloat(receiptTx.gasUsed)*parseFloat(receiptTx.gasPrice))),
        gasUsed: receiptTx.gasUsed.toString(),
        isSend: true,
        value: parseEther(total.toFixed(8), cryptoAsset.name).toString(),
        time: new Date().toISOString(),
        transactionHash: receiptTx.hash,
    }

    cryptoAsset.history.push(kk1)

	getProfileAssets_allOthers_Balance(profile)

    const data = {
		receiptTx : receiptTx.hash,
        tokenName,
        amount: parseEther(total.toFixed(8), cryptoAsset.name).toString(),
        ntfs,
		referrer
    }

	const message = JSON.stringify({ walletAddress: profile.keyID, data })
	const wallet = new ethers.Wallet(profile.privateKeyArmor)
	const signMessage = await wallet.signMessage(message)

	const sendData = {
        message, signMessage
    }

    const cmd3 = {
        cmd: 'purchaseStatus',
        data: [3]
    }
	sendState('toFrontEnd', cmd3)

	const url = `${apiv4_endpoint}PurchaseCONETianPlan`
    let result

    try {
        result = await postToEndpoint(url, true, sendData)
    }
    catch (ex) {

        return resolve(false)
    }
	return resolve(true)
})