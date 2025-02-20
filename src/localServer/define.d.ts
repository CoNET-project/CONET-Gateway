
declare const openpgp
declare const buffer: any
declare const scrypt: any
declare const async: any
declare const JSZip: any
declare const PouchDB: any
declare const ethers: any
declare const uuid
declare const Jimp
declare const TronWeb

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

type nodes_info = {
	country?: string
	customs_review_total?: number
	ip_addr: string
	last_online?: boolean
	lat?: number
	lon?: number
	outbound_total?: number
	region: string
	armoredPublicKey: string
	publicKeyObj?: any
	domain?: string
	nftNumber: number
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
	Nonce?: number
	to?: string
	transactionFee?: string
	gasLimit?: string
	gasUsed?: string
	baseFee?: number
	priorityFee?: number
	totalGasFee?: number
	maxFeePerGas?: number
	transactionHash?: string
	time: string
	blockHash?: string
	blockNumber?: number
	contractAddress?: string
	effectiveGasPrice?: number
	cumulativeGasUsed?: number
	from?: string
	logs?: any[]
	logsBloom?: string
	transactionIndex?: number
	type?: string
	value: number
	isSend: boolean
	cCNTPBurn?: boolean
	epoch?: number
	rate?: string
}

interface TokenPreferences {
	networkName: string						//
	RpcURL: string							//		Token Contract Address
	chainID: number							//		Token Decimal
	currencySymbol: string					//		Token Symbol
	blockExplorerURL: string
}

interface CryptoAsset {
	balance: string
	history: CryptoAssetHistory[]
	network: string
	decimal: number
	contract: string
	name: string
	isNft?: boolean
	unlocked?: boolean
	supplyMaximum?: string
	totalSupply?: string
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

declare type WorkerCommandError = 'NOT_READY'|'INVALID_DATA'|'NO_UUID'|'INVALID_COMMAND'|'OPENPGP_RUNNING_ERROR'| 'TIMEOUT'|
'PouchDB_ERROR'|'GENERATE_PASSCODE_ERROR'|'FAILURE'|'COUNTDOWN'| netWorkError | verification |seguroError|conetMiner|conetError

declare type netWorkError = 'NOT_INTERNET'|'NOT_STRIPE'|'ALL_EMAIL_SERVER_CAN_NOT_CONNECTING'|'LOCAL_SERVER_ERROR'|'WAITING_SEGURO_RESPONSE_TIMEOUT'|
'EMAIL_ACCOUNT_AUTH_ERROR'|'UNKNOW_ERROR'|'LOCAL_RESPONE_NO_JSON_DATA'

declare type seguroError = 'TIMEOUT_EMAIL_SERVER' | 'TIMEOUT_SEGURO_NETWORK' |
'NO_INTERNET' | 'CONNECTING_ACCESS_POINT' |
'CONNECTING_SEGURO_NETWORK'|'INIT'|'NOT_STRIPE'|
'LOCAL_SERVER_ERROR'|'INVITATION_CODE_ERROR'|'SEGURO_DATA_FORMAT_ERROR'|
'SEGURO_ERROR'

declare type conetError = 'CONET_API_SERVER_unreachable'

declare type verification = 'INCORRECT_CODE'|'Err_Server_Unreachable'|'Err_Multiple_IP'|'Err_Existed'

declare type conetMiner = 'Err_Server_Unreachable'|'Err_Multiple_IP'

declare type WorkerCommand =
  | "READY"
  | "getRegiestNodes"
  | "beforeunload"
  | "createAccount"
  | "testPasscode"
  | "showSRP"
  | "unlock_cCNTP"
  | "encrypt_TestPasscode"
  | "encrypt_createPasscode"
  | "encrypt_lock"
  | "invitation"
  | "encrypt_deletePasscode"
  | "preBurnCCNTP"
  | "storePreferences"
  | "newProfile"
  | "storeProfile"
  | "urlProxy"
  | "saveDomain"
  | "getDomain"
  | "setRegion"
  | "getGuardianRegion"
  | "getFaucet"
  | "isAddress"
  | "syncAssetV1"
  | "sendAsset"
  | "getUSDCPrice"
  | "buyUSDC"
  | "getWorkerClientID"
  | "getAllOtherAssets"
  | "mintCoNETCash"
  | "getSINodes"
  | "getRecipientCoNETCashAddress"
  | "getUserProfile"
  | "burnCCNTP"
  | "showLeaderboard"
  | "sendMessage"
  | "incomeData"
  | "WORKER_MESSAGE"
  | "getCONETBalance"
  | "startProxy"
  | "registerReferrer"
  | "CONETianPlanPurchase"
  | "SaaSRegister"
  | "getContainer"
  | "ipaddress"
  | "startLiveness"
  | "stopLiveness"
  | "isLivenessRunning"
  | "importWallet"
  | "startMining"
  | "stopMining"
  //		from service worker
  | "urlProxy"
  | "saveDomain"
  | "getDomain"
  | "getWorkerClientID"
  | "getRefereesList"
  | "getAllNodes"
  | "getAllProfiles"
  | "updateProfile"
  | "addProfile"
  | "resetPasscode"
  | "getAssetsPrice"
  | "recoverAccount"
  | "CONETFaucet"
  | "prePurchase"
  | "guardianPurchase"
  | "fx168PrePurchase"
  | "claimToken"
  | "transferToken"
  | "estimateGas"
  | "estimateGasForNftContract"
  | "startSilentPass"
  | "isWalletAgent"
  | "transferNft"
  | "addMonitoredWallet"
  | "removeMonitoredWallet"
  | ""
  | "getAssetsPrice"
  | "recoverAccount"
  | "CONETFaucet"
  | "prePurchase"
  | "guardianPurchase"
  | "fx168PrePurchase"
  | "claimToken"
  | "transferToken"
  | "estimateGas"
  | "estimateGasForNftContract"
  | "startSilentPass"
  | "isWalletAgent"
  | "transferNft"
  | "addMonitoredWallet"
  | "removeMonitoredWallet"
  | "getProfileAvailableCntpReward"
	| "redeemAirdrop"
	| "redeemSilentPassPassport"

type SINodesSortby = 'CUSTOMER_REVIEW'|'TOTAL_ONLINE_TIME'|
	'STORAGE_PRICE_LOW'|'STORAGE_PRICE_HIGH'|'OUTBOUND_PRICE_HIGH'|'OUTBOUND_PRICE_LOW'
	
type SINodesRegion = 'USA'|'UK'|'ES'|'DE'
type worker_command = {
	cmd: WorkerCommand
	data: any[]
	uuid?: string
	err?: WorkerCommandError
	clientID?: string
}
type walletKey = {
	address: string
	index: number
	privateKey: string
}
type CoNETCash = {
	assets: {
		key: walletKey
		id: string
		history: CryptoAssetHistory[]
	}[]
	Total: number
}

interface keyPair {
	keyID: string
	publicKeyArmor?: string
	privateKeyArmor?: string
	keyObj?:{
		publicKeyObj: any
		privateKeyObj: any
	}
}
type regionType = {
    us: boolean,
    uk: boolean,
    ge: boolean,
    sp: boolean,
    fr: boolean
}

interface conet_tokens {
	//	CONET Holesky
	conet?:CryptoAsset
	conetDepin?:CryptoAsset
	CNTP?: CryptoAsset
	CNTPV1?: CryptoAsset
	cCNTP?: CryptoAsset

	//	CONET Holesky Claimable
	cUSDB?: CryptoAsset
	cBNBUSDT?: CryptoAsset
	// cBlastETH: CryptoAsset
	cBNB?: CryptoAsset
	cETH?: CryptoAsset
	cArbETH?:CryptoAsset
	cArbUSDT?:CryptoAsset

	cUSDT?: CryptoAsset

	// blastETH?: CryptoAsset
	// usdb?: CryptoAsset

	//	Arbitrum
	arb_eth?: CryptoAsset
	arb_usdt?: CryptoAsset

	//	ETH
	eth?: CryptoAsset
	usdt?:CryptoAsset

	//	BSC
	bnb?: CryptoAsset
	wbnb?: CryptoAsset
	wusdt?: CryptoAsset

	ConetianNFT?: CryptoAsset
	ConetianAgentNFT?: CryptoAsset

	ConetianPlan?: {
		Conetian: CryptoAsset
		Conetian_referrer: CryptoAsset
	}

	GuardianPlan?: {
		Guardian: CryptoAsset
		Guardian_referrer: CryptoAsset
		Node_NFT_ID: string
	}
	tron?:{
		walletAddress: string
		usdt: CryptoAsset
		tron: CryptoAsset
	}
}

interface conet_ticket {
  balance: string;
}

interface historicBalance {
	timestamp: number
	balance: string
}

interface passportAirdrop {
	guardianPassport: number
	conetianPassport: number
}

interface passportInfoFromChain {
	nftIDs: BigInt[]
	expires: BigInt[]
	expiresDays: BigInt[]
	premium: boolean[]
}

interface passportInfo {
	walletAddress: string
	nftID: number
	expires: number
	expiresDays: number
	premium: boolean
}

interface airdrop {
	availableCntp?: number
	gasForCntp?: number
	availableConetian?: number
	gasForConetian?: number
	availableGuardianPassport?: number
	availableConetianPassport?: number
}

interface profile extends keyPair {
  isPrimary?: boolean;
  pgpKey?: pgpKeyPair;
  privateKeyArmor: string;
  emailAddr?: string;
  hdPath: string;
  index: number;
  tokens: conet_tokens | null;
  tickets?: conet_ticket;
  isNode: boolean;
  referrer: string | null | undefined;
  data?: any;
  burnCCNTP?: CryptoAssetHistory;
  nodeID?: number;
  nodeIP_address?: string;
  nodeRegion?: string;
	historicBalance?: historicBalance[]
	airdrop?: airdrop
	silentPassPassports?: passportInfo[]
}

interface publicProfile {
	nickname: string
    tags: string[]
	bio: string
    profileImg: string
}

interface ICoNET_Router_Base {
	gpgPublicKeyID?: string
	armoredPublicKey: string
	walletAddr: string
	signPgpKeyID?: string
	walletAddrSign: string
}

interface ICoNET_Profile extends ICoNET_Router_Base {
	nickName: string
	profileImg: string
	emailAddr: string
	routerPublicKeyID: string
	routerArmoredPublicKey: string
}


type ColorTheme = 'LIGHT' | 'DARK'
type Language = 'en-CA' | 'fr-CA' | 'ja-JP' | 'zh-CN' | 'zh-TW'
type PasscodeStatus = 'LOCKED' | 'UNLOCKED' | 'NOT_SET'

type recipientNode = {
	keyID: string
	publicKey: string
}

interface FragmentClass {
	mainFragmentName: string
	failures: number
}

interface fx168_Order {
	publishTx?: string
	timestamp: number
	status: 'pending'|'active'|'problem'
	uuid: string
	nodes: number
}

interface MonitoredAsset {
	id:string, 
	name: string, 
	balance: string
}

interface MonitoredWallet {
	address: string
	assets: {
		cntp: MonitoredAsset,
		conet: MonitoredAsset,
		guardianNft: MonitoredAsset,
		conetianNft: MonitoredAsset,
		guardianReferralNft: MonitoredAsset,
		conetianReferralNft: MonitoredAsset,
	}
}

type encrypt_keys_object = {
  profiles?: profile[]
	isReady: boolean
	ver: number
	preferences?: any
	encryptedString?: string
	passcode?: Passcode
	mnemonicPhrase: string
	fragmentClass?: FragmentClass
	nonce: number
	fx168Order?: fx168_Order[]
	upgradev2?: boolean
	monitoredWallets?: MonitoredWallet[]
}

type pgpKeyPair = {
	privateKeyArmor: string
	publicKeyArmor: string
	publicKeyObj?: any
	privateKeyObj?: any
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
	// forge: any
	aesGcmEncrypt: (plaintext: string, password: string) => Promise<string> 
	aesGcmDecrypt: (ciphertext: string, password: string) => Promise<string>
	EthCrypto: any
}

type systemInitialization = {
	preferences: any
	passcode: Passcode
}

type CoNETIndexDBInit = {
	id: passInit
	preferences: any
}

type SICommandObj_Command = 'SaaS_Proxy'|'SaaS_Sock5'|'mining'|'mining_validator'

interface SICommandObj {
	command: SICommandObj_Command
	responseError?: string|null
	responseData?: any[]
	algorithm: 'aes-256-cbc'
	Securitykey: string
	requestData: any[]
	walletAddress: string
}

interface ethSignedObj {
	message: string
	messageHash: string
	r: string
	s: string
	signature: string
	v: string
}

// interface CoNETCash_authorized {
// 	id: string
// 	to: string
// 	amount: number
// 	type: 'USDC'
// 	from: string
// }

type clientProfile = {
	armoredPublicKey: string
	gpgPublicKeyID: string
	nickName: string
	profileImg: string
	walletAddr: string
	routerArmoredPublicKey: string
	routerPublicKeyID: string
}
interface urlData {
	href: string
	port: number
	method: string
	json: ArrayBuffer|null
}

type fetchCashStorageData = {
	headers: {
		[key: string]: string | boolean
	}
	body: string
	status: number
	statusText: string
}

interface clientPool {
	clientId: {
		resultingClientId: string
		clientId: string
	}
	siteOrigin: URL
	node: any
}

interface workPromise {
	cmd: IWorker_command
	uuid: string
	_promise: (value: IWorker_command | PromiseLike<IWorker_command>) => void
}

interface urlData {
	href: string
	port: number
	method: string
	json: string
}

type IWorker_command = {
	cmd: WorkerCommand
	data: any[]
	uuid: string
	err?: string
}

interface clientPoolWroker {
	domain: URL
	id: string
	node: any
}

interface requestObj {
    remotePort: number|undefined
    remoteAddress: string|undefined
    targetHost: string|null
    targetPort: number
    methods: string
    uuid: string|undefined
    socks?: string
}

interface VE_IPptpStream {
    type?: string
    buffer: string
    host: string|null
    port: number
    cmd: string
    //ATYP: number
    uuid?: string
    length?:number
    randomBuffer?: Buffer
    ssl: boolean
	order: number
}

type proxyLogs =  {
	hostInfo: string
	ssl: Boolean,
	startTime: number,
	download: number,
	upload: number,
	nodeIpaddress: string,
	endTime: number
}

interface nodesBalance {
	balance: string
	minerAddr: string
}

interface startLivenessSSEData {
	balance: {
		CONETBalance: string
		COTPBalance: string
	}
	masterBalance: masterBalance

	nodesBalance: nodeType[]

}


interface nodeType {
	ip_addr: string
	minerAddr: string
	running: boolean
	wallet_addr: string
	balance: string
	country: string
}

interface masterBalance {
	CNTPMasterBalance: string
	CNTPReferralBalance: string
}

interface node {
	masterBalance: masterBalance
	node: nodeType[]
}

interface getBalanceAPIresult {
	CNTP_Balance: string
	CONET_Balance:string
	Referee: string
	lastTime: number
}
interface blockscout_token {
	address: string
	circulating_market_cap: string
	decimals: string	
	exchange_rate: string
	holders: string
	icon_url: string
	name: string
	symbol: string
	total_supply: string
	type: "ERC-20"|"ERC-721"|"ERC-1155"
}
interface blockscout_address_token {
	token: blockscout_token
	token_id: string
	token_instance: string
	value: string
}
interface blockscout_result {
	items: blockscout_address_token[]
	next_page_params: string
}

interface blockscout_address {
	block_number_balance_updated_at: number
	coin_balance: string
}


type listenState = 'referrer'|'system'|'conet'|'cntp'|'cntp-balance'|'nodes'|'beforeunload'|'toFrontEnd'


interface CONETPlatfromSystemData {
	
}

interface conetPlatform {
	passcode: 'LOCKED'|'UNLOCKED'|'NONE'
}

type command = 'profileVer'|'assets'|'purchaseStatus'|'miningStatus' | 'tokenTransferStatus'
interface channelWroker {
	cmd: command,
	data: any[]
}


/**
 * 
 * 		
 */
interface fragmentsObj {
	localEncryptedText: string
	remoteEncryptedText: string
	fileName: string
}

interface assetsStructure {
	currency_name: string
	timestamp: string
	usd_price: string
}

interface transferTx {
	from: string
	gasLimit: number
	hash: string
	maxFeePerGas: number
	maxPriorityFeePerGas: BigInt
	value: BigInt
	gasPrice: number
	nonce: number
	to: string
	wait: ()=> Promise<any>
}

interface referrals_rate_list {
	cntpRate: string
	referrals: string
	wallet: string
}

interface leaderboardData {
	epoch: number
	free_cntp?: referrals_rate_list[]
	free_referrals?: referrals_rate_list[]
	minerRate?: string
	totalMiner?: string
	free?:referrals_rate_list
	guardian?: referrals_rate_list
}

type ITypeTransferCount = {
	hostInfo: string
	upload: number
	download: number
	startTime: number
	endTime: number
	nodeIpaddress: string
	ssl: boolean
}


//
//			git reset --soft HEAD~[number] to delete commit
interface assetPrice {
	name: string
	price: any
}
interface assetOracle {
	lastUpdate: number
	assets: assetPrice[]
}