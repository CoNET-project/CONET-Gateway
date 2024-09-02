type nodes_info = {
	country: string
	customs_review_total?: number
	ip_addr: string
	last_online: boolean
	lat?: number
	lon?: number
	outbound_total?: number
	region: string
	armoredPublicKey: string
	publicKeyObj?: any
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
type pgpKeyPair = {
	privateKeyArmor: string
	publicKeyArmor: string
	publicKeyObj?: any
	privateKeyObj?: any
}

interface profile extends keyPair {
	isPrimary?: boolean
	pgpKey?: pgpKeyPair
	privateKeyArmor: string
	emailAddr?: string
	hdPath: string
	index: number
	nodeID?: number
	nodeIP_address?: string
	nodeRegion?: string
}

interface proxy {
	restart: (currentProfile: profile, entryNodes: nodes_info[], egressNodes: nodes_info[]) => void
	end: () => Promise<true>
}

export declare const launchDaemon : (port: number, path: string) => void

export declare const proxyServer: (post: string, entryNode: nodes_info, _egressNode: nodes_info, profile: profile) => proxy