
declare const openpgp
declare const buffer: any
declare const scrypt: any

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
	imapPeer: imapPeer

}

interface Window {
	postMessage(message: any, transfer?: Transferable[]): void;
}

type keyOpenPGP_obj = {
	publicKeyObj: any
	privateKeyObj: any
}

interface keyPair {
	publicKeyArmor: string
	privateKeyArmor: string
	keyID?: string
	keyOpenPGP_obj: keyOpenPGP_obj | null
	_id?: string
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
'PouchDB_ERROR'|'GENERATE_PASSCODE_ERROR'|'FAILURE'|'COUNTDOWN'

declare type WorkerCommand = 'helloWorld'|'READY'|
	'encrypt_TestPasscode'|'encrypt_createPasscode'|'encrypt_lock'|'invitation'|'encrypt_deletePasscode'

type worker_command = {
	cmd: WorkerCommand
	data: any[]
	uuid?: string
	err?: WorkerCommandError
}

interface profile extends keyPair {
    nickname?: string
    keyID?: string
    tags?: string[]
	alias?: string
}

type ColorTheme = 'LIGHT' | 'DARK'
type Language = 'en-CA' | 'fr-CA' | 'ja-JP' | 'zh-CN' | 'zh-TW'
type PasscodeStatus = 'LOCKED' | 'UNLOCKED' | 'NOT_SET'

type encrypt_keys_object = {
    containerKeyPair: keyPair
    keyChain: {
        deviceKeyPair: keyPair
        seguroAccountKeyPair: keyPair
		profiles: profile[]
    }
	toStoreObj: any
	isReady: boolean
	encryptedString: string
}

type Passcode = {
    status: PasscodeStatus
    testPasscode: null
    createPasscode: null
}

interface Preferences {
    colorTheme: ColorTheme
    language: Language
}

interface systemInitialization {
	preferences: Preferences
	profiles: profile []
	passcode: Passcode
}
