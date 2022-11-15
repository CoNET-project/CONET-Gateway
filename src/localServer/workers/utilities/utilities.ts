const returnCommand = ( cmd: worker_command ) => {
    self.postMessage ( JSON.stringify ( cmd ))
}

const logger = (...argv: any ) => {
    const date = new Date ()
    let dateStrang = `[Seguro-worker INFO ${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}] `
    return console.log ( dateStrang, ...argv )
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
		logger (msg)
		return 
	}
	return await openpgp.decryptKey({ privateKey: await openpgp.readPrivateKey ({ armoredKey: privateArmor}), passphrase: password })

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

const decryptWithProfile = (encryptedMessage: string, CallBack: (err: Error|null, text?: string) => void) => {
    let ret = ''
    return openpgp.readMessage({armoredMessage: encryptedMessage})
    .then ((message: any) => {
        return openpgp.decrypt({
            message,
            verificationKeys: '',
            decryptionKeys:''
        })
    })
    .then((n: any) => {
        ret = n.data
        return n.verified
    })
    .then (() => {
        return CallBack (null, ret )
    })
    .catch ((ex: Error) => {
        logger (ex)
    })
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

const denominator = 1000000000000000000
const testNet = 'https://conettech.ca/CoNET'

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
		}
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

const usdcNet = 'https://mvpusdc.conettech.ca/mvpusdc'

const getUSDCBalance = async (Addr: string) => {
	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(usdcNet))
	const uuu = await eth.getBalance(Addr)
	const balance = parseInt(uuu)/denominator
	return balance
}
const CONETNet = 'https://conettech.ca/fujiCoNET'
const CoNETCashNet = 'https://dl.conettech.ca/CoNETCash'

const getCONETBalance = async (Addr: string) => {
	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(CONETNet))
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


const XMLHttpRequestTimeout = 15 * 1000

const postToEndpoint = ( url: string, post: boolean, jsonData ) => {
	return new Promise ((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.onload = () => {
			clearTimeout (timeCount)
			if (xhr.status === 200) {
				// parse JSON
				if ( !xhr.responseText.length ) {
					return resolve ('')
				}
				const response = JSON.parse(xhr.responseText)
				return resolve (response)
			}
			return reject(new Error (`status != 200`))
		}

		xhr.open( post? 'POST': 'GET', url, true )
		xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')

		xhr.send(jsonData? JSON.stringify(jsonData): '')

		logger (url)

		const timeCount = setTimeout (() => {
			const Err = `postToEndpoint Timeout!`
			logger (`postToEndpoint Error`, Err )
			reject (new Error ( Err ))
		}, XMLHttpRequestTimeout )
	})
	
}

const conet_DL_endpoint = 'https://dl.conettech.ca/conet-faucet'

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
	logger (`getFaucet START`)

	let result

	try {
		result = await postToEndpoint(conet_DL_endpoint, true, { walletAddr: keyID })
	} catch (ex) {
		logger (`postToEndpoint [${conet_DL_endpoint}] error!`)
		cmd.err = 'FAILURE'
		returnCommand (cmd)
		return logger (ex)
	}

	logger (`postToEndpoint [${ conet_DL_endpoint }] SUCCESS`)
	logger (`result = `, result )
	if ( result.txHash) {
		const receipt = await getTxhashInfo (result.txHash, CONETNet)
		receipt.isSend = false
		receipt.time = new Date().toISOString()
		profile.tokens.conet.history.push (receipt)
	}
	
	return storeProfile (cmd)
}

const gasFee = 21000

const gasFeeEth = 0.000526
const syncAsset = async (cmd: worker_command) => {
	await getAllProfileBalance ()
	cmd.data = [CoNET_Data]
	return returnCommand (cmd)
}

const wei = 1000000000000000000

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
		network = CONETNet
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

const conet_DL_getUSDCPrice_Endpoint = 'https://dl.conettech.ca/conet-price'
const USDC_exchange_Addr = '0xD493391c2a2AafEd135A9f6164C0Dcfa9C68F1ee'

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

const GasToEth = 0.00000001
const buyUSDCEndpoint = `https://dl.conettech.ca/exchange_conet_usdc`
const mintCoNETCashEndpoint = `https://dl.conettech.ca/mint_conetcash`

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
	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(CONETNet))
	let createTransaction
	try {
		createTransaction = await eth.accounts.signTransaction( obj, profile.privateKeyArmor )
	} catch (ex) {
		logger (`${CONETNet} is not available`)
		cmd.err = 'FAILURE'
		return returnCommand (cmd)
	}
	
	const receipt = await eth.sendSignedTransaction (createTransaction.rawTransaction )
	receipt.isSend = true
	receipt.time = new Date().toISOString()
	receipt.value = conetVal
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

	let key
	if ( !CoNET_Data.CoNETCash ) {
		CoNET_Data.CoNETCash = {
			Total: 0,
			assets: []
		}
	}
	key = createKey (1)[0]
	

	const message = CoNETModule.EthCrypto.hash.keccak256(receipt.transactionHash)
	const _sign = CoNETModule.EthCrypto.sign(key.privateKey, message)

	let result
	try {
		result = await postToEndpoint(mintCoNETCashEndpoint, true, { txHash: receipt.transactionHash, sign: _sign })
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