
const maxScanNodesNumber = 20
let Guardian_Nodes:nodes_info[]  = []

let getAllNodesProcess = false

const getAllNodes = async () => {
	if (getAllNodesProcess) {
		return
	}
	getAllNodesProcess = true
	const GuardianNodes = new ethers.Contract(CONET_Guardian_PlanV7, guardian_erc1155, provideCONET)
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
	for (let i = 0; i < maxScanNodesNumber; i ++) {
		
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

const getRandomNodeV2 = () => { 
	const totalNodes = Guardian_Nodes.length - 1
	if (!totalNodes ) {
		return null
	}
	const nodoNumber = Math.floor(Math.random() * totalNodes)
	const node = Guardian_Nodes[nodoNumber]
	if (!node.ip_addr) {
		return getRandomNodeV2 ()
	}
	
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
	const connectNode = getRandomNodeV2()
	
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
		const entryNode = getRandomNodeV2()
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


const CONETianPlan_purchase = (referrer: string, profile: profile, payAssetName: string, amount: number[]) => new Promise(resolve=> {
	return resolve(true)
})