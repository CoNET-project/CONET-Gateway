const CoNET_SI_Network_Domain = 'openpgp.online'
const conet_DL_endpoint = `https://${ CoNET_SI_Network_Domain }/api/conet-faucet`
const conet_DL_getUSDCPrice_Endpoint = `https://${ CoNET_SI_Network_Domain }/api/conet-price`
const conet_DL_getSINodes = `https://${ CoNET_SI_Network_Domain }/api/conet-si-list`
const conet_DL_authorizeCoNETCashEndpoint = `https://${ CoNET_SI_Network_Domain }/api/authorizeCoNETCash`
const conet_DL_regiestProfile = `https://${ CoNET_SI_Network_Domain }/api/regiestProfileRoute`
const conet_DL_publishGPGKeyArmored = `https://${ CoNET_SI_Network_Domain }/api/publishGPGKeyArmored`
const gasFee = 30000
const wei = 1000000000000000000
const denominator = 1000000000000000000
const gasFeeEth = 0.000526
const GasToEth = 0.00000001
const USDC_exchange_Addr = '0xD493391c2a2AafEd135A9f6164C0Dcfa9C68F1ee'
const buyUSDCEndpoint = `https://${ CoNET_SI_Network_Domain }/api/exchange_conet_usdc`
const mintCoNETCashEndpoint = `https://${ CoNET_SI_Network_Domain }/api/mint_conetcash`
const openSourceEndpoint = 'https://s3.us-east-1.wasabisys.com/conet-mvp/router/'

const CoNETNet = [`https://rpc1.${CoNET_SI_Network_Domain}`]

const usdcNet = 'https://rpc1.openpgp.online/usdc'

const getRandomCoNETEndPoint = () => {
	return CoNETNet[0]			//Math.round(Math.random() * 3)]
}
const returnCommand = ( cmd: worker_command ) => {
    self.postMessage ( JSON.stringify ( cmd ))
}

const logger = (...argv: any ) => {
    const date = new Date ()
    const dateStrang = `%c [Seguro-worker INFO ${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}]`
	
    return console.log ( dateStrang, 'color: #dcde56',  ...argv)
}

const getRamdomEntryNode = (currentProfile: profile ) => {
	if (!currentProfile.network) {
		return null
	}
	const index = ( currentProfile.network.entrys.length === 1) ? 0: Math.round(Math.random() * currentProfile.network.entrys.length-1)
	return currentProfile.network.entrys[index]
}

const isAllNumbers = ( text: string ) => {
    return ! /\D/.test ( text )
}

const UuidV4Check = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/

const imapServers = [ 
    {
        server: 'imap.gmail.com',
        port: 993
    }, 
    {
        server: 'imap.mail.yahoo.com',
        port: 993
    }, 
    {
        server: 'imap.mail.me.com',
        port: 993
    },
    {
        server: 'outlook.office365.com',
        port: 993
    },
    {
        server: 'imap.zoho.com',
        port: 993
    },
    {
        server: 'api.stripe.com',
        port: 443
    }
]

const makePublicKeyOBJ = async ( publickeyArmor: string ) => {
	
		if  (!publickeyArmor) {
			const msg = `makePublicKeyOBJ have no publickeyArmor Error!`
			logger (msg)
			return
		}
		return (await openpgp.readKey ({ armoredKey: publickeyArmor }))
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

const loadWalletAddress = ( keypair: keyPair, password ) => {
	const account = new CoNETModule.Web3EthAccounts ()
	return account.wallet.decrypt ( keypair.privateKeyArmor, password )
}

const decryptWithContainerKey = ( encryptedMessage: string, CallBack: (err: Error|null, text?: string) => void) => {
    let ret = ''
    
    return openpgp.readMessage({armoredMessage: encryptedMessage})
    .then ((message: any) => {
        return openpgp.decrypt({
            message,
            verificationKeys: '',
            decryptionKeys: ''
        })
    })
    .then ((n: any) => {
        ret = n.data
        return n.verified
    })
    .then (() => {
        return CallBack (null, ret )
    })
    .catch (( ex: Error ) => {
        return CallBack ( ex )
    })
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

const encryptCoNET_Data_WithContainerKey = async () => {

	if (!CoNET_Data||!containerKeyObj||!containerKeyObj.keyObj) {
		const msg = `encryptCoNET_Data_WithContainerKey Error: CoNET_Data === null`
		return logger (msg)
	}
	CoNET_Data.encryptedString = ''
    const encryptObj = {
        message: await openpgp.createMessage({text: buffer.Buffer.from(JSON.stringify (CoNET_Data)).toString('base64')}),
        encryptionKeys: containerKeyObj.keyObj.publicKeyObj,
        signingKeys: containerKeyObj?.keyObj.privateKeyObj,
		config: { preferredCompressionAlgorithm: openpgp.enums.compression.zlib } 		// compress the data with zlib
    }
	CoNET_Data.encryptedString = await openpgp.encrypt(encryptObj)
	return
}

const decryptCoNET_Data_WithContainerKey = async () => {
	if (!CoNET_Data || !containerKeyObj || !containerKeyObj?.keyObj || !CoNET_Data?.encryptedString ) {
		throw new Error(`decryptCoNET_Data_WithContainerKey Error: have no containerKeyObj?.keyObj || CoNET_Data?.encryptedString`)
	}

	const de = await openpgp.decrypt ({
		message: await openpgp.readMessage({armoredMessage: CoNET_Data.encryptedString}),
		verificationKeys: containerKeyObj.keyObj.publicKeyObj,
		decryptionKeys: containerKeyObj.keyObj.privateKeyObj
	})
	const { verified, keyID } = de.signatures[0]
	await verified
	CoNET_Data = JSON.parse(buffer.Buffer.from( de.data,'base64').toString())
	if (!CoNET_Data) {
		throw new Error ('decryptCoNET_Data_WithContainerKey got empty CoNET_Data!')
	}
	
	CoNET_Data.encryptedString = ''
	if (!CoNET_Data.clientPool) {
		CoNET_Data.clientPool = []
	}
	preferences = CoNET_Data.preferences
}

const localServerErrorBridge = ( status: number, CallBack : ( err: netWorkError|seguroError|null, payload?: any ) => void ) => {
    switch (status) {
        case 404: {
            return CallBack ('LOCAL_SERVER_ERROR')
        }
        case 405: {
            return CallBack ('NOT_STRIPE')
        }
        case 402: {
            return CallBack ('INVITATION_CODE_ERROR')
        }
        case 406: {
            return CallBack ('SEGURO_DATA_FORMAT_ERROR')
        }
        case 452: {
            return CallBack ('WAITING_SEGURO_RESPONSE_TIMEOUT')
        }
        default: {
            CallBack ('UNKNOW_ERROR')
        }
    }
}

const timeoutSetup = 30000

const localServerGetJSON = (command: string, method: string, postJSON: string, CallBack: (err: netWorkError|seguroError|null, payload?: any) => void ) => {
    const xhr = new XMLHttpRequest()
    const url = self.name + command
    xhr.open( method, url, true )
    xhr.withCredentials = false

    const timeout = setTimeout (()=> {
        return CallBack('LOCAL_SERVER_ERROR')
    }, timeoutSetup )

    xhr.setRequestHeader ("Content-Type", "application/json;charset=UTF-8")
    xhr.onload = () => {
        clearTimeout(timeout)
        const status = xhr.status
        if ( status === 200) {
            if ( !xhr.response ) {
                return CallBack( null, '')
            }
            let ret = ''
            try {
                ret = JSON.parse (xhr.response)
            } catch (ex) {
                logger (`localServerGetJSON JSON.parse (xhr.response) ERROR`)
                return CallBack ('LOCAL_RESPONE_NO_JSON_DATA')
            }
            return CallBack(null, ret)
        }
        logger (`localServerGetJSON [${ command }] response status[${ status }] !== 200 ERROR`)
        return localServerErrorBridge ( status, CallBack )
    }

    return xhr.send(postJSON)
}

const testNetwork = (CallBack: (err?: netWorkError|null, data?: testImapResult[]) => void) => {
    let ret: netWorkError
    return localServerGetJSON ( 'testImapServer', 'GET', '', (err, data: testImapResult[]) => {
        if (err) {
            ret = 'LOCAL_SERVER_ERROR'
            return CallBack (ret)
        }
        const errServer = data.filter ( n => n.error !== null )
        // if ( !errServer.length ) {
        //     return CallBack ( null, data )
        // }
        if ( errServer.length > 4 ) {
            ret = 'NOT_INTERNET'
            return CallBack ( ret )
        }
        // const ret: netWorkError[] = []
        const stripe = errServer.filter ( n => n.n.server === 'api.stripe.com')
        if ( stripe.length ) {
            ret = 'NOT_STRIPE'
            return CallBack (ret)
        }
        // const office365 = errServer.filter ( n => n.n.server === 'outlook.office365.com')
        // if ( office365.length ) {
        //     ret.push ('NOT_OFFICE365')
        // }
        // const me = errServer.filter ( n => n.n.server === 'imap.mail.me.com')
        // if (me.length) {
        //     ret.push ('NOT_ME_COM')
        // }
        // const zoho = errServer.filter ( n => n.n.server === 'imap.zoho.com')
        // if ( zoho.length ) {
        //     ret.push ('NOT_ZOHO')
        // }
        // const yahoo = errServer.filter ( n => n.n.server === 'imap.mail.yahoo.com')
        // if ( yahoo.length ) {
        //     ret.push ('NOT_YAHOO')
        // }
        // const gmail = errServer.filter ( n => n.n.server === 'imap.gmail.com')
        // if ( gmail.length ) {
        //     ret.push ('NOT_GMAIL')
        // }
        return CallBack ( null, data )
    })
}

const getNewNotice = ( connect: webEndpointConnect, CallBack ) => {
    connect.nextNoticeBlock = connect.nextNoticeBlock || connect.client_listening_folder
    const url = `${ connect.endPoints[0] }/${ connect.client_listening_folder }/${ connect.nextNoticeBlock }`
    return localServerGetJSON('newNotice', 'GET', '', CallBack)
}

const initUSDCTokenPreferences = () => {
	const ret: TokenPreferences = {
		networkName: 'CoNET USDC',
		RpcURL:'https://mvpusdc.conettech.ca/mvpusdc',
		blockExplorerURL: '',
		chainID: 222222,
		currencySymbol: 'USDC',
	}
	return ret
}

const initCoNETTokenPreferences = () => {
	const ret: TokenPreferences = {
		networkName: 'CoNET mvp',
		RpcURL:'https://conettech.ca/mvp',
		blockExplorerURL: '',
		chainID: 22222,
		currencySymbol: 'CONET',
	}
	return ret
}

const getCoNETTestnetBalance = async ( walletAddr: string ) => {
	const web3 = CoNETModule
}

const unZIP = (compress: string) => {

    const zipObj = new JSZip()
    zipObj.loadAsync(compress)
    .then (content=> {
        return content.async ()
    })
    
}

const initProfileTokens = () => {
	return {
		conet: {
			balance: 0,
			history: []
		},
		usdc: {
			balance: 0,
			history: []
		}
	}
}

const initCoNET_Data = ( passcode = '' ) => {
	CoNET_Data = {
		isReady: true,
		CoNETCash: {
			Total: 0,
			assets: []
		},
		clientPool: []
	}
    const acc = createKey (1)

	const profile: profile = {
		tokens: initProfileTokens(),
		publicKeyArmor: CoNETModule.EthCrypto.publicKeyByPrivateKey (acc[0].privateKey),
		keyID: acc[0].address.substring(0,2) + acc[0].address.substring(2).toUpperCase(),
		isPrimary: true,
		privateKeyArmor: acc[0].privateKey
	}
	
	return  CoNET_Data.profiles = [profile]
}

const makeContainerPGPObj = async () => {
	if (!containerKeyObj?.privateKeyArmor || !containerKeyObj?.publicKeyArmor ) {
		throw new Error (`makeContainerPGPObj Error: have no KeyArmor!`)
	}
	if ( !passObj?.passcode ) {
		throw new Error (`makeContainerPGPObj Error: have no passObj?.passcode!`)
	}
	return containerKeyObj.keyObj = {
		publicKeyObj: await makePublicKeyOBJ (containerKeyObj.publicKeyArmor),
		privateKeyObj: await makePrivateKeyObj (containerKeyObj.privateKeyArmor, passObj.passcode)
	}

}

const getUSDCBalance = async (Addr: string) => {
	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(usdcNet))
	const uuu = await eth.getBalance(Addr)
	const balance = parseInt(uuu)/denominator
	return balance
}


const getCONETBalance = async (Addr: string) => {
	const CoNETEndpoint = getRandomCoNETEndPoint()
	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(getRandomCoNETEndPoint()))
	const uuu = await eth.getBalance(Addr)
	const balance = parseInt(uuu)/denominator
	return balance
}

const getAllProfileUSDCBalance = () => {
	const profiles = CoNET_Data?.profiles
	if ( !profiles || !profiles.length ) {
		return logger (`getAllProfileCoNETBalance error: have no CoNET_Data?.profiles!`)
	}
	const ret: any [] = []
	profiles.forEach (async n => {
		if ( n.keyID ) {
			const newBalance = await getUSDCBalance (n.keyID)
			if ( n.tokens.usdc.balance !== newBalance ) {
				n.tokens.usdc.balance = newBalance
				ret.push ({
					keyID: n.keyID,
					tokens: {
						usdc: {
							balance : n.tokens.usdc.balance
						}
					}
				})
				logger (`getAllProfileUSDCBalance USDC Balance changed!`)
				logger (ret)
			}
		}
		
	})
	if ( ret.length ) {
		const cmd: worker_command = {
			cmd: 'READY',
			data: [ret]
		}
		returnCommand (cmd)
	}
}

const getAllProfileBalance = () => {
	const profiles = CoNET_Data?.profiles
	if ( !profiles || !profiles.length ) {
		return logger (`getAllProfileCoNETBalance error: have no CoNET_Data?.profiles!`)
	}
	return new Promise (async (resolve) => {
		for ( let n of profiles ) {
			if ( n.keyID ) {
				n.tokens.conet.balance = await getCONETBalance (n.keyID)
				n.tokens.usdc.balance = await getUSDCBalance (n.keyID)
			}
		}

		return resolve (null)
		
	})
	
}


const XMLHttpRequestTimeout = 30 * 1000

const postToEndpoint = ( url: string, post: boolean, jsonData ) => {
	return new Promise ((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.onload = () => {
			clearTimeout (timeCount)
			//const status = parseInt(xhr.responseText.split (' ')[1])

			if (xhr.status === 200) {
				// parse JSON
				if ( !xhr.responseText.length ) {
					return resolve ('')
				}
				const splitTextArray = xhr.responseText.split (/\r\n\r\n/)
				const jsonText = splitTextArray[splitTextArray.length-1]
				let ret
				try {
					ret = JSON.parse(jsonText)
				} catch (ex) {
					if ( post ) {
						return resolve (null)
					}
					return resolve(xhr.responseText)
				}
				return resolve (ret)
			}

			return reject(new Error (`status is not 200 ${ xhr.responseText }`))
		}

		xhr.open( post? 'POST': 'GET', url, true )
		xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')

		xhr.send(jsonData? JSON.stringify(jsonData): '')

		const timeCount = setTimeout (() => {
			const Err = `postToEndpoint Timeout!`
			logger (`postToEndpoint Error`, Err )
			reject (new Error ( Err ))
		}, XMLHttpRequestTimeout )
	})
	
}

const getProfileFromKeyID = (keyID: string) => {
	if ( ! CoNET_Data?.profiles) {
		return null
	}
	const profileIndex = CoNET_Data.profiles.findIndex (n => n.keyID === keyID)
	if ( profileIndex < 0 ) {
		return null
	}
	return CoNET_Data.profiles[profileIndex]
}

const getFaucet = async ( cmd: worker_command ) => {
	const keyID = cmd.data[0]
	let profile: null| profile

	if (!keyID || !(profile = getProfileFromKeyID (keyID))) {
		cmd.err = 'INVALID_DATA'
		return returnCommand (cmd)
	}

	delete cmd.err
	let result
	try {
		result = await postToEndpoint(conet_DL_endpoint, true, { walletAddr: keyID })
	} catch (ex) {
		logger (`postToEndpoint [${conet_DL_endpoint}] error!`)
		cmd.err = 'FAILURE'
		returnCommand (cmd)
		return logger (`postToEndpoint ${conet_DL_endpoint} ERROR!`)
	}
	
	if (!result?.txHash ) {
		
		cmd.err = 'FAILURE'
		returnCommand (cmd)
		logger (`postToEndpoint ${conet_DL_endpoint} ERROR!`)
	}

	logger (`postToEndpoint [${ conet_DL_endpoint }] SUCCESS`)
	
	logger (`result = ${result}` )

	if ( result.txHash) {
		const receipt = await getTxhashInfo (result.txHash, getRandomCoNETEndPoint())
		receipt.isSend = false
		receipt.time = new Date().toISOString()
		profile.tokens.conet.history.push (receipt)
	}
	
	return storeProfile (cmd)
}


const syncAsset = async (cmd: worker_command) => {
	await getAllProfileBalance ()
	cmd.data = [CoNET_Data]
	return returnCommand (cmd)
}


const sendCoNETCash = (cmd: worker_command) => {

}


const sendAsset = async (cmd: worker_command) => {
	const [fromAddr, total, toAddr, asset] = cmd.data[0]
	if ( !fromAddr || !total || !toAddr || !CoNET_Data?.profiles ) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}

	const index = CoNET_Data.profiles.findIndex (val => {
		return val.keyID === fromAddr
	})

	if (index < 0 ) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}

	const profile = CoNET_Data.profiles[index]

	let network = ''
	let history: any = null
	let balance = 0.0
	if (asset === 'CoNETCash' ) {
		return sendCoNETCash (cmd)
	}
	if (asset === 'CoNET') {
		network = getRandomCoNETEndPoint()
		history = profile.tokens.conet.history
		balance = profile.tokens.conet.balance

	} else {
		network = usdcNet
		history = profile.tokens.usdc.history
		balance = profile.tokens.usdc.balance
	}

	const usdcValFix = (total + gasFeeEth - balance > 0) ? balance - gasFeeEth : total
	const obj = {
		gas: gasFee,
		to: toAddr,
		value: (usdcValFix * wei).toString()
	}

	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(network))
	const createTransaction = await eth.accounts.signTransaction( obj, profile.privateKeyArmor )
	let receipt
	try {
		receipt = await eth.sendSignedTransaction (createTransaction.rawTransaction )
	} catch (ex) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	receipt.value = usdcValFix
	receipt.isSend = true
	receipt.time = new Date().toISOString()
	history.unshift (receipt)

	return storeProfile (cmd)
}

const getUSDCPrice = async (cmd: worker_command) => {
	logger (`getUSDCPrice START`)
	let result
	try {
		result = await postToEndpoint(conet_DL_getUSDCPrice_Endpoint, false,'')

	} catch (ex) {
		logger (`postToEndpoint [${conet_DL_getUSDCPrice_Endpoint}] error`)
		cmd.err = 'FAILURE'
		returnCommand (cmd)
		return logger (ex)
	}
	cmd.data = [result]
	return returnCommand (cmd)
}

const buyUSDC = async (cmd: worker_command) => {
	logger (`buyUSDC START`)
	const [conetVal, keyID] = cmd.data[0]

	if ( !CoNET_Data?.profiles|| !keyID || conetVal <= 0) {
		cmd.err = 'NOT_READY'
		return returnCommand (cmd)
	}
	
	const profile = getProfileFromKeyID(keyID)

	if ( !profile ) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	const balance = profile.tokens.conet.balance
	const history = profile.tokens.conet.history

	if ( conetVal - balance - gasFee> 0) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	const obj = {
		gas: gasFee,
		to: USDC_exchange_Addr,
		value: (conetVal * wei).toString()
	}
	logger (obj)
	const CoNETEndpoint = getRandomCoNETEndPoint()
	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(CoNETEndpoint))
	let createTransaction
	try {
		createTransaction = await eth.accounts.signTransaction( obj, profile.privateKeyArmor )
	} catch (ex) {
		logger (`${CoNETEndpoint} is not available`)
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	
	const receipt = await eth.sendSignedTransaction (createTransaction.rawTransaction )
	receipt.isSend = true
	receipt.time = new Date().toISOString()
	receipt.value = conetVal
	logger(`buyUSDC Send CoNET`, receipt)
	history.unshift (receipt)
	let result
	try {
		result = await postToEndpoint(buyUSDCEndpoint, true, { txHash: receipt.transactionHash })
	} catch (ex) {
		logger (`postToEndpoint [${buyUSDCEndpoint}] Error`)
		cmd.err = 'FAILURE'
		returnCommand (cmd)
		return logger (ex)
	}

	logger (`postToEndpoint [${ buyUSDCEndpoint }] SUCCESS`)
	logger (`result = `, result )
	const receipt1 = await getTxhashInfo (result.transactionHash, usdcNet)
	receipt1.isSend = false
	receipt1.time = new Date().toISOString()
	
	logger(`buyUSDC get receipt1`, receipt1) 
	profile.tokens.usdc.history.unshift (receipt1)
	return storeProfile (cmd)
	
}

const getTxhashInfo = async (txhash: string, network: string) => {
	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(network))
	let receipt
	try {
		receipt = await eth.getTransaction(txhash)
	} catch (ex) {
		logger (`getTxhashInfo Error from [${ network }]`, ex )
		return null
	}
	receipt.value = receipt.value/wei
	return receipt
}

const mintCoNETCash = async (cmd: worker_command) => {
	logger (`mintCoNETCash START`)
	const [usdcVal, keyID] = cmd.data[0]
	if ( !CoNET_Data?.profiles || usdcVal <= 0 || !keyID) {
		cmd.err = 'NOT_READY'
		return returnCommand (cmd)
	}
	const profileIndex = CoNET_Data.profiles.findIndex (n => n.keyID === keyID)
	if ( profileIndex < 0 ) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	const profile = CoNET_Data.profiles[profileIndex]
	const usdcBalance = profile.tokens.usdc.balance

	const usdcValFix = (usdcVal + gasFeeEth - usdcBalance > 0) ? usdcBalance - gasFeeEth : usdcVal
	
	const obj = {
		gas: gasFee,
		to: USDC_exchange_Addr,
		value: (usdcValFix * wei).toString()
	}

	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(usdcNet))
	const time = new Date()
	let createTransaction
	try {
		createTransaction = await eth.accounts.signTransaction( obj, profile.privateKeyArmor )
	} catch (ex) {
		logger (`${usdcNet} is not available`)
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	const receipt = await eth.sendSignedTransaction (createTransaction.rawTransaction )

	receipt.value = usdcValFix
	receipt.isSend = true
	receipt.time = time.toISOString()
	profile.tokens.usdc.history.unshift(receipt)

	let key: walletKey
	if ( !CoNET_Data.CoNETCash ) {
		CoNET_Data.CoNETCash = {
			Total: 0,
			assets: []
		}
	}
	key = createKey (1)[0]
	const txObj = { tx:receipt.transactionHash, to: key.address }
	const message = CoNETModule.EthCrypto.hash.keccak256(txObj)
	const _sign = CoNETModule.EthCrypto.sign( profile.privateKeyArmor, message )

	let result
	try {
		result = await postToEndpoint(mintCoNETCashEndpoint, true, { txObj, txHash: message, sign: _sign })
	} catch (ex) {
		logger (`postToEndpoint [${mintCoNETCashEndpoint}] error`)
		cmd.err = 'FAILURE'
		returnCommand (cmd)
		return logger (ex)
	}

	logger (`postToEndpoint [${ mintCoNETCashEndpoint }] SUCCESS`)
	logger (`result = `, result )
	const time1 = new Date()
	const amount = usdcValFix - usdcValFix * 0.0001
	CoNET_Data.CoNETCash.Total += amount
	CoNET_Data.CoNETCash.assets.unshift ({
		key: key,
		id: result.id,
		history: [{
			status: 'Confirmed',
			value: amount,
			cumulativeGasUsed: 0.0001 * usdcValFix,
			time: time1.toISOString(),
			transactionHash: result.transactionHash,
			isSend: false
		}]
	})
	return storeProfile (cmd)
}

const openpgp_online_CA_Store = `
-----BEGIN CERTIFICATE-----
MIIGGzCCBAOgAwIBAgIUIXc4dG7ZA3/tTTqS9We1OSmT1PswDQYJKoZIhvcNAQEL
BQAwgZwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJMQTESMBAGA1UEBwwJVmFuY291
dmVyMRcwFQYDVQQKDA5PcGVuUEdQLk9ubGluZTEWMBQGA1UECwwNQ29ORVQgUHJw
amVjdDEXMBUGA1UEAwwOT3BlblBHUC5PbmxpbmUxIjAgBgkqhkiG9w0BCQEWE2lu
Zm9AT3BlblBHUC5PbmxpbmUwHhcNMjIxMTE4MjEwMDI1WhcNMzIwODE3MjEwMDI1
WjCBnDELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkxBMRIwEAYDVQQHDAlWYW5jb3V2
ZXIxFzAVBgNVBAoMDk9wZW5QR1AuT25saW5lMRYwFAYDVQQLDA1Db05FVCBQcnBq
ZWN0MRcwFQYDVQQDDA5PcGVuUEdQLk9ubGluZTEiMCAGCSqGSIb3DQEJARYTaW5m
b0BPcGVuUEdQLk9ubGluZTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIB
AOKXfU16GB1VOoEbUU60G0RpsScrM90lmzviioKXkpfnzOZK+fJO7dPjrNceC01A
CzmD/de5DzwqHKg5mAZ1oYjMThWAHKGyc8LjPTpH46OXvMd0VUjNRMCr9MwOv0wC
AjgBuIJZdEuIx3TiBf4LVXol2KVS4OaGBMn2peyhKt5rmmBYvENsLVGDYwx9D6g3
DIXpjuS5mffi1bjtoloQoeSPeSPmypedgVad24yH8Ps9HuHciAaCQmTPz0e/3IZm
SQCYk+TY+alKZgmo6wqEykcxDWFcydb+wM7CxadQJjulde4/AmjMQK2gz4xMSsNp
bTvkyNzlLvzULIX4UcZrHBl4XAL34t5nGzs+KZpG8uBi7H9bM79LpzVt0oLzBpEY
pQ1OUoQxVX1FU/2tRzp3axGchTetDo+gt8J9PU5Q/23jd/Rfa9HE3Y369KApvq7X
dLCNqRT4aslbagXJAOJQuPofrUJEAi79XqhtWeYN0aJKvpOu0pxh/w40FkKA9t4J
tIqimSJOKQwcGtT6FbcMployljiToltUMSIUnX3wp1fuiF7wBf1OWFF11cJvtSd3
8TDfXZbLXpbtmgEzj651YJj63Glks1w1z9M4YMad7Z3nMiH9LSj0Y4ZUplApuYzP
FOCnMneJYs3efZjbnnZPmEI+nW+sp0QaJ98cjwTjTAyhAgMBAAGjUzBRMB0GA1Ud
DgQWBBQOKqadTO08OVuzMwGu1Ca7wKInpDAfBgNVHSMEGDAWgBQOKqadTO08OVuz
MwGu1Ca7wKInpDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4ICAQCr
aobcavi2SwUapJmPusxECG/x1mI4m4vQ1T2toNQMLQgrnVWNsu5eXPOq3QgQhZ+Z
f2v5sgvQiOH7lIYFltZ3Tk/ftxqeQziZtocPisOWxSD3km2pePjid/1k/Dip9guh
NkgIltofoIgUFEEf4o9plIA7HPvx2B77g3yKb0xIQNy01y0NMIGSpoXEaVjFVkLA
Ek/JjffKY0/By1pscM4zH//Cn1L7E3eJRdAiyuMaqw7pkTjvcuo45CBuDZEAvv4h
BPa5QyyfJ0RbKK2KPko8IdOmDMH0NIbW75wnjLCQgp5oPHbP9ML7RDkppT7Ko6X+
AJd34PaSzCCNbOrR/NpmwTg7ZqjTmHcb6j60aUJNpCTa6b6K31lW0TeY3KqaKCdR
aMyfUOVV84E+QquM4d7XM+B2z01geDl15T1qU7Xfenh9y5HsapW7bjfVnnOKTyFQ
cbPp7Mjvr3IepTcbN+1rZ/4OXHqGwlADF+JkoevW+Xz/mfGWr/16bxuq+YvrqqRh
nzSfK+brjX2tWlLPK3HAObH3q3UuGHlrgW9MhWghJtz6hUPX+N92+PKUXG5cDpFX
hYhqKsVseeOzRQLY9MaAIFhxxhsVUvXQbokyxB2iTW2nmMRgUz+IV76wDIzX9tnk
Hwudb9AqSDUqQ0H1xpvjsoyxujQCquSx289B4kjvfA==
-----END CERTIFICATE-----
`

const checkAllRowsCurrentSetups = (rows: nodes_info[], setups: nodes_info[]) => {
	if ( setups.length > 0 ) {
		const currents: nodes_info[] = JSON.parse(JSON.stringify(setups))
		currents.forEach ((n, _inedx ) => {
			const index = rows.findIndex (nn => nn.pgp_publickey_id === n.pgp_publickey_id )
			if (!index) {
				return
			}
			rows.splice (index, 1)
			rows.unshift (n)
			currents.splice (_inedx, 1)
		})
		currents.forEach ((n, _inedx ) => {
			rows.unshift (n)
		})
	}
}



const checkAllRowsCurrentRecipients = (rows: nodes_info[]) => {
	if (!CoNET_Data?.profiles?.length) {
		return
	}
	const currentProfile = CoNET_Data.profiles.filter ( n => n.isPrimary )[0]

	if ( currentProfile?.network?.recipients ) {
		checkAllRowsCurrentSetups (rows, currentProfile.network.recipients )
	}
	if ( currentProfile?.network?.entrys ) {
		checkAllRowsCurrentSetups (rows, currentProfile.network.entrys )
	}
	
}

const getHtmlHeadersV2 = (rawHeaders: string|undefined, remoteSite: string ) => {

	if (!rawHeaders?.length) {
		return {}
	}

	let prerawHeadersByLine = rawHeaders.split('\r\n')
	if (/^http\//i.test(prerawHeadersByLine[0])) {
		prerawHeadersByLine[0] = prerawHeadersByLine[0].split ('\n')[1]
	}
	
	const headerResult: { [key: string]: string|boolean } = {}
	while (prerawHeadersByLine.length) {
		const line = prerawHeadersByLine.shift ()
		if (!line?.length) {
			continue
		}
		const lineSplit = line.split (': ')
		if ( lineSplit.length < 2) {
			logger (`getHtmlHeadersV2 ERROR, unformated line: `, line)
			continue
		}

		headerResult[lineSplit[0].toLowerCase()] = lineSplit[1]
	}
	delete headerResult[`x-frame-options`]
	//headerResult[`x-frame-options`] =`ALLOW FROM ${location.origin} ${remoteSite}`
	delete headerResult[`content-security-policy`]
	delete headerResult[`sec-fetch-site`]
	delete headerResult[`cross-origin-opener-policy`]
	delete headerResult[`cross-origin-resource-policy`]
	delete headerResult[`cross-origin-opener-policy-report-only`]
	headerResult[`access-control-allow-origin`] = `'*'`
	headerResult[`access-control-allow-credentials`] = `true`
	return headerResult
}
const getHtmlHeaders = (rawHtml: string = '', remoteSite: string) => {
	const headers = [
		'content-type',
		'cache-control',
		'pragma',
		'accept-ch',
//		'permissions-policy',
		'report-to',
//		'cross-origin-opener-policy-report-only',
//		'x-frame-options',
		'p3p',
		'alt-svc',
		'accept-ranges',
		'vary',
		'server',
		'x-content-type-options',
		'expires',
		'date',
		'strict-transport-security',
		'x-xss-protection',
		'alt-svc'
	]
	if (!rawHtml.length) {
		return {}
	}
	const headerResult: { [key: string]: string|boolean } = {}
	for (let i in headers ) {
		const u = getHeader(rawHtml, headers[i])
		if (u) {
			headerResult[headers[i]] = u
		}
	}
	headerResult['X-Frame-Options'] = `ALLOW FROM ${location.origin} ${remoteSite}`
	headerResult['Content-Security-Policy'] = `frame-ancestors 'self' ${location.origin} ${remoteSite}`
	headerResult['Access-Control-Allow-Origin'] = `*`
	headerResult['Access-Control-Allow-Credentials'] = true
	return headerResult
}

const _getNftArmoredPublicKey = (gatewayNode): Promise<string> => {
	return new Promise( async resolve => {
		const nft_tokenid = gatewayNode.nft_tokenid
		const endPoint = `${openSourceEndpoint}${nft_tokenid}`
		let getRouter
		try {
			getRouter = await postToEndpoint(endPoint, false, null)
		} catch (ex) {
			return resolve('')
		}
		return resolve(getRouter.armoredPublicKey)
	})

	
}

const _getSINodes = async (sortby: SINodesSortby, region: SINodesRegion) => {
	const data = {
		sortby,
		region
	}
	let result

	try {
		result = await postToEndpoint(conet_DL_getSINodes, true, data)
	} catch (ex) {
		logger (`postToEndpoint [${conet_DL_getSINodes}] Error`, ex)
		return null
	}
	const rows: nodes_info[] = result

	if (rows.length) {
		async.series(rows.filter(n => n.country === 'US').map(n=> ( next => _getNftArmoredPublicKey(n).then(nn => {n.armoredPublicKey = nn; next()}))))

		rows.forEach ( async n => {
			n.disable = n.entryChecked = n.recipientChecked = false
			n.customs_review_total = parseFloat(n.customs_review_total.toString())
			// n.armoredPublicKey = await _getNftArmoredPublicKey (n)
		})

		checkAllRowsCurrentRecipients (rows)
		
	} else {
		logger (`################ _getSINodes get null nodes Error! `)
	}
	return rows
}

const getSINodes = async (sortby: SINodesSortby, region: SINodesRegion, cmd) => {

	const result = await _getSINodes(sortby, region)
	if (!result) {
		logger (`postToEndpoint [${conet_DL_getSINodes}] Error`)
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	cmd.data = [result]
	return returnCommand (cmd)
}

const generateAesKey = async (length = 256) => {
	const key = await crypto.subtle.generateKey({
	  name: 'AES-CBC',
	  length
	}, true, ['encrypt', 'decrypt'])
  
	return key
}



const authorizeCoNETCash = ( amount: number, recipientsWalletAddress: string, logs ) => {
	return new Promise (async resolve => {

		if ( !CoNET_Data?.CoNETCash?.assets.length ) {
			return resolve (null)
		}

		const CoNETCashAsset = CoNET_Data.CoNETCash.assets[0]

		const CoNETCash_authorizedObj: CoNETCash_authorized = {
			type: 'USDC',
			to: recipientsWalletAddress,
			amount,
			id: CoNETCashAsset.id,
			from: CoNETCashAsset.key.address
		}
	
		const authorizedObjHash = CoNETModule.EthCrypto.hash.keccak256(CoNETCash_authorizedObj)
	
		const sign = CoNETModule.EthCrypto.sign(CoNETCashAsset.key.privateKey, authorizedObjHash)

		let result
		try {
			result = await postToEndpoint (conet_DL_authorizeCoNETCashEndpoint, true, {CoNETCash_authorizedObj, authorizedObjHash, sign} )
		} catch (ex) {
			return resolve (null)
		}
		const time1 = new Date()
		CoNETCashAsset.history.unshift ({
			status: 'Confirmed',
			value: amount,
			cumulativeGasUsed: 0.0001 * amount,
			time: time1.toISOString(),
			transactionHash: result,
			isSend: true,
			to: recipientsWalletAddress,
			type: 'authorized',
			logs: logs
		})

		return resolve(result)

	})
	
}

const postToEndpointSSE = ( url: string, post: boolean, jsonData, CallBack ) => {

		const xhr = new XMLHttpRequest()
		let last_response_len = 0

		xhr.onprogress = () => {
			clearTimeout (timeCount)
			

			if (!last_response_len) {
				if (xhr.status === 200) {
					const splitTextArray = xhr.responseText.split(/data: /)[1].split(/\r\n/)[0]
					last_response_len = xhr.response.length
					
					return CallBack (null, splitTextArray)
				}
				return CallBack(new Error (`status != 200`))
			}
			
			const responseText: string = xhr.response.substr(last_response_len)
			last_response_len = xhr.response.length
			logger (responseText)
			const line = responseText.split ('data: ')[1]
			
			if (!line ) {
				return
			}
			CallBack (null, line)
		}

		xhr.open( post? 'POST': 'GET', url, true )
		xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
		xhr.send(jsonData? JSON.stringify(jsonData): '')

		logger (url)

		const timeCount = setTimeout (() => {
			const Err = `postToEndpoint Timeout!`
			logger (`postToEndpoint Error`, Err )
			CallBack (new Error ( Err ))
		}, XMLHttpRequestTimeout )
	
	
}

const decrypteMessage = (encryptedMessage: string, privatePgpObj: any) => {
	return new Promise ( async resolve => {
		let de
		try {
			de = await openpgp.decrypt ({
				message: await openpgp.readMessage({armoredMessage: encryptedMessage}),
				decryptionKeys: privatePgpObj
			})
		} catch (ex) {
			return resolve (null)
		}
		
		return resolve(de)
	})
	
}


const longConnectToNode = async (_cmd: SICommandObj_Command, currentProfile: profile, entryNode: nodes_info, node: nodes_info, requestData: any[], cmd: worker_command ) => {
	return new Promise ( async resolve => {
		if (!currentProfile?.pgpKey?.publicKeyArmor || !node.armoredPublicKey ) {
			return resolve (null)
		}
		const key = await crypto.subtle.generateKey({
			name: 'AES-CBC',
			length: 256
		}, true, ['encrypt', 'decrypt'])

		const iv = crypto.getRandomValues(new Uint8Array(16))
		const command: SICommandObj = {
			command: _cmd,
			publicKeyArmored: currentProfile.pgpKey.publicKeyArmor,
			algorithm: 'aes-256-cbc',
			iv: buffer.Buffer.from(iv).toString('base64'),
			Securitykey: JSON.stringify(await crypto.subtle.exportKey('jwk', key)),
			requestData
		}

		let privateKeyObj = null

		try {
			privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey.privateKeyArmor)
		} catch (ex){
			logger (ex)
		}
	
		const encryptedCommand = await encrypt_Message( privateKeyObj, node.armoredPublicKey, command)
		
		const url = `https://${ entryNode.pgp_publickey_id }.${CoNET_SI_Network_Domain}/post`

		logger (`connect to ${url}`)

		return postToEndpointSSE(url, true, {data: encryptedCommand}, async (err, data ) => {

			if (err) {
				return resolve (null)
			}
			if (!data) {
				return resolve (null)
			}
			if (/-----BEGIN PGP MESSAGE-----/.test(data)) {
				const clearText:any = await decrypteMessage (data, privateKeyObj)
				if ( !clearText.data ||!clearText.signatures||!CoNET_Data) {
					return
				}
				
				try {
					clearText.obj =  JSON.parse (buffer.Buffer.from(clearText.data,'base64').toString())
				} catch (ex) {
					return
				}
				const key = clearText.signatures[0].keyID.toHex()
				clearText.signatures[0].keyIDHex = key
				let index = -1

				if (!CoNET_Data.clientPool?.length) {
					CoNET_Data.clientPool = []
				}

				if ((index = CoNET_Data.clientPool.findIndex (n => n.walletAddr.toUpperCase() === key.toUpperCase())) < 0) {
					
					let result
					try {
						result = await postToEndpoint (`${openSourceEndpoint}${key.toUpperCase()}`, false, null )
					} catch (ex) {
						return logger (`longConnectToNode have not find ${key} ERROR`)
					}
					CoNET_Data.clientPool.push (result)
					logger (result)
					clearText.profile = result
				} else {
					clearText.profile = CoNET_Data.clientPool[index]
				}
				
				delete cmd.err
				cmd.data[0]= clearText
				return returnCommand(cmd)
			}
			let res
			try {
				const ciphertext = buffer.Buffer.from (data, 'base64')
				res = await crypto.subtle.decrypt({ name: "AES-CBC",iv}, key, ciphertext)
				
			} catch (ex){
				return resolve (null)
			}

			
			
			const dec = new TextDecoder()
			const _ret = dec.decode(res)
			
			
			let ret: SICommandObj

			try {
				ret = JSON.parse (_ret)
			} catch (ex) {
				return resolve (null)
			}

			return resolve (ret)
		})
		
	})
}

const sendForwardToNode = (currentProfile: profile, client: clientProfile, messageObj: any ) => {
	return new Promise ( async resolve => {
		
		if (!currentProfile?.pgpKey?.publicKeyArmor ) {
			return resolve (null)
		}
		let privateKeyObj = null

		try {
			privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey.privateKeyArmor)
		} catch (ex){
			logger (ex)
		}
		const entryNode = getRamdomEntryNode (currentProfile)
	
		if (!entryNode) {
			return resolve (null)
		}

		const encryptedData = await encrypt_Message( privateKeyObj, client.armoredPublicKey, messageObj)
		const encryptedForwardMessage =  await encrypt_Message( privateKeyObj, client.routerArmoredPublicKey, encryptedData)

		const url = `https://${ entryNode.pgp_publickey_id }.${CoNET_SI_Network_Domain}/post`
		let result

		logger (`connect to ${url}`)
		try {
			result = await postToEndpoint(url, true, {data: encryptedForwardMessage})
		} catch (ex) {
			return resolve (null)
		}

		return resolve(true)

	})
	

}

const sendRequestToNode: (_cmd: SICommandObj_Command, currentProfile: profile, entryNode: nodes_info, node: nodes_info, requestData: any[]) => 
	Promise<null|SICommandObj> = async (_cmd: SICommandObj_Command, currentProfile: profile, entryNode: nodes_info, node: nodes_info, requestData: any[] ) => {

	return new Promise ( async resolve => {

		if (!currentProfile?.pgpKey?.publicKeyArmor || !node.armoredPublicKey ) {
			return resolve (null)
		}

		let key = await crypto.subtle.generateKey({
			name: 'AES-CBC',
			length: 256
		}, true, ['encrypt'])

		let iv = crypto.getRandomValues(new Uint8Array(16))

		const command: SICommandObj = {
			command: _cmd,
			publicKeyArmored: currentProfile.pgpKey.publicKeyArmor,
			algorithm: 'aes-256-cbc',
			iv: buffer.Buffer.from(iv).toString('base64'),
			Securitykey: JSON.stringify(await crypto.subtle.exportKey('jwk', key)),
			requestData
		}

		let privateKeyObj = null

		try {
			privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey.privateKeyArmor)
		} catch (ex){
			logger (ex)
		}
	
		const encryptedCommand = await encrypt_Message( privateKeyObj, node.armoredPublicKey, command)
		
		const url = `https://${ entryNode.pgp_publickey_id }.${CoNET_SI_Network_Domain}/post`

		if (_cmd === 'SaaS_Proxy') {
			command.requestData = [encryptedCommand, url, key, iv]
			return resolve (command)
		}
		let result

		try {
			result = await postToEndpoint(url, true, {data: encryptedCommand})
		} catch (ex) {
			return resolve (null)
		}
		let res
		try {
			const ciphertext = buffer.Buffer.from (result.data, 'base64')
			res = await crypto.subtle.decrypt({ name: "AES-CBC",iv}, key, ciphertext)
			
		} catch (ex){
			return resolve (null)
		}
		
		const dec = new TextDecoder()
		const _ret = dec.decode(res)
		
		
		let ret: SICommandObj

		try {
			ret = JSON.parse (_ret)
		} catch (ex) {
			return resolve (null)
		}
		return resolve (ret)
	})

}

const getRecipientCoNETCashAddress = async (cmd: worker_command) => {
	let save = false
	if (!CoNET_Data?.profiles?.length) {
		cmd.err = 'NOT_READY'
		return returnCommand (cmd)
	}
	
	const currentProfile = CoNET_Data.profiles[CoNET_Data.profiles.findIndex(n => n.isPrimary)]
	
	if (!currentProfile.network?.entrys.length || !currentProfile.network?.recipients.length ) {
		cmd.err = 'NOT_READY'
		return returnCommand (cmd)
	}

	if ( !currentProfile.pgpKey ) {
		const key = await createGPGKey('', '', '')
		currentProfile.pgpKey = {
			privateKeyArmor: key.privateKey,
			publicKeyArmor: key.publicKey
		}
		save = true
		
	}

	if (!currentProfile.network.recipients[0].armoredPublicKey) {
		currentProfile.network.recipients[0].armoredPublicKey = await _getNftArmoredPublicKey(currentProfile.network.recipients[0])
		save = true
	}

	
	
	if ( !cmd.data?.length || typeof cmd?.data[0] !== 'number' ) {
		cmd.err = 'INVALID_DATA'
		return returnCommand (cmd)
	}

	const amount: number = cmd.data[0]

	if (!CoNET_Data.CoNETCash?.assets?.length) {
		cmd.err = 'INVALID_DATA'
		return returnCommand (cmd)
	}

	const entryNode = getRamdomEntryNode (currentProfile)

	if (!entryNode) {
		cmd.err = 'NOT_READY'
		return returnCommand (cmd)
	}
	const recipientNode = currentProfile.network.recipients[0]
	
	logger (`regiest to recipient node [${ recipientNode.ip_addr }]`)
	const wRequest = await sendRequestToNode('getCoNETCashAccount', currentProfile, entryNode, recipientNode, [])
	if ( !wRequest|| ! wRequest.responseData?.length ) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}

	recipientNode.CoNETCashWalletAddress = wRequest.responseData[0]
	logger (recipientNode.CoNETCashWalletAddress)

	const CoNETCashTX = await authorizeCoNETCash ( amount, recipientNode.CoNETCashWalletAddress, [recipientNode])
	logger (CoNETCashTX)

	if (!CoNETCashTX) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	save = true
	
	const _currentProfile: publicProfile = {
		bio: currentProfile.bio? currentProfile.bio: '',
		nickname: currentProfile.nickname? currentProfile.nickname: '',
		profileImg: currentProfile.profileImg ? currentProfile.profileImg : '',
		tags: currentProfile.tags ? currentProfile.tags : [],
	}

	const authorizedObjHash = CoNETModule.EthCrypto.hash.keccak256(_currentProfile)
	const sign = CoNETModule.EthCrypto.sign(currentProfile.privateKeyArmor, authorizedObjHash)

	const wRequest1: any = await longConnectToNode('regiestRecipient', currentProfile, entryNode, recipientNode, [CoNETCashTX, {profile: _currentProfile, profileHash: authorizedObjHash, sign}],cmd)
	
	if (!wRequest1) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}

	logger (wRequest1)
	if (wRequest1.requestData) {
		const payment = CoNET_Data.CoNETCash.assets[0].history[0]
		if (currentProfile.network?.payment?.length ){
			currentProfile.network?.payment.unshift(payment)
		} else {
			currentProfile.network.payment = [payment]
		}
		returnCommand (cmd)
		await storage_StoreContainerData ()
		return await regiestProfile (currentProfile, recipientNode)
	}


	cmd.err = 'FAILURE'
	returnCommand (cmd)
	if (save ) {
		await storage_StoreContainerData ()
		save = false
	}
}

const connectToRecipient = async (cmd: worker_command) => {
	if (!CoNET_Data?.profiles?.length) {
		cmd.err = 'NOT_READY'
		return returnCommand (cmd)
	}
	const currentProfile = CoNET_Data.profiles[CoNET_Data.profiles.findIndex(n => n.isPrimary)]
	
	if (!currentProfile.network?.entrys.length || !currentProfile.network?.recipients.length ) {
		cmd.err = 'NOT_READY'
		return returnCommand (cmd)
	}
	const entryNode = getRamdomEntryNode (currentProfile)

	if (!entryNode) {
		cmd.err = 'NOT_READY'
		return returnCommand (cmd)
	}
	const recipientNode =  currentProfile.network.recipients[0]

	const wRequest1: any = await longConnectToNode('connecting', currentProfile, entryNode, recipientNode, [],cmd)
	if (!wRequest1) {
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	returnCommand (cmd)

}

const regiestProfile = async (profile: profile, recipientNode: nodes_info) => {
	if (!recipientNode?.armoredPublicKey || !profile.keyID || !profile?.pgpKey ) {
		return logger (`regiestProfile !recipientNode?.armoredPublicKey || !profile.keyID || !profile?.pgpKey Error!`)
	}
	const DL_publiy: any = await postToEndpoint (conet_DL_publishGPGKeyArmored, false, '' )

	if ( !DL_publiy?.publishGPGKey ) {
		return logger (`regiestProfile conet_DL_publishGPGKeyArmored have null Error!`)
	}

	const data: ICoNET_Profile = {
		profileImg: profile?.profileImg ? profile.profileImg: '',
		nickName: profile?.nickname ? profile.nickname : '',
		emailAddr: profile?.emailAddr ? profile.emailAddr: '',
		routerPublicKeyID: recipientNode.pgp_publickey_id,
		routerArmoredPublicKey: recipientNode.armoredPublicKey,
		armoredPublicKey: profile.pgpKey.publicKeyArmor,
		walletAddr: profile.keyID,
		walletAddrSign: CoNETModule.EthCrypto.sign(profile.privateKeyArmor, CoNETModule.EthCrypto.hash.keccak256(profile.keyID))
	}

	let privateKeyObj = null

	try {
		privateKeyObj = await makePrivateKeyObj (profile.pgpKey.privateKeyArmor)
	} catch (ex){
		logger (ex)
	}

	const encryptedCommand = await encrypt_Message( privateKeyObj, DL_publiy.publishGPGKey, data)
	Math.min(3,4)
	let result
	try {
		result = await postToEndpoint (conet_DL_regiestProfile, true, {pgpMessage: encryptedCommand} )
	} catch (ex) {
		return logger (`regiestProfile POST to conet_DL_regiestProfile ${conet_DL_regiestProfile} get ERROR`)
	}
	logger (`regiestProfile FINISHED!`)

}

const getProfile = async (cmd: worker_command) => {
	const key = cmd.data[0]
	const ret = CoNETModule.Web3Utils.isAddress (key)
	const keyUp = key.toUpperCase()
	if (!ret || !CoNET_Data) {
		cmd.err = 'INVALID_DATA'
		returnCommand (cmd)
		return logger (`getProfile have not KEY ERROR!`)
	}

	if (CoNET_Data.clientPool.length) {
		const index = CoNET_Data.clientPool.findIndex( n => n.walletAddr === keyUp)
		if (index > -1 ) {
			cmd.data[0] = CoNET_Data.clientPool[index]
			return returnCommand (cmd)
		}
	}
	let result
	try {
		result = await postToEndpoint (`${openSourceEndpoint}${keyUp}`, false, null )
	} catch (ex) {
		return logger (`regiestProfile POST to conet_DL_regiestProfile ${conet_DL_regiestProfile} get ERROR`)
	}
	if (CoNET_Data) {
		CoNET_Data.clientPool.push (result)

	}
	
	logger (result)
	cmd.data[0] = result
	returnCommand (cmd)
	await storage_StoreContainerData ()
	
}

const sendMessage = async (cmd: worker_command) => {
	const key = cmd.data[0]
	const message = cmd.data[1]
	if (!CoNET_Data) {
		cmd.err = 'NOT_READY'
		return returnCommand (cmd)
	}
	const index = CoNET_Data.clientPool.findIndex (n => n.walletAddr.toUpperCase() === key.toUpperCase())
	if (index<0 || !CoNET_Data?.profiles) {
		cmd.err = 'INVALID_DATA'
		return returnCommand (cmd)
	}
	const client = CoNET_Data.clientPool[index]

	const currentProfile = CoNET_Data.profiles[CoNET_Data.profiles.findIndex(n => n.isPrimary)]
	if (!currentProfile.pgpKey?.privateKeyArmor ) {
		cmd.err = 'INVALID_DATA'
		return returnCommand (cmd)
	}
	let privateKeyObj = null

	try {
		privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey?.privateKeyArmor)
	} catch (ex){
		logger (ex)
		cmd.err = 'INVALID_DATA'
		return returnCommand (cmd)
	}
	const sendMessage = {
		cmd: 'message',
		conect: message,
		totalPart: 1,
		currentPart: 1,
		timestamp: new Date().getTime()
	}

	const send = await sendForwardToNode (currentProfile, client, sendMessage)
	if (send) {
		return returnCommand (cmd)
	}
	cmd.err = 'FAILURE'
	return returnCommand (cmd)
}

const getHeader = (text: string, header: string) => {
	const rex = RegExp (header + ': ', 'gi')
	const u = text.split(rex)
	if (u.length < 2) {
		return ''
	}
	return u[1].split('\r\n')[0]
}

const fixHtmlLinks = (htmlText: string) => {
	const body = htmlText.split('\r\n\r\n')
	const rawHeader = body.shift()
	let _htmlText = body.join('\r\n\r\n')

	if(!rawHeader) {
		logger (`fixHtmlLinks GOT NO Header HTML!!!!!!!!!rawHeader=\n`, rawHeader)
		return { body: _htmlText, rawHeader } 
	}
	const _status = rawHeader.split('\r\n')[0]
	const __status = _status.split (' ')
	if (!/^HTTP\//.test(_status)) {
		logger (`fixHtmlLinks GOT unformated http protocol! status line = \n`, htmlText)
		return { body: _htmlText, rawHeader }
	}
	const status = parseInt(__status[1])
	const statusText = __status[2].split(/\r?\n/)[0]

	if ( Number.isNaN(status) || !status) {
		return { body: _htmlText, rawHeader }
	}
	
	if ( !_htmlText) {
		logger (`fixHtmlLinks GOT NO BODY HTML!!!!!!!!!\n`)
		logger ( rawHeader )
		return { body: _htmlText, rawHeader, status, statusText } 
	}
	const typeHeader = rawHeader.split(/Content\-Type\: /i)[1]
	if (!typeHeader.length) {
		return { body: _htmlText, rawHeader, status, statusText }
	}
	
	_htmlText = _htmlText.replace (/<meta name="referrer" content\=\".+\r\n/, '<meta name="referrer" content="no-referrer"/>\r\n')
	
	return { body: _htmlText, rawHeader, status, statusText } 
	// const type = typeHeader.split('\r\n')[0]
	// if (!/text/.test(type)) {
	// 	return { body: htmlText, rawHeader, status, statusText } 
	// }
	
	// const textBody = buffer.Buffer.from(htmlText,'base64').toString()

	// const orgnalSite = location.origin
	// const proxySiteRex = RegExp (proxySite, 'gi')
	
	// //htmlText = htmlText.replace(/X\-Frame\-Options\:.*\r\n$/ig, '')
	// htmlText = textBody.replace(proxySiteRex, orgnalSite)
	
	// return { body: htmlText, rawHeader, status, statusText } 
}


const getRandomNode = async () => {
	if (!activeNodes?.length ) {
		activeNodes = await _getSINodes ('CUSTOMER_REVIEW', 'USA')
	}
	if (!activeNodes?.length) {
		return null
	}
	const jj = activeNodes.filter(n => n.country === 'US' && n?.armoredPublicKey)
	const index =  Math.round(Math.random() * (jj.length -1))
	const node = jj[index]
	return node
}

const getNodeByIpaddress = (ipaddress: string ): Promise<nodes_info|null> => {
	return new Promise(async resolve=> {
		if ( !activeNodes) {
			logger (`getNodeByIpaddress activeNodes === null Error`)
			return resolve(null)
		}
		const index = activeNodes.findIndex(n => n.ip_addr === ipaddress)
		if ( index < 0 ) {
			return resolve(null)
		}
		const node = activeNodes[index]
		if ( !node.armoredPublicKey ) {
			node.armoredPublicKey = await _getNftArmoredPublicKey(node)
		}
		return resolve (node)
	})
	
}

const createProxyConnect = async (currentProfile: profile, entryNode: nodes_info, node: nodes_info, requestData: any[]) => {
	if (!currentProfile?.pgpKey|| !node?.armoredPublicKey) {
		return 
	}
	const key = buffer.Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
	const command: SICommandObj = {
		command: 'SaaS_Proxy',
		publicKeyArmored: currentProfile.pgpKey.publicKeyArmor,
		algorithm: 'AES-GCM',
		Securitykey: key,
		requestData
	}
	let privateKeyObj = null

	try {
		privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey.privateKeyArmor)
	} catch (ex){
		logger (ex)
	}

	const encryptedCommand = await encrypt_Message( privateKeyObj, node.armoredPublicKey, command)
	const url = `https://${ entryNode.pgp_publickey_id }.${CoNET_SI_Network_Domain}/post`

		
	command.requestData = [encryptedCommand, url, key]
	return (command)
}

const preProxyConnect = async (cmd: worker_command) => {
	logger ('******************** preProxyConnect **********************\n',cmd)
	const entryNode = await getRandomNode()
	const gatewayNode = (cmd.data.length > 2 && cmd.data[2]) ? cmd.data[2] : await getRandomNode()
	// const gatewayNode = await getNodeByIpaddress ('74.208.33.24')

	const responseChannel = new BroadcastChannel('toServiceWroker')

	if ( !entryNode|| !gatewayNode ||! CoNET_Data?.profiles) {
		cmd.err = 'NOT_INTERNET'
		return responseChannel.postMessage(JSON.stringify(cmd))
	}

	const currentProfile = CoNET_Data.profiles[CoNET_Data.profiles.findIndex(n => n.isPrimary)]

	const _site: urlData = cmd.data[0]
	const site = new URL (_site.href)

	cmd.data = [await createProxyConnect ( currentProfile, entryNode, gatewayNode, cmd.data)]

	const requestCmd: SICommandObj = cmd.data[0]
	if (cmd.err || !requestCmd.requestData?.length) {
		//		have no action nodes
		return responseChannel.postMessage(JSON.stringify(cmd))
	}

	const url = requestCmd.requestData[1]
	const encryptedCommand = requestCmd.requestData[0]
	const password = requestCmd.requestData[2]

	fetch (url, 
	{
		method: 'POST',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		},
		body: JSON.stringify ({data: encryptedCommand}),
		cache: 'no-store',
		referrerPolicy: 'no-referrer'
	}).then ( async res => {
		return res.text()
	}).then ( async text => {
		let textContent = await decryptFetchBody(password, text)
	
		logger (`Stream ready for service worker [${_site.href}]`)
		const { body, rawHeader,status, statusText } = fixHtmlLinks(textContent)

		
		cmd.data=[body, getHtmlHeadersV2(rawHeader, site.origin), {status, statusText }, gatewayNode]
		return responseChannel.postMessage(JSON.stringify(cmd))
	}).catch (ex=> {
		logger (`*************************  WORKER FETCH ERROR!  ************************* `)
		logger (_site.href)
		logger (cmd)
		logger (`*************************  WORKER FETCH ERROR!  ************************* `)
	})

}

const createKey = ( length: number ) => {

	const eth = new CoNETModule.Web3Eth()
	const acc = eth.accounts.wallet.create(length)
	return acc
}

const createGPGKey = ( passwd: string, name: string, email: string ) => {
	const userId = {
		name: name,
		email: email
	}
	const option = {
        type: 'ecc',
		passphrase: passwd,
		userIDs: [ userId ],
		curve: 'curve25519',
        format: 'armored'
	}

	return openpgp.generateKey ( option )
}

const startGetNoticeDaemon = () => {
    const start = () => {
        
    }
    start ()
}

const encrypt_TestPasscode = async (cmd: worker_command) => {
	if ( !cmd.data?.length || !passObj ) {
        cmd.err = 'INVALID_DATA'
        return returnCommand (cmd)
    }
	passObj.password = cmd.data[0]
	await decodePasscode ()
	try {
		await makeContainerPGPObj()
		await decryptCoNET_Data_WithContainerKey ()
	} catch (ex) {
		logger (`encrypt_TestPasscode get password error!`)
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	delete cmd.err
	if (!CoNET_Data) {
		logger (`encrypt_TestPasscode Error: Empty CoNET_Data!`)
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	CoNET_Data.passcode = {
		status: 'UNLOCKED'
	}

	const profiles = CoNET_Data.profiles
	if ( profiles ) {
		for ( let i = 0; i < profiles.length; i++ ) {
			const key = profiles[i].keyID
			if (key) {
				profiles[i].tokens.conet.balance = await getCONETBalance (key)
				profiles[i].tokens.usdc.balance = await getUSDCBalance (key)
			}	
			
		}
	}
	cmd.data = [CoNET_Data]
	returnCommand (cmd)

}

const createPlatformFirstProfile = async () => {
    
    initCoNET_Data ()
	if ( !CoNET_Data|| !CoNET_Data.profiles?.length) {
		return logger (`createPlatformFirstProfile initCoNET_Data got damaged!`)
	}
    const data = await createGPGKey( passObj?.passcode || '', '', '')			//			containerKeyPair

	containerKeyObj = {
		publicKeyArmor: data.publicKey,
		privateKeyArmor: data.privateKey
	}
	const key = await createGPGKey('', '', '')
	CoNET_Data.profiles[0].pgpKey = {
		privateKeyArmor: key.privateKey,
		publicKeyArmor: key.publicKey
	}
	
	return makeContainerPGPObj()
}

const encryptWorkerDoCommand = async ( cmd: worker_command ) => {

    switch ( cmd.cmd ) {
        case 'encrypt_createPasscode': {
            if ( !cmd.data || cmd.data.length < 2) {
                cmd.err = 'INVALID_DATA'
                return returnCommand ( cmd )
            }
            delete cmd.err
			const password = cmd.data[0]
            await createNumberPasscode (password)
			await createPlatformFirstProfile ()
			await storage_StoreContainerData ()
			const data: encrypt_keys_object = {
				preferences: {
					preferences: preferences
				},
				passcode: {
					status: 'UNLOCKED'
				},
				profiles: CoNET_Data?.profiles,
				isReady: true,
				clientPool: []
			}
		
			cmd.data = [data]
			returnCommand (cmd)
			activeNodes = await _getSINodes ('CUSTOMER_REVIEW', 'DE')
			
		}

        case 'encrypt_lock': {
            const data = {
                passcode: {
                    status: 'LOCKED'
                }
            }
            cmd.data = [data]
            
            return returnCommand (cmd)
        }

        case 'encrypt_deletePasscode': {
            await deleteExistDB ()
			return returnInitNull (cmd)
        }

		case 'getRecipientCoNETCashAddress': {
			return getRecipientCoNETCashAddress (cmd)

		}

        case 'storePreferences': {
			if ( !cmd.data || !cmd.data.length || !CoNET_Data?.isReady || !containerKeyObj ) {
				logger (`storePreferences ERROR have not attach preferences DATA`)
				cmd.err = 'INVALID_DATA'
				return returnCommand (cmd)
			}
			delete cmd.err
			CoNET_Data.preferences = preferences = cmd.data[0]
			await encryptCoNET_Data_WithContainerKey()
			storage_StoreContainerData ()
            return returnCommand (cmd)
        }

		case 'encrypt_TestPasscode': {
			return encrypt_TestPasscode (cmd)
		}

        case 'newProfile': {
            return //newProfile (cmd)
        }

        case 'storeProfile': {
            return storeProfile (cmd)
        }

		case 'getUSDCPrice': {
			return getUSDCPrice (cmd)
		}

		case 'getFaucet': {
			return getFaucet (cmd)
		}

		case 'sendAsset': {
			return sendAsset (cmd)
		}

		case 'syncAsset': {
			return syncAsset (cmd)
		}

		case 'buyUSDC': {
			return buyUSDC (cmd)
		}

		case 'mintCoNETCash': {
			return mintCoNETCash (cmd)
		}

		case 'isAddress' : {
			const address = cmd.data[0]
			const ret = CoNETModule.Web3Utils.isAddress (address)
			cmd.data = [ret]
			return returnCommand (cmd)
		}

		case 'getSINodes': {
			const sortby = cmd.data[0][0]
			const region = cmd.data[0][1]
			return getSINodes (sortby, region, cmd)
		}

		case 'getUserProfile': {
			return getProfile (cmd)
		}

		case 'sendMessage': {
			return sendMessage (cmd)
		}

        default: {
            cmd.err = 'INVALID_COMMAND'
            returnCommand (cmd)
            return console.log (`encryptWorkerDoCommand unknow command!`)
        }
    }
}

const decryptFetchBody = async (password: string, textBuffer: string ) => {
	if (!textBuffer?.length) {
		logger (`transform come with EMPTY ! skip!`)
		return ''
	}

	let _ret = ''
	
	
	const block = textBuffer.split(/\r\n\r\n/)
	const header = block.shift()
	//	logger (`findBlock got HTTP headers\n`, header)
	
	if ( ! block.length ) {
		logger (`findBlock First body !!!!!\n`, block)
		return ''
	}
	let count = 0

	textBuffer = block.join('\r\n\r\n')


	const blocks = textBuffer.split('\r\n\r\n')
	
	while ( blocks.length ) {
		const dataBlock = blocks.shift()

		if (!dataBlock) {
			logger (`findBlock get empty dataBlock!!!! continue loop`, dataBlock)
			continue
		}
		const subBlock = dataBlock.split('\r\n')

		/**
		 * 		HTML Transfer-Encoding: chunked
		 * 		https://developer.mozilla.org/en-US/docs/Glossary/Payload_body
		 */

		if ( subBlock.length < 2) {
			logger (`findBlock get a subBlock which have not length stop current black !!!! giveup current subBlock ! continue loop`, dataBlock)
			continue
		}

		const bodyLength = parseInt ( subBlock[0], 16)
		const body = subBlock[1]

		if ( Number.isNaN(bodyLength)) {
			logger (`findBlock get unformated subBlock, transfer terminate now!!!!!\n`, subBlock )
			continue
		}

		//		the EOF of data
		if (bodyLength === 0) {
			logger (`findBlock get EOF! total count = [${count}]`)
			break
		}

		if (!body) {
			if (!blocks.length) {
				logger (`findBlock get empty body!!!!!!!!!! waiting next !`, dataBlock )
				blocks.unshift(dataBlock)
				break
			}
			logger (`findBlock get unformated subBlock, transfer terminate now!!!!!\n`, subBlock )
			continue
		}

		// logger (`findBlock process block number ${++count}! bodyLength part get body length = [${bodyLength}] body.length [${body.length }]`)


		_ret += await CoNETModule.aesGcmDecrypt (body, password)
	}

	logger (`findBlock decrypted block No.[${count}]`)

	textBuffer = blocks.shift()||''
	return _ret
}

const postToEndpointGetBody: ( url: string, post: boolean, jsonData: any) => Promise<string> = ( url: string, post: boolean, jsonData ) => {
	return new Promise ((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.onload = () => {
			clearTimeout (timeCount)
			//const status = parseInt(xhr.responseText.split (' ')[1])

			if (xhr.status === 200) {
				// parse JSON
				if ( !xhr.responseText.length ) {
					return resolve ('')
				}
				return resolve ( xhr.responseText)
			}
			return resolve ('')
			
		}

		xhr.open( post? 'POST': 'GET', url, true )
		xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
		// xhr.setRequestHeader('Connection', 'close')

		xhr.send(jsonData? JSON.stringify(jsonData): '')

		logger (url)

		const timeCount = setTimeout (() => {
			const Err = `postToEndpoint Timeout!`
			return resolve ('')
		}, XMLHttpRequestTimeout )
	})
	
}


/**
 * 
 * 			test unit
 */



