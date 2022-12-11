
let passObj: passInit| null = null
let systemInitialization_UUID = ''
let workerReady = false
let CoNET_Data: encrypt_keys_object | null = null
let containerKeyObj: keyPair|null = null
let preferences: any = null
const databaseName = 'CoNET'

const CoNETModule: CoNET_Module = {
	EthCrypto: null,
	Web3HttpProvider:  null,
	Web3EthAccounts: null,
	Web3Eth: null,
	Web3Utils: null,
	forge: null
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
            await encryptCoNET_Data_WithContainerKey()
			await storage_StoreContainerData ()
			const data: encrypt_keys_object = {
				preferences: {
					preferences: preferences
				},
				passcode: {
					status: 'UNLOCKED'
				},
				profiles: CoNET_Data?.profiles,
				isReady: true
			}
		
			cmd.data = [data]
			return returnCommand (cmd)
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

        default: {
            cmd.err = 'INVALID_COMMAND'
            returnCommand (cmd)
            return console.log (`encryptWorkerDoCommand unknow command!`)
        }
    }
}

const initEncryptWorker = () => {
	
    const baseUrl = self.name + 'utilities/'
    self.importScripts ( baseUrl + 'Buffer.js' )
    self.importScripts ( baseUrl + 'openpgp.min.js' )
    self.importScripts ( baseUrl + 'UuidV4.js' )
    self.importScripts ( baseUrl + 'Pouchdb.js' )
    self.importScripts ( baseUrl + 'PouchdbFind.js' )
    self.importScripts ( baseUrl + 'PouchdbMemory.js' )
    self.importScripts ( baseUrl + 'scrypt.js' )
    self.importScripts ( baseUrl + 'async.js' )
    self.importScripts ( baseUrl + 'forge.all.min.js' )	
    self.importScripts ( baseUrl + 'jszip.min.js' )
    self.importScripts ( baseUrl + 'utilities.js' )
	self.importScripts ( baseUrl + 'EthCrypto.js' )
	self.importScripts ( baseUrl + 'web3-providers-http.js' )
	self.importScripts ( baseUrl + 'web3-eth.js' )
	self.importScripts ( baseUrl + 'web3-utils.js' )
    self.importScripts ( baseUrl + 'generatePassword.js' )
    self.importScripts ( baseUrl + 'storage.js' )
    self.importScripts ( baseUrl + 'seguroSetup.js' )
    workerReady = true
    onmessage = e => {
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

        return encryptWorkerDoCommand ( cmd )
    }

    return checkStorage ()
}

const createPlatformFirstProfile = async () => {
    
    initCoNET_Data ()
	if ( !CoNET_Data ) {
		return 
	}
    const data = await createGPGKey( passObj?.passcode || '', '', '')			//			containerKeyPair

	containerKeyObj = {
		publicKeyArmor: data.publicKey,
		privateKeyArmor: data.privateKey
	}
	
	return makeContainerPGPObj()
}

/**
 * 		
 */

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

initEncryptWorker()
