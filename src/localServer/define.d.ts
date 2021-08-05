

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

interface keyPair {
	
	publicKeyArmor: string
	privateKeyArmor: string

}
interface worker_command {
	cmd: string
	data?: any
	uuid?: string
	err?: string
}

declare const openpgp
declare const PouchDB
declare const buffer: any