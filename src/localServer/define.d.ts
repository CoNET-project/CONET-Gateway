
declare const openpgp
declare const buffer: any
declare const scrypt: any
declare const async: any
declare const JSZip: any
declare const PouchDB: any

interface imapConnect {
	imapServer: string
	imapUserName: string
	imapUserPassword: string
	imapPortNumber: number | number[]
	imapSsl: boolean
	imapIgnoreCertificate?: boolean
}

interface connectRequest {
	kloak_account_armor: string
	device_armor: string
	client_folder_name: string
	use_kloak_shared_imap_account: boolean
	imap_account: imap_setup
	next_time_connect?: next_time_connect
	error?: string
	server_folder: string
	encrypted_response?: string
	encrypted_request: string
	connect_info?: connect_imap_reqponse
}

interface connect_imap_reqponse {
	imap_account: imap_setup
	server_folder: string
	client_folder: string
}

interface imap_setup {
	imap_username: string
	imap_user_password: string
	imap_port_number: number
	imap_server: string
}

interface next_time_connect {
	imap_account: imap_setup
	server_folder: string
}

interface postData {
	connectUUID?: string
	encryptedMessage: string
	status?: string

}

interface Window {
	postMessage(message: any, transfer?: Transferable[]): void;
}

type keyOpenPGP_obj = {
	publicKeyObj: any
	privateKeyObj: any
}

type CryptoAssetHistory = {
	status: 'Pending'|'Confirmed'
	amount: number
	Nonce: number
	to: string
	transactionFee: number
	gasLimit: number
	gasUsed: number
	baseFee: number
	priorityFee: number
	totalGasFee: number
	maxFeePerGas: number
	total: number
}

interface TokenPreferences {
	networkName: string						//
	RpcURL: string							//		Token Contract Address
	chainID: number							//		Token Decimal
	currencySymbol: string					//		Token Symbol
	blockExplorerURL: string
}

interface CryptoAsset {
	balance: number
	history: CryptoAssetHistory[]
}

interface keyPair {
	publicKeyArmor: string
	privateKeyArmor: string
	keyID?: string
	keyObj?: {
		publicKeyObj: any
		privateKeyObj: any
	}
}


interface passInit {
	charSet: string
	salt: Buffer
	N: number
	r: number
	p: number
	dkLen: number
	passcode: string
	_passcode: string
	password: string
}

declare type WorkerCommandError = 'NOT_READY'|'INVALID_DATA'|'NO_UUID'|'INVALID_COMMAND'|'OPENPGP_RUNNING_ERROR'|
'PouchDB_ERROR'|'GENERATE_PASSCODE_ERROR'|'FAILURE'|'COUNTDOWN'| netWorkError | verification

declare type netWorkError = 'NOT_INTERNET'|'NOT_STRIPE'|'ALL_EMAIL_SERVER_CAN_NOT_CONNECTING'|'LOCAL_SERVER_ERROR'|'WAITING_SEGURO_RESPONSE_TIMEOUT'|
'EMAIL_ACCOUNT_AUTH_ERROR'|'UNKNOW_ERROR'|'LOCAL_RESPONE_NO_JSON_DATA'
declare type seguroError = 'TIMEOUT_EMAIL_SERVER' | 'TIMEOUT_SEGURO_NETWORK' |
'NO_INTERNET' | 'CONNECTING_ACCESS_POINT' |
'CONNECTING_SEGURO_NETWORK'|'INIT'|'NOT_STRIPE'|
'LOCAL_SERVER_ERROR'|'INVITATION_CODE_ERROR'|'SEGURO_DATA_FORMAT_ERROR'|
'SEGURO_ERROR'

declare type verification = 'INCORRECT_CODE'

declare type WorkerCommand = 'READY'|
	'encrypt_TestPasscode'|'encrypt_createPasscode'|'encrypt_lock'|'invitation'|'encrypt_deletePasscode'|'storePreferences'|'newProfile'|'storeProfile'

type worker_command = {
	cmd: WorkerCommand
	data: any[]
	uuid?: string
	err?: WorkerCommandError
}

type CoNETCash = {
	assets: {
		key: keyPair
		history: CryptoAssetHistory[]
	}
	Total: number
}

interface profile extends keyPair {
    nickname?: string
    tags?: string[]
	alias?: string
	bio?: string
    profileImg?: string
	recipient?: recipientNode
	isPrimary?: boolean
	tokens: {
		conet:CryptoAsset
		usdc:CryptoAsset
	}
}

type ColorTheme = 'LIGHT' | 'DARK'
type Language = 'en-CA' | 'fr-CA' | 'ja-JP' | 'zh-CN' | 'zh-TW'
type PasscodeStatus = 'LOCKED' | 'UNLOCKED' | 'NOT_SET'

type recipientNode = {
	keyID: string
	publicKey: string
}


type encrypt_keys_object = {
    profiles?: profile[]
	isReady: boolean
	CoNETCash?: CoNETCash
	preferences?: any
	encryptedString?: string
	passcode?: Passcode
	conetTokenPreferences: TokenPreferences
	usdcTokenPreferences: TokenPreferences
}



type Passcode = {
    status: PasscodeStatus
}

interface imap_connect {
    imap_username: string
    imap_user_password: string
    imap_port_number: string
    imap_server: string
}


type SeguroNetworkStatus = 
'TIMEOUT_EMAIL_SERVER' | 'TIMEOUT_SEGURO_NETWORK' |
'NO_INTERNET' | 'CONNECTING_ACCESS_POINT' | 'WAITING_SEGURO_RESPONSE'|
'CONNECTING_SEGURO_NETWORK'|
'INIT'|'FINISHED'

interface ISeguroNetwork {
	SeguroStatus: SeguroNetworkStatus
	SeguroObject: webEndpointConnect| {}
}

interface testImapResult {
	error: string
	n: {
		server: string
		port: number
	}
	time: number
}

interface SeguroInvitation {
	imapTest: string
	device_publickey_armor: string
	seguro_key_armor: string
	client_folder_name?: string
	sharedDeviceInvitation?: string[]
	shardInvitation?: string[]
	invitation: string
	imap_connect?: imap_connect
}

interface webEndpointConnect {
	imap_connect: imap_connect
	server_listening_folder: string
	client_listening_folder: string
	shardInvitation: string[]
	sharedDeviceInvitation: string[]
	endPoints: string[]
	nextNoticeBlock: string
	NoticeBody: string
}

interface CoNET_Module {
	EthCrypto: any
	Web3HttpProvider: any
	Web3EthAccounts: any
	Web3Eth: any
}

type systemInitialization = {
	preferences: any
	passcode: Passcode
}

type CoNETIndexDBInit = {
	container: {
		privateKeyArmor: string
		publicKeyArmor: string
	}
	id: passInit
	uuid: string
	preferences: any
}