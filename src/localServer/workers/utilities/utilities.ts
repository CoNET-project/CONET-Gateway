




const returnCommand = ( cmd: worker_command ) => {
    self.postMessage ( JSON.stringify ( cmd ))
}
//	@ts-ignore
const logger = (...argv: any ) => {
    const date = new Date ()
    const dateStrang = `%c [Seguro-worker INFO ${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}]`
	
    return console.log ( dateStrang, 'color: #dcde56',  ...argv)
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

// const loadWalletAddress = ( keypair: keyPair, password ) => {
// 	const account = new CoNETModule.Web3EthAccounts ()
// 	return account.wallet.decrypt ( keypair.privateKeyArmor, password )
// }

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

// const encryptCoNET_Data_WithContainerKey = async () => {

// 	if (!CoNET_Data) {
// 		const msg = `encryptCoNET_Data_WithContainerKey Error: CoNET_Data === null`
// 		return logger (msg)
// 	}
// 	CoNET_Data.encryptedString = ''
//     const encryptObj = {
//         message: await openpgp.createMessage({text: buffer.Buffer.from(JSON.stringify (CoNET_Data)).toString('base64')}),
//         encryptionKeys: containerKeyObj.keyObj.publicKeyObj,
//         signingKeys: containerKeyObj?.keyObj.privateKeyObj,
// 		config: { preferredCompressionAlgorithm: openpgp.enums.compression.zlib } 		// compress the data with zlib
//     }

// 	CoNET_Data.encryptedString = await openpgp.encrypt(encryptObj)
// 	return
// }

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


const decryptCoNET_Data_WithPasswd = async () => {
	if (!CoNET_Data || !CoNET_Data?.encryptedString ) {
		throw new Error(`decryptCoNET_Data_WithContainerKey Error: have no containerKeyObj?.keyObj || CoNET_Data?.encryptedString`)
	}
	
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


// const getUSDCBalance = async (Addr: string) => {
// 	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(usdcNet))
// 	const uuu = await eth.getBalance(Addr)
// 	const balance = parseInt(uuu)/denominator
// 	return balance
// }


const minERC20ABI = [
	// balanceOf
	{
	  "constant":true,
	  "inputs":[{"name":"_owner","type":"address"}],
	  "name":"balanceOf",
	  "outputs":[{"name":"balance","type":"uint256"}],
	  "type":"function"
	},
	// decimals
	{
	  "constant":true,
	  "inputs":[],
	  "name":"decimals",
	  "outputs":[{"name":"","type":"uint8"}],
	  "type":"function"
	}
]
const CNTP_Address = '0x0f43685B2cB08b9FB8Ca1D981fF078C22Fec84c5'
const weiToEther = (wei: string, length: number) => {
	const kkk = parseFloat(wei)
	if (kkk<0.0000001) {
		return '0'
	}
	return kkk.toFixed(length)
}
const getCNTPBalance: (Addr: string) => Promise<string> = (Addr: string) => {
	const provider = new CoNETModule.Web3Eth(conet_rpc)
	const eth = new CoNETModule.Web3Eth(provider)
	const contract = new eth.eth.Contract(minERC20ABI, CNTP_Address)
	
	return new Promise (resolve => {
		return contract.methods.balanceOf(Addr).call().then(result => {
			const ss = weiToEther(eth.utils.fromWei(result,'ether'), 4)
			return resolve (ss)
		})
	})
	
}

// const getAllProfileUSDCBalance = () => {
// 	const profiles = CoNET_Data?.profiles
// 	if ( !profiles || !profiles.length ) {
// 		return logger (`getAllProfileCoNETBalance error: have no CoNET_Data?.profiles!`)
// 	}
// 	const ret: any [] = []
// 	profiles.forEach (async n => {
// 		if ( n.keyID ) {
// 			const newBalance = await getUSDCBalance (n.keyID)
// 			if ( n.tokens.usdc.balance !== newBalance ) {
// 				n.tokens.usdc.balance = newBalance
// 				ret.push ({
// 					keyID: n.keyID,
// 					tokens: {
// 						usdc: {
// 							balance : n.tokens.usdc.balance
// 						}
// 					}
// 				})
// 				logger (`getAllProfileUSDCBalance USDC Balance changed!`)
// 				logger (ret)
// 			}
// 		}
		
// 	})
// 	if ( ret.length ) {
// 		const cmd: worker_command = {
// 			cmd: 'READY',
// 			data: [ret]
// 		}
// 		returnCommand (cmd)
// 	}
// }


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
				let ret
				try {
					ret = JSON.parse(xhr.responseText)
				} catch (ex) {
					if ( post ) {
						return resolve ('')
					}
					return resolve(xhr.responseText)
				}
				return resolve (ret)
			}

			logger(`postToEndpoint [${url}] xhr.status [${xhr.status === 200}] !== 200 Error`)
			return resolve (false)
		}

		xhr.open( post? 'POST': 'GET', url, true )
		xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')

		xhr.send(jsonData? JSON.stringify(jsonData): '')

		const timeCount = setTimeout (() => {
			const Err = `Timeout!`
			logger (`postToEndpoint ${url} Timeout Error`, Err )
			reject (new Error ( Err ))
		}, XMLHttpRequestTimeout )
	})
	
}

const changeBigIntToString = (Obj: any) => {
	const keys = Object.keys(Obj)
	if (!keys?.length ) {
		return Obj
	}
	for (let i of keys) {
		const item = Obj[i]
		if (typeof item === 'bigint') {
			Obj[i] = Obj[i].toString()
		}
	}
	return Obj
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

// const getFaucet = async ( cmd: worker_command, callback ) => {
// 	const keyID = cmd.data[0]
// 	let profile: null| profile

// 	if (!keyID || !(profile = getProfileFromKeyID (keyID))) {
// 		cmd.err = 'INVALID_DATA'
// 		return callback? callback (cmd) : returnCommand (cmd)
// 	}

// 	delete cmd.err
// 	let result
// 	try {
// 		result = await postToEndpoint(conet_DL_endpoint, true, { walletAddr: keyID })
// 	} catch (ex) {
// 		logger (`postToEndpoint [${conet_DL_endpoint}] error! `, ex)
// 		cmd.err = 'FAILURE'
// 		callback ? callback(cmd) : returnCommand (cmd)
// 		return logger (`postToEndpoint ${conet_DL_endpoint} ERROR!`)
// 	}
	
// 	if (!result?.txHash ) {
		
// 		cmd.err = 'FAILURE'
// 		callback? callback (cmd) : returnCommand (cmd)
// 		return logger (`postToEndpoint ${conet_DL_endpoint} ERROR!`)
// 	}

// 	logger (`postToEndpoint [${ conet_DL_endpoint }] SUCCESS`)
	
// 	logger (`result = ${result}` )

// 	if ( result.txHash) {
// 		let receipt = await getTxhashInfo (result.txHash, getRandomCoNETEndPoint())
// 		receipt.isSend = false
// 		receipt.time = new Date().toISOString()
// 		receipt = changeBigIntToString(receipt)
// 		profile.tokens.conet.history.push (receipt)
// 	}
	
// 	return storeProfile (cmd, callback)
// }


// const sendAsset = async (cmd: worker_command) => {
// 	const [fromAddr, total, toAddr, asset] = cmd.data[0]
// 	if ( !fromAddr || !total || !toAddr || !CoNET_Data?.profiles ) {
// 		cmd.err = 'FAILURE'
// 		return returnCommand (cmd)
// 	}

// 	const index = CoNET_Data.profiles.findIndex (val => {
// 		return val.keyID === fromAddr
// 	})

// 	if (index < 0 ) {
// 		cmd.err = 'FAILURE'
// 		return returnCommand (cmd)
// 	}

// 	const profile = CoNET_Data.profiles[index]

// 	let network = ''
// 	let history: any = null

// 		network = getRandomCoNETEndPoint()
// 		history = profile.tokens.conet.history


// 	// } else {
// 	// 	history = profile.tokens.usdc.history
// 	// 	balance = profile.tokens.usdc.balance
// 	// }

// 	const {eth} = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(network))
// 	const sendObj = {
// 		from     : '0x'+ profile.keyID?.substring(2),
// 		to       : '0x'+ toAddr.substring(2),
// 		data     : ''
// 	}

// 	const balance = (await eth.getBalance(profile.keyID)).toString()


// 	const gas = (await eth.estimateGas(sendObj)).toString()
// 	const gasPrice = (await eth.getGasPrice()).toString()
// 	const totalGas = gas * gasPrice
// 	sendObj['gas'] = gas
// 	sendObj['gasPrice'] = gasPrice

// 	let _amount = parseFloat(total)* wei + totalGas
// 	if ( balance < _amount) {
// 		_amount = balance - totalGas
// 	}

// 	sendObj['value'] = _amount.toString()

// 	const createTransaction111 = await eth.accounts.signTransaction( sendObj,'0x'+profile.privateKeyArmor.substring(2))

// 	let receipt1111: CryptoAssetHistory
// 	try {
// 		receipt1111 = await eth.sendSignedTransaction (createTransaction111.rawTransaction )
// 	} catch (ex) {
// 		logger (`sendCONET eth.sendSignedTransaction Error`, ex)
// 		return
// 	}

// 	receipt1111.value = _amount/10**18
// 	receipt1111.isSend = true
// 	receipt1111.time = new Date().toISOString()
// 	receipt1111 = changeBigIntToString (receipt1111)
// 	history.unshift (receipt1111)

// 	return storeProfile (cmd)
// }

// const getUSDCPrice = async (cmd: worker_command) => {
// 	logger (`getUSDCPrice START`)
// 	let result
// 	try {
// 		result = await postToEndpoint(conet_DL_getUSDCPrice_Endpoint, false,'')

// 	} catch (ex) {
// 		logger (`postToEndpoint [${conet_DL_getUSDCPrice_Endpoint}] error`)
// 		cmd.err = 'FAILURE'
// 		returnCommand (cmd)
// 		return logger (ex)
// 	}
// 	cmd.data = [result]
// 	return returnCommand (cmd)
// }

// const buyUSDC = async (cmd: worker_command) => {
// 	logger (`buyUSDC START`)
// 	const [conetVal, keyID] = cmd.data[0]

// 	if ( !CoNET_Data?.profiles|| !keyID || conetVal <= 0) {
// 		cmd.err = 'NOT_READY'
// 		return returnCommand (cmd)
// 	}
	
// 	const profile = getProfileFromKeyID(keyID)

// 	if ( !profile ) {
// 		cmd.err = 'FAILURE'
// 		return returnCommand (cmd)
// 	}
// 	const balance = profile.tokens.conet.balance
// 	const history = profile.tokens.conet.history

// 	if ( conetVal - balance - gasFee> 0) {
// 		cmd.err = 'FAILURE'
// 		return returnCommand (cmd)
// 	}
// 	const obj = {
// 		gas: gasFee,
// 		to: USDC_exchange_Addr,
// 		value: (conetVal * wei).toString()
// 	}
// 	logger (obj)
// 	const CoNETEndpoint = getRandomCoNETEndPoint()
// 	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(CoNETEndpoint))
// 	let createTransaction
// 	try {
// 		createTransaction = await eth.accounts.signTransaction( obj, profile.privateKeyArmor )
// 	} catch (ex) {
// 		logger (`${CoNETEndpoint} is not available`)
// 		cmd.err = 'FAILURE'
// 		return returnCommand (cmd)
// 	}
	
// 	const receipt = await eth.sendSignedTransaction (createTransaction.rawTransaction )
// 	receipt.isSend = true
// 	receipt.time = new Date().toISOString()
// 	receipt.value = conetVal
// 	logger(`buyUSDC Send CoNET`, receipt)
// 	history.unshift (receipt)
// 	let result
// 	try {
// 		result = await postToEndpoint(buyUSDCEndpoint, true, { txHash: receipt.transactionHash })
// 	} catch (ex) {
// 		logger (`postToEndpoint [${buyUSDCEndpoint}] Error`)
// 		cmd.err = 'FAILURE'
// 		returnCommand (cmd)
// 		return logger (ex)
// 	}

// 	logger (`postToEndpoint [${ buyUSDCEndpoint }] SUCCESS`)
// 	logger (`result = `, result )
// 	const receipt1 = await getTxhashInfo (result.transactionHash, usdcNet)
// 	receipt1.isSend = false
// 	receipt1.time = new Date().toISOString()
	
// 	logger(`buyUSDC get receipt1`, receipt1) 
// 	profile.tokens.usdc.history.unshift (receipt1)
// 	return storeProfile (cmd)
	
// }

const getTxhashInfo = async (txhash: string, network: string) => {
	const eth = new CoNETModule.Web3Eth ( new CoNETModule.Web3Eth.providers.HttpProvider(network))
	let receipt
	try {
		receipt = await eth.eth.getTransaction(txhash)
	} catch (ex) {
		logger (`getTxhashInfo Error from [${ network }]`, ex )
		return null
	}
	receipt.value = receipt.value.toString()/wei
	return receipt
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


const generateAesKey = async (length = 256) => {
	const key = await crypto.subtle.generateKey({
	  name: 'AES-CBC',
	  length
	}, true, ['encrypt', 'decrypt'])
  
	return key
}


const postToEndpointSSE = ( url: string, post: boolean, jsonData, CallBack:(err: WorkerCommandError|null, data: string) => void) => {

		const xhr = new XMLHttpRequest()
		
		let chunk = 0
		xhr.onprogress = async (e) => {
			
			
			const data = await xhr.responseText
			clearTimeout (timeCount)
			if (e.eventPhase<2) {
				return logger(`xhr.status = ${xhr.status} e.eventPhase [${e.eventPhase}]`, data)
			}
			logger (`postToEndpointSSE xhr.onprogress!  ${xhr.readyState} xhr.status [${xhr.status}]`)
			
			if (xhr.status ===401) {
				return CallBack('Err_Multiple_IP','')
			}
			if (xhr.status ===402) {
				return CallBack('Err_Existed','')
			}
			if (xhr.status !==200) {
				return CallBack('FAILURE','')
			}
			
			const currentData = data.substring(chunk)
			const responseText = data.split('\r\n\r\n')
			chunk = data.length
			CallBack (null, currentData)

		}

		xhr.upload.onabort = () => {
			logger(`xhr.upload.onabort`)
		}
		
		xhr.upload.onerror=(err)=> {
			clearTimeout (timeCount)
			// CallBack('NOT_INTERNET', '')
			logger(`xhr.upload.onerror`, err)
		}

		xhr.open( post? 'POST': 'GET', url, true )
		xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
		xhr.send(typeof jsonData !=='string' ? JSON.stringify(jsonData): jsonData)

		xhr.onerror = (err) => {
			logger(`xhr.onerror`, err)
			clearTimeout (timeCount)
			CallBack('NOT_INTERNET', '')
		}
		const timeCount = setTimeout (() => {
			const Err = `postToEndpoint Timeout!`
			logger (`postToEndpoint Error`, Err )
			CallBack ('TIMEOUT','')
		}, 1000 * 45 )

		return xhr
	
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


// const longConnectToNode = async (_cmd: SICommandObj_Command, currentProfile: profile, entryNode: nodes_info, node: nodes_info, requestData: any[], cmd: worker_command ) => {
// 	return new Promise ( async resolve => {
// 		if (!currentProfile?.pgpKey?.publicKeyArmor || !node.armoredPublicKey ) {
// 			return resolve (null)
// 		}
// 		const key = await crypto.subtle.generateKey({
// 			name: 'AES-CBC',
// 			length: 256
// 		}, true, ['encrypt', 'decrypt'])

// 		const iv = crypto.getRandomValues(new Uint8Array(16))
// 		const command: SICommandObj = {
// 			command: _cmd,
// 			publicKeyArmored: currentProfile.pgpKey.publicKeyArmor,
// 			algorithm: 'aes-256-cbc',
// 			iv: buffer.Buffer.from(iv).toString('base64'),
// 			Securitykey: JSON.stringify(await crypto.subtle.exportKey('jwk', key)),
// 			requestData
// 		}

// 		let privateKeyObj = null

// 		try {
// 			privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey.privateKeyArmor)
// 		} catch (ex){
// 			logger (ex)
// 		}
	
// 		const encryptedCommand = await encrypt_Message( privateKeyObj, node.armoredPublicKey, command)
		
// 		const url = `https://${ entryNode.pgp_publickey_id }.${CoNET_SI_Network_Domain}/post`

// 		logger (`connect to ${url}`)

// 		return postToEndpointSSE(url, true, {data: encryptedCommand}, async (err, data ) => {

// 			if (err) {
// 				return resolve (null)
// 			}
// 			if (!data) {
// 				return resolve (null)
// 			}
// 			if (/-----BEGIN PGP MESSAGE-----/.test(data[0])) {
// 				const clearText:any = await decrypteMessage (data[0], privateKeyObj)
// 				if ( !clearText.data ||!clearText.signatures||!CoNET_Data) {
// 					return
// 				}
				
// 				try {
// 					clearText.obj =  JSON.parse (buffer.Buffer.from(clearText.data,'base64').toString())
// 				} catch (ex) {
// 					return
// 				}
// 				const key = clearText.signatures[0].keyID.toHex()
// 				clearText.signatures[0].keyIDHex = key
// 				let index = -1


// 				if ((index = CoNET_Data.clientPool.findIndex (n => n.walletAddr.toUpperCase() === key.toUpperCase())) < 0) {
					
// 					let result
// 					try {
// 						result = await postToEndpoint (`${openSourceEndpoint}${key.toUpperCase()}`, false, null )
// 					} catch (ex) {
// 						return logger (`longConnectToNode have not find ${key} ERROR`)
// 					}
// 					CoNET_Data.clientPool.push (result)
// 					logger (result)
// 					clearText.profile = result
// 				} else {
// 					clearText.profile = CoNET_Data.clientPool[index]
// 				}
				
// 				delete cmd.err
// 				cmd.data[0]= clearText
// 				return returnCommand(cmd)
// 			}
// 			let res
// 			try {
// 				const ciphertext = buffer.Buffer.from (data, 'base64')
// 				res = await crypto.subtle.decrypt({ name: "AES-CBC",iv}, key, ciphertext)
				
// 			} catch (ex){
// 				return resolve (null)
// 			}

			
			
// 			const dec = new TextDecoder()
// 			const _ret = dec.decode(res)
			
			
// 			let ret: SICommandObj

// 			try {
// 				ret = JSON.parse (_ret)
// 			} catch (ex) {
// 				return resolve (null)
// 			}

// 			return resolve (ret)
// 		})
		
// 	})
// }




// const connectToRecipient = async (cmd: worker_command) => {
// 	if (!CoNET_Data?.profiles?.length) {
// 		cmd.err = 'NOT_READY'
// 		return returnCommand (cmd)
// 	}
// 	const currentProfile = CoNET_Data.profiles[CoNET_Data.profiles.findIndex(n => n.isPrimary)]
	
// 	if (!currentProfile.network?.recipients.length ) {
// 		cmd.err = 'NOT_READY'
// 		return returnCommand (cmd)
// 	}
// 	const entryNode = await getRandomNode ()

// 	if (!entryNode) {
// 		cmd.err = 'NOT_READY'
// 		return returnCommand (cmd)
// 	}
// 	const recipientNode =  currentProfile.network.recipients[0]

// 	const wRequest1: any = await longConnectToNode('connecting', currentProfile, entryNode, recipientNode, [],cmd)
// 	if (!wRequest1) {
// 		cmd.err = 'FAILURE'
// 		return returnCommand (cmd)
// 	}
// 	returnCommand (cmd)

// }

// const regiestProfile = async (profile: profile, recipientNode: nodes_info) => {
// 	if (!recipientNode?.armoredPublicKey || !profile.keyID || !profile?.pgpKey ) {
// 		return logger (`regiestProfile !recipientNode?.armoredPublicKey || !profile.keyID || !profile?.pgpKey Error!`)
// 	}
// 	const DL_publiy: any = await postToEndpoint (conet_DL_publishGPGKeyArmored, false, '' )

// 	if ( !DL_publiy?.publishGPGKey ) {
// 		return logger (`regiestProfile conet_DL_publishGPGKeyArmored have null Error!`)
// 	}

// 	const data: ICoNET_Profile = {
// 		profileImg: profile?.profileImg ? profile.profileImg: '',
// 		nickName: profile?.nickname ? profile.nickname : '',
// 		emailAddr: profile?.emailAddr ? profile.emailAddr: '',
// 		routerPublicKeyID: recipientNode.pgp_publickey_id,
// 		routerArmoredPublicKey: recipientNode.armoredPublicKey,
// 		armoredPublicKey: profile.pgpKey.publicKeyArmor,
// 		walletAddr: profile.keyID,
// 		walletAddrSign: CoNETModule.EthCrypto.sign(profile.privateKeyArmor, CoNETModule.EthCrypto.hash.keccak256(profile.keyID))
// 	}

// 	let privateKeyObj = null

// 	try {
// 		privateKeyObj = await makePrivateKeyObj (profile.pgpKey.privateKeyArmor)
// 	} catch (ex){
// 		logger (ex)
// 	}

// 	const encryptedCommand = await encrypt_Message( privateKeyObj, DL_publiy.publishGPGKey, data)
// 	Math.min(3,4)
// 	let result
// 	try {
// 		result = await postToEndpoint (conet_DL_regiestProfile, true, {pgpMessage: encryptedCommand} )
// 	} catch (ex) {
// 		return logger (`regiestProfile POST to conet_DL_regiestProfile ${conet_DL_regiestProfile} get ERROR`)
// 	}
// 	logger (`regiestProfile FINISHED!`)

// }

// const getProfile = async (cmd: worker_command) => {
// 	const key = cmd.data[0]
// 	const ret = CoNETModule.Web3Utils.isAddress (key)
// 	const keyUp = key.toUpperCase()
// 	if (!ret || !CoNET_Data) {
// 		cmd.err = 'INVALID_DATA'
// 		returnCommand (cmd)
// 		return logger (`getProfile have not KEY ERROR!`)
// 	}

// 	if (CoNET_Data.clientPool.length) {
// 		const index = CoNET_Data.clientPool.findIndex( n => n.walletAddr === keyUp)
// 		if (index > -1 ) {
// 			cmd.data[0] = CoNET_Data.clientPool[index]
// 			return returnCommand (cmd)
// 		}
// 	}
// 	let result
// 	try {
// 		result = await postToEndpoint (`${openSourceEndpoint}${keyUp}`, false, null )
// 	} catch (ex) {
// 		return logger (`regiestProfile POST to conet_DL_regiestProfile ${conet_DL_regiestProfile} get ERROR`)
// 	}

// 	if (CoNET_Data) {
// 		CoNET_Data.clientPool.push (result)

// 	}
	
// 	logger (result)
// 	cmd.data[0] = result
// 	returnCommand (cmd)
// 	await storage_StoreContainerData ()
	
// }

// const sendMessage = async (cmd: worker_command) => {
// 	const key = cmd.data[0]
// 	const message = cmd.data[1]
// 	if (!CoNET_Data) {
// 		cmd.err = 'NOT_READY'
// 		return returnCommand (cmd)
// 	}
// 	const index = CoNET_Data.clientPool.findIndex (n => n.walletAddr.toUpperCase() === key.toUpperCase())
// 	if (index<0 || !CoNET_Data?.profiles) {
// 		cmd.err = 'INVALID_DATA'
// 		return returnCommand (cmd)
// 	}
// 	const client = CoNET_Data.clientPool[index]

// 	const currentProfile = CoNET_Data.profiles[CoNET_Data.profiles.findIndex(n => n.isPrimary)]
// 	if (!currentProfile.pgpKey?.privateKeyArmor ) {
// 		cmd.err = 'INVALID_DATA'
// 		return returnCommand (cmd)
// 	}
// 	let privateKeyObj = null

// 	try {
// 		privateKeyObj = await makePrivateKeyObj (currentProfile.pgpKey?.privateKeyArmor)
// 	} catch (ex){
// 		logger (ex)
// 		cmd.err = 'INVALID_DATA'
// 		return returnCommand (cmd)
// 	}
// 	const sendMessage = {
// 		cmd: 'message',
// 		conect: message,
// 		totalPart: 1,
// 		currentPart: 1,
// 		timestamp: new Date().getTime()
// 	}

// 	const send = await sendForwardToNode (currentProfile, client, sendMessage)
// 	if (send) {
// 		return returnCommand (cmd)
// 	}
// 	cmd.err = 'FAILURE'
// 	return returnCommand (cmd)
// }

const getHeader = (text: string, header: string) => {
	const rex = RegExp (header + ': ', 'gi')
	const u = text.split(rex)
	if (u.length < 2) {
		return ''
	}
	return u[1].split('\r\n')[0]
}
const pathFileMatch = /\.\w+$/

const _fixUrlProRegexp_new = ( match: RegExp, symbol: string, html: string, remotesite: string ) => {

	const lineText = html.split(match)

	if (lineText.length < 2) {
		return html
	}

	let ret = ''
	for (let i = 0; i < lineText.length; i ++) {
		ret += lineText[i] + symbol
		if (/Futm_source|dos,dpf,hsm,jsa,d,csi/.test (lineText[i+1])) {
			logger (`Futm_source`)
		}
		if (i < lineText.length - 1 ) {

			//	remove the first / support src start as '//'
			let domTag
			let tag
			try {
				let _domArray = lineText[i].split('<')
				
				if (_domArray.length < 2) {
					_domArray = ret.split('<')
				}
				const domArray =_domArray[_domArray.length -1]
				const __domArray = domArray.split (/\s/)
				
				domTag = __domArray.length < 2 ? '': __domArray[0]
				
				const _tag = domArray.split(/\s*=\s*.?/)
				tag = findSource(_tag)
			} catch (ex) {
				ret += match
				logger (`SKIP uu = new URL(url) Error [${lineText[i+1].substring(0, 200)}]`)
				continue
			}
			if (!tag) {
				ret += match
				logger (`SKIP uu = new URL(url) Error [${lineText[i+1].substring(0, 200)}]`)
				continue
			}
			let useRemote = true
			
			if (lineText[i+1][0] === '/') {
				lineText[i+1] = lineText[i+1].substring(1)
				useRemote = false
			}
			const _path = lineText[i + 1].split(symbol)[0]
			const url = useRemote ? `${remotesite}/${_path}` : `https://${_path}`
			
			let remote: URL|null = null
			try {
				remote = new URL (url)
			} catch (ex) {
				if (!useRemote) {
					ret += '/'
				}
				continue
			}
			
			const pathArray = remote.pathname.split('/')

			//	remove file name
			if (pathFileMatch.test(pathArray[pathArray.length - 1])) {
				pathArray.pop()
			}

			//	remove the last /
			if (pathArray[pathArray.length - 1]==='') {
				pathArray.pop()
			}

			const path = pathArray.join('/')
			ret += `${location.origin}/api/${path? path + '/': ''}_/CoNET_proxyUrl/${useRemote? remotesite + '/': 'https://'}`
		}
	}
	return ret
}

const _fixUrlProRegexp = (match, symbol, html, remotesite) => {
    const lineText = html.split(match);
    if (lineText.length < 2) {
        return html;
    }
    let ret = '';
    for (let i = 0; i < lineText.length; i++) {
        ret += lineText[i] + symbol;
        if (i < lineText.length - 1) {
            //	remove the first / support src start as '//'
            let useRemote = true;
            if (lineText[i + 1][0] === '/') {
                lineText[i + 1] = lineText[i + 1].substring(1);
                useRemote = false;
            }
            const _path = lineText[i + 1].split(symbol)[0];
            const url = useRemote ? `${remotesite}/${_path}` : `https://${_path}`;
            let remote: URL|null = null
            try {
                remote = new URL(url);
            }
            catch (ex) {
                if (!useRemote) {
                    ret += '/';
                }
                continue;
            }
            const pathArray = remote.pathname.split('/');
            //	remove file name
            if (pathFileMatch.test(pathArray[pathArray.length - 1])) {
                pathArray.pop();
            }
            //	remove the last /
            if (pathArray[pathArray.length - 1] === '') {
                pathArray.pop();
            }
            const path = pathArray.join('/');
            ret += `${location.origin}/api/${path ? path + '/' : ''}_/CoNET_proxyUrl/${useRemote ? remotesite + '/' : 'https://'}`;
        }
    }
    return ret;
}

const findSource = (textArr: string[]) => {
	let source = textArr.pop()
	let retSou = ''

	do {
		if (!source || /http/.test(source)) {
			source = textArr.pop()
			continue
		}
		const oo = source.split(/\s/)
		retSou = oo[oo.length - 1]

		break
	} while (source)
	retSou = /\W/.test(retSou) ? '': retSou
	return retSou
}

const _fixUrlPro = (match, html, remotesite) => {
    const splitReg = new RegExp(match);
    const lineText = html.split(splitReg);
    if (lineText.length < 2) {
        return html;
    }
    let ret = '';
    for (let i = 0; i < lineText.length; i++) {
        ret += lineText[i];
        if (i < lineText.length - 1) {
            const url = lineText[i + 1].split(/('|"|>|\)){1}/)[0];
            let domTag;
            let uu;
            let tag;
            try {
                uu = new URL(match + url);
                const _domArray = lineText[i].split('<');
                const domArray = _domArray[_domArray.length - 1];
                domTag = domArray.split(/\s/)[0];
                const _tag = domArray.split(/\s*=\s*.?/);
                if (_tag.length > 0 && !_tag[_tag.length - 1]) {
                    _tag.pop();
                }
                const __tag = _tag[_tag.length - 1].split(/\s/);
                tag = __tag[__tag.length - 1];
            }
            catch (ex) {
                ret += match;
                logger(`SKIP uu = new URL(url) Error [${lineText[i + 1].substring(0, 200)}]`);
                continue;
            }
            if (uu.origin === location.origin) {
                ret += match;
                //logger (`SKIP because uu.origin === location.origin [${uu.origin === location.origin}]  [${ret.substring(ret.length -100)}]`)
                continue;
            }
            if (!/href|src|data-original|action|onClick/i.test(tag)) {
                ret += match;
                logger(`SKIP because [${ret.substring(ret.length - 150)}] tag【${tag}】!/href|src|data-original|action|onClick/i.test(tag) [${!/href|src|data-original|action|onClick/.test(tag)}]) !domTag【${domTag}】[${!domTag}] || domTag && !/a|/i.test(domTag) [${domTag && !/a|/i.test(domTag)}]`);
                continue;
            }
            const pathArray = uu.pathname.split('/');
            //	remove file name
            if (pathFileMatch.test(pathArray[pathArray.length - 1])) {
                pathArray.pop();
            }
            //	remove the last /
            if (pathArray[pathArray.length - 1] === '') {
                pathArray.pop();
            }
            // if (pathArray.length > 1 && pathArray[0]!=='') {
            // 	pathArray.unshift('')
            // }
            let remotePath = pathArray.join('/');
            //const remotePath = uu.pathname ? (/\/$/.test(uu.pathname)? uu.pathname : uu.pathname + '/'): ''
            if (remotePath === '/') {
                remotePath = '';
            }
            ret += location.origin === uu.origin ? match : `${location.origin}/api${remotePath ? remotePath + '/' : ''}_/CoNET_proxyUrl/${match}`;
        }
    }
    return ret;
}

const _fixUrlPro_new = ( match: string, html: string, remotesite: string ) => {
	const splitReg = new RegExp(match)
	const lineText = html.split(splitReg)

	if (lineText.length < 2) {
		return html
	}

	let ret = ''
	for (let i = 0; i < lineText.length; i ++) {
		ret += lineText[i]
		if (i < lineText.length - 1 ) {
			const url = lineText[i+1].split(/('|"|>|\)){1}/)[0]
			let domTag
			let uu: URL
			let tag
			try {
				uu = new URL(match+url)
				let _domArray = lineText[i].split('<')
				
				if (_domArray.length < 2) {
					_domArray = ret.split('<')
				}
				const domArray =_domArray[_domArray.length -1]
				const __domArray = domArray.split (/\s/)

				domTag = __domArray.length > 1 ? __domArray[0]: ''
				const _tag = domArray.split(/\s*=\s*.?/)
				tag = findSource(_tag)
			} catch (ex) {
				ret += match
				logger (`SKIP uu = new URL(url) Error [${lineText[i+1].substring(0, 200)}]`)
				continue
			}

			if (uu.origin === location.origin) {
				ret += match
				//logger (`SKIP because uu.origin === location.origin [${uu.origin === location.origin}]  [${ret.substring(ret.length -100)}]`)
				continue
			}

			if ( !tag || !/href|data-original|action|onClick|srcset|src/i.test(tag)) {
				ret += match
				logger (`SKIP because [${ret.substring(ret.length -150)}] tag【${tag}】!/href|src|data-original|action|onClick/i.test(tag) [${!/href|src|data-original|action|onClick/.test(tag)}]) !domTag【${domTag}】[${!domTag}] || domTag && !/a|/i.test(domTag) [${domTag && !/a|/i.test(domTag)}]`)
				continue
			}
			
			
			const pathArray = uu.pathname.split('/')

			//	remove file name
			if (pathFileMatch.test(pathArray[pathArray.length - 1])) {
				pathArray.pop()
			}
			//	remove the last /
			if (pathArray[pathArray.length-1] ==='') {
				pathArray.pop()
			}

			// if (pathArray.length > 1 && pathArray[0]!=='') {
			// 	pathArray.unshift('')
			// }
			
			let remotePath = pathArray.join('/')
			//const remotePath = uu.pathname ? (/\/$/.test(uu.pathname)? uu.pathname : uu.pathname + '/'): ''
			if (remotePath === '/') {
				remotePath = ''
			}

			ret += location.origin === uu.origin ? match : `${location.origin}/api${remotePath? remotePath + '/': ''}_/CoNET_proxyUrl/${match}`
		}
	}
	return ret
}

const match = /(https?\:\/\/)?(www\.)?[^\s]+\.[^\s]+/g


const fixHtmlLinks = (htmlText: string, remotrSite: string) => {
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
		logger (`###################################################################\n`)
		logger (`fixHtmlLinks GOT NO BODY HTML!!!!!!!!!\n`)
		logger ( rawHeader )
		logger (`###################################################################\n`)
		return { body: _htmlText, rawHeader, status, statusText } 
	}


	const typeHeader = rawHeader.split(/Content\-Type\: /i)[1]
	if (!typeHeader.length || !/html/i.test(typeHeader.split('\r\n')[0])  ) {
		return { body: _htmlText, rawHeader, status, statusText }
	}
	
	_htmlText = _htmlText.replace (/<meta name="referrer" content\=\".+\r\n/, '<meta name="referrer" content="no-referrer"/>\r\n')
	//	_htmlText = _fixUrl_a_tab (_htmlText, remotrSite)
	_htmlText = _fixUrlPro (`https://`, _htmlText, remotrSite)
	_htmlText = _fixUrlPro (`http://`, _htmlText, remotrSite)
	_htmlText = _fixUrlProRegexp (/"\//, '"',_htmlText, remotrSite)
	_htmlText = _fixUrlProRegexp (/'\//, "'",_htmlText, remotrSite)

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


const fetchWithTimeout = async (resource, options: any) => {
	const {timeout = 80000 } = options
	
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), timeout)
  
	const response = await fetch(resource, {
	  ...options,
	  signal: controller.signal  
	})

	clearTimeout(id)
  
	return response
}


const createKey = ( length: number ) => {

	const eth = new CoNETModule.Web3Eth(conet_rpc)
	const acc = eth.wallet.create(length)
	return acc
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


const encryptWorkerDoCommand = async ( e: MessageEvent<any> ) => {
	const jsonData = buffer.Buffer.from ( e.data ).toString()
	let cmd: worker_command
	try {
		cmd = JSON.parse ( jsonData )
	} catch ( ex ) {
		return console.dir ( ex )
	}
	if ( !workerReady ) {
		cmd.err = 'NOT_READY'
		return returnCommand ( cmd )
	}
	
    switch ( cmd.cmd ) {
        // case 'encrypt_createPasscode': {
        //     if ( !cmd.data || cmd.data.length < 2) {
        //         cmd.err = 'INVALID_DATA'
        //         return returnCommand ( cmd )
        //     }
        //     delete cmd.err
		// 	const password = cmd.data[0]
        //     await createNumberPasscode (password)
		// 	await createPlatformFirstProfile ()
		// 	await storage_StoreContainerData ()
		// 	const data: encrypt_keys_object = {
		// 		preferences: {
		// 			preferences: preferences
		// 		},
		// 		passcode: {
		// 			status: 'UNLOCKED'
		// 		},
		// 		profiles: CoNET_Data?.profiles,
		// 		isReady: true
		// 	}
		
		// 	cmd.data = [data]
		// 	returnCommand (cmd)
		// }

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

		// case 'getRecipientCoNETCashAddress': {
		// 	return getRecipientCoNETCashAddress (cmd)

		// }

        // case 'storePreferences': {
		// 	if ( !cmd.data || !cmd.data.length || !CoNET_Data?.isReady || !containerKeyObj ) {
		// 		logger (`storePreferences ERROR have not attach preferences DATA`)
		// 		cmd.err = 'INVALID_DATA'
		// 		return returnCommand (cmd)
		// 	}
		// 	delete cmd.err
		// 	CoNET_Data.preferences = preferences = cmd.data[0]
		// 	await encryptCoNET_Data_WithContainerKey()
		// 	storage_StoreContainerData ()
        //     return returnCommand (cmd)
        // }

        case 'newProfile': {
            return //newProfile (cmd)
        }

		// case 'getFaucet': {
		// 	return getFaucet (cmd, null)
		// }

		// case 'sendAsset': {
		// 	return sendAsset (cmd)
		// }

		// case 'buyUSDC': {
		// 	return buyUSDC (cmd)
		// }

		// case 'mintCoNETCash': {
		// 	return mintCoNETCash (cmd)
		// }

		case 'isAddress' : {
			const address = cmd.data[0]
			const ret = CoNETModule.Web3Utils.isAddress (address)
			cmd.data = [ret]
			return returnCommand (cmd)
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
		logger (`decryptFetchBody come with EMPTY ! skip!`)
		return ''
	}
	const blocks = textBuffer.split('\r\n\r\n')
	if (blocks.length < 2) {
		logger (`decryptFetchBody has no BODY ! skip!`)
		return ''
	}
	blocks.shift()
	
	let _ret = ''
	do {
		const _bodys = blocks.shift()
		if (!_bodys) {
			continue
		}
		const uu = _bodys.split('\r\n')
		for (let u of uu) {
			if (u.length < 10) {
				continue
			}
			_ret += await CoNETModule.aesGcmDecrypt (u, password)
		}
		
	} while (blocks.length > 0)
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

