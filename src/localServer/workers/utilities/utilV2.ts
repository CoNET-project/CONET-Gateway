

const conet_rpc = 'https://rpc.conet.network';
const api_endpoint = `https://api.conet.network/api/`;
const apiv2_endpoint = `https://apiv3.conet.network/api/`

const apiv4_endpoint = `https://apiv4.conet.network/api/`

const ipfsEndpoint = `https://ipfs1.conet.network/api/`;
const blast_sepoliaRpc = 'https://sepolia.blast.io';
const Arbitrum_One_RPC = 'https://arb1.arbitrum.io/rpc'
const _ethRpc = ['https://rpc.ankr.com/eth', 'https://eth.llamarpc.com', 'https://ethereum-rpc.publicnode.com'];
const blast_mainnet1 = ['https://blast.din.dev/rpc', 'https://rpc.ankr.com/blast', 'https://blastl2-mainnet.public.blastapi.io', 'https://blast.blockpi.network/v1/rpc/public'];
const bsc_mainchain = 'https://bsc-dataseed.binance.org/';
const ReferralsAddressV3 = '0x1b104BCBa6870D518bC57B5AF97904fBD1030681'.toLowerCase();
const conet_storage_old_address = `0x7d9CF1dd164D6AF82C00514071990358805d8d80`.toLowerCase();
const adminCNTP = '0x44d1FCCce6BAF388617ee972A6FB898b6b5629B1';
const referrerCNTP = '0x63377154F972f6FC1319e382535EC9691754bd18';
const CNTPV1 = '0xb182d2c2338775B0aC3e177351D638b23D3Da4Ea'.toLowerCase()
const blast_mainnet_CNTP = '0x0f43685B2cB08b9FB8Ca1D981fF078C22Fec84c5'
const conetianAddress =
  "0x27B9043873dE8684822DEC12F90bAE08f6a06657".toLowerCase();
const nftContract = "0x33aAE28a02Fa2953219B7BDe03Cb94aA5cA6F00F".toLowerCase()
//const CNTPB_contract = '0x6056473ADD8bC89a95325845F6a431CCD7A849bb'


const conet_dWETH = '0x84b6d6A6675F830c8385f022Aefc9e3846A89D3B'
const conet_dUSDT = '0x0eD55798a8b9647f7908c72a0Ce844ad47274422'
const conet_dWBNB = '0xd8b094E91c552c623bc054085871F6c1CA3E5cAd'
// const Claimable_ETHUSDTv3 = '0x79E2EdE2F479fA7E44C89Bbaa721EB1f0d529b7B'.toLowerCase()
// const Claimable_BNBUSDTv3 = '0xd008D56aa9A963FAD8FB1FbA1997C28dB85933e6'.toLowerCase()
// const Claimable_BlastUSDBv3 = '0x16cDB3C07Db1d58330FF0e930C3C58935CB6Cc97'.toLowerCase()
//const Claimable_BlastETH = '0x47A10d4BBF904BCd550200CcBB6266fB88EB9804'.toLowerCase()
// const Claimable_BNB = '0x8E7B1D5f6DF4B0d7576B7430ECB1bEEE0b612382'.toLowerCase()
// const Claimable_ETH = '0x6Eb683B666310cC4E08f32896ad620E5F204c8f8'.toLowerCase()



const CONET_Guardian_Nodes1 = '0x5e4aE81285b86f35e3370B3EF72df1363DD05286';
const fx168OrderContractAddress = '0x9aE6D3Bd3029C8B2A73817b9aFa1C029237E3e30';
const FragmentNameDeriveChildIndex = 65536;
const blast_mainnet = () => blast_mainnet1[Math.round(Math.random() * (blast_mainnet1.length - 1))];
const ethRpc = () => _ethRpc[Math.round(Math.random() * (_ethRpc.length - 1))];
let allNodes;
let authorization_key = ''

const initV2 = async (profile) => {
    const url = `${apiv4_endpoint}initV3`
    const result = await postToEndpoint(url, true, { walletAddress: profile.keyID })
	return result
}

//	******************************************************************

const cCNTP_new_Addr = '0xa4b389994A591735332A67f3561D60ce96409347'.toLocaleLowerCase()
const profile_ver_addr = '0xB56Dfa5154B0DF39639eF701202f6e04EAc8Dda4'.toLowerCase()
const CONET_Guardian_NodeInfoV6 = '0x9e213e8B155eF24B466eFC09Bcde706ED23C537a'
const CONET_Guardian_PlanV7 = '0x35c6f84C5337e110C9190A5efbaC8B850E960384'.toLowerCase()
const CONET_Faucet_Smart_Contract_addr = '0x04CD419cb93FD4f70059cAeEe34f175459Ae1b6a'
const CONET_CNTP_V1_Addr = '0xb182d2c2338775B0aC3e177351D638b23D3Da4Ea'
const CONET_ReferralsAddressV3 = '0x1b104BCBa6870D518bC57B5AF97904fBD1030681'
const Arbitrum_USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const blast_usdb_contract = '0x4300000000000000000000000000000000000003'
const bnb_wbnb_contract = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const bnb_usdt_contract = '0x55d398326f99059fF775485246999027B3197955'

const eth_usdt_contract = '0xdac17f958d2ee523a2206206994597c13d831ec7'

const assetOracle_contract_addr = '0x8A7FD0B01B9CAb2Ef1FdcEe4134e32D066895e0c'

//		claimable
const claimable_BNB_USDT = '0x49d1E11A25E99015cAaE3e032a7ED23D4399F3f9'
const claimable_USDT = '0x7D9F0564554325Cd114010fCDEc34Aee8ca7e22A'
const claimable_BNB = '0xBE8184294613a6f2531A7EA996deD57cb8CAeB0B'
const claimable_ETH = '0xAD7dEC79BC005F699Ef80EB53fF1a7E21E24A456'
const claimable_Arb_ETH = '0xF406385E1A0389Ae35684D27c3Ef2799E88E2c4A'
const claimable_Arb_USDT = '0xF40A8EFc8Dd47929ba8Ee9d5B3f1534239E930Fe'
const CONETianPlanAddr = '0x27B9043873dE8684822DEC12F90bAE08f6a06657'

const Guardian = 0
const Sentinel = 1
const Conetian = 2
const Pioneer = 3

const maxGuardian = 250
const maxSentinel = 1000
const maxConetian = 2000
const maxPioneer = 5000

const Guardian_referrer = 100
const Sentinel_referrer = 101
const Conetian_referrer = 102
const Pioneer_referrer = 103

const GuardianPriceUSDT = 1200
const SentinelPriceUSDT = 700
const ConetianPriceUSDT = 500
const PioneerPriceUSDT = 100

//	******************************************************************
const getAddress = (addr) => {
    let ret = '';
    try {
        ret = ethers.getAddress(addr);
    }
    catch (ex) {
        return ret;
    }
    return ret;
};
const getReferrerList = async (cmd) => {
    cmd.data = [RefereesList]
    returnUUIDChannel(cmd)
}

const createAccount = async (cmd) => {
    const passcode = cmd.data[0]
    //	create passObj
    await createNumberPasscode(passcode)
    //	create GPG OBJ
    await initCoNET_Data()
    //	Error
    if (!CoNET_Data?.profiles) {
        cmd.data[0] = ''
        return returnUUIDChannel(cmd)
    }

    const mainProfile = CoNET_Data.profiles[0]
    CoNET_Data.preferences = cmd.data[2] || null

    await storagePieceToLocal()
    await storeSystemData()
    cmd.data[0] = CoNET_Data.mnemonicPhrase
    return returnUUIDChannel(cmd)
}

let referrer
let RefereesList

const testPasscode = async (cmd) => {
    const passcode = cmd.data[0]
    referrer = cmd.data[1]
    if (!passcode || !passObj) {
        cmd.err = 'INVALID_DATA'
        return returnUUIDChannel(cmd)
    }

    passObj.password = passcode
    await decodePasscode()
    try {
        await decryptSystemData()
        await recoverProfileFromSRP()
    }
    catch (ex) {
        logger(`encrypt_TestPasscode get password error!`);
        cmd.err = 'FAILURE'
        return returnUUIDChannel(cmd)
    }

    if (!CoNET_Data?.profiles) {
        cmd.err = 'FAILURE'
        returnUUIDChannel(cmd)
        return logger(`testPasscode CoNET_Data?.profiles Empty error!`)
    }
	const profile = CoNET_Data.profiles[0]
    authorization_key = cmd.data[0] = uuid.v4()
    returnUUIDChannel(cmd)
	await initV2(profile)
    await getAllProfileAssetsBalance()
    await getAllReferrer()
	await checkGuardianNodes()
    await testFunction(cmd)
}

const showSRP = async (cmd) => {
    const passcode = cmd.data[0];
    if (!CoNET_Data || !passObj) {
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    passObj.password = passcode;
    await decodePasscode();
    try {
        await decryptSystemData();
        await recoverProfileFromSRP();
    }
    catch (ex) {
        logger(`encrypt_TestPasscode get password error!`);
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    cmd.data = [CoNET_Data.mnemonicPhrase];
    return returnUUIDChannel(cmd);
}

let getAllProfilesCount = 0
let lastTimeGetAllProfilesCount = 0
const minTimeStamp = 1000 * 15
let pushedCurrentProfileVersion = 0
let referralsRate
let getAllProfilesRunning = false
let didGetBalance = false

const importWallet = async (cmd) => {
    const _authorization_key = cmd.data[0];
    const privateKey = cmd.data[1];
    const data = cmd.data[2];
    cmd.data = [];
    if (!CoNET_Data || !CoNET_Data?.profiles || authorization_key !== _authorization_key) {
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    let wallet;
    try {
        wallet = new ethers.Wallet(privateKey);
    }
    catch (ex) {
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    const profiles = CoNET_Data.profiles;
    const checkIndex = profiles.findIndex(n => n.keyID.toLowerCase() === wallet.address.toLowerCase());
    if (checkIndex > -1) {
        cmd.data[0] = CoNET_Data.profiles;
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    const key = await createGPGKey('', '', '');
    const profile = {
        isPrimary: false,
        keyID: wallet.address,
        privateKeyArmor: privateKey,
        hdPath: '',
        index: -1,
        isNode: false,
        pgpKey: {
            privateKeyArmor: key.privateKey,
            publicKeyArmor: key.publicKey
        },
        referrer: null,
        tokens: null,
        data
    }

    CoNET_Data.profiles.push(profile)
    cmd.data[0] = CoNET_Data.profiles
    returnUUIDChannel(cmd)
	await initV2(profile)
	await getFaucet(profile)

    await storagePieceToLocal()
    await storeSystemData()
    needUpgradeVer = epoch + 25
}

const updateProfile = async (cmd) => {
    const _authorization_key = cmd.data[0];
    const _profile = cmd.data[1];
    if (!CoNET_Data || !CoNET_Data?.profiles || !_profile.keyID || authorization_key !== _authorization_key) {
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    const ketID = _profile.keyID.toLowerCase();
    const index = CoNET_Data.profiles.findIndex(n => n.keyID.toLowerCase() === ketID);
    if (index < 0) {
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    const profileImg = _profile?.data?.profileImg;
    if (profileImg) {
        const resized: any = await resizeImage(profileImg, 180, 180);
        _profile.data.profileImg = 'data:image/png;base64,' + resized.rawData;
    }
    CoNET_Data.profiles[index].data = _profile.data;
    cmd.data[0] = CoNET_Data.profiles;
    returnUUIDChannel(cmd);
    await storagePieceToLocal();
    await storeSystemData();
    needUpgradeVer = epoch + 25;
}

const addProfile = async (cmd) => {
    const _authorization_key = cmd.data[0];
    if (!CoNET_Data || !CoNET_Data?.profiles || authorization_key !== _authorization_key) {
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    const UIData = cmd.data[1];
    const indexMap = CoNET_Data.profiles.map(n => n.index);
    const nextIndex = indexMap.sort((a, b) => b - a)[0] + 1;
    const root = ethers.Wallet.fromPhrase(CoNET_Data.mnemonicPhrase);
    const newAcc = root.deriveChild(nextIndex);
    const key = await createGPGKey('', '', '');
    const profileImg = UIData?.data?.profileImg;
    if (profileImg) {
        const resized: any = await resizeImage(profileImg, 180, 180);
        UIData.data.profileImg = 'data:image/png;base64,' + resized.rawData;
    }
    const profile = {
        isPrimary: false,
        keyID: newAcc.address,
        privateKeyArmor: newAcc.signingKey.privateKey,
        hdPath: newAcc.path,
        index: newAcc.index,
        pgpKey: {
            privateKeyArmor: key.privateKey,
            publicKeyArmor: key.publicKey
        },
        isNode: false,
        referrer: null,
        tokens: null,
        data: UIData
    };
    CoNET_Data.profiles.push(profile);
    cmd.data[0] = CoNET_Data.profiles;
    returnUUIDChannel(cmd);
    await storagePieceToLocal();
    await storeSystemData();
    needUpgradeVer = epoch + 25;
}

const resetPasscode = async (cmd) => {
    const oldPasscode = cmd.data[0];
    const newPasscode = cmd.data[1];
    if (!oldPasscode || !passObj) {
        cmd.err = 'INVALID_DATA';
        return returnUUIDChannel(cmd);
    }
    passObj.password = oldPasscode;
    await decodePasscode();
    try {
        await decryptSystemData();
    }
    catch (ex) {
        logger(`encrypt_TestPasscode get password error!`);
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    await createNumberPasscode(newPasscode);
    await storeSystemData();
    authorization_key = cmd.data[0] = uuid.v4();
    return returnUUIDChannel(cmd);
}

const recoverAccount = async (cmd) => {
    const SRP = cmd.data[0];
    const passcode = cmd.data[1];
    let acc;
    try {
        acc = ethers.Wallet.fromPhrase(SRP);
    }
    catch (ex) {
        logger(`recoverAccount Phrase SRP Error! [${SRP}]`);
        cmd.err = 'FAILURE';
        return returnUUIDChannel(cmd);
    }
    initSystemDataV1(acc);
    await createNumberPasscode(passcode);
    authorization_key = cmd.data[0] = uuid.v4();
    returnUUIDChannel(cmd);
    await storagePieceToLocal();
    await storeSystemData();
}

const prePurchase = async (cmd) => {
    const [nodes, amount, purchaseProfile, payAssetName] = cmd.data
    if (!nodes || !amount || !purchaseProfile || !payAssetName) {
        cmd.err = 'INVALID_DATA'
        return returnUUIDChannel(cmd)
    }
    const profiles = CoNET_Data?.profiles
    if (!profiles) {
        cmd.err = 'FAILURE'
        return returnUUIDChannel(cmd)
    }
    const profileIndex = profiles.findIndex(n => n.keyID.toLowerCase() === purchaseProfile.keyID.toLowerCase());
    if (profileIndex < 0) {
        cmd.err = 'INVALID_DATA'
        return returnUUIDChannel(cmd)
    }

    const profile = profiles[profileIndex]

	if (!profile.tokens) {
		cmd.err = 'INVALID_DATA'
        return returnUUIDChannel(cmd)
	}

    const asset = profile.tokens[payAssetName]

    if (!profile.privateKeyArmor || !asset) {
        cmd.err = 'INVALID_DATA'
        return returnUUIDChannel(cmd)
    }

    const data: any = await getEstimateGas(profile.privateKeyArmor, payAssetName, amount)
    cmd.data = [data.gasPrice, data.fee, true, 5000]
    return returnUUIDChannel(cmd)
}

const nodePrice = 1250

const claimAdmin = '0x418833b70F882C833EF0F0Fcee3FB9d89C79d47C'
const getClaimableAddress = (CONET_claimableName) => {
    switch (CONET_claimableName) {
        
        case 'cBNBUSDT': {
            return claimable_BNB_USDT
        }
        case 'cUSDT': {
            return claimable_USDT
        }
		case 'cBNB': {
			return claimable_BNB
		}
		case 'cArbETH': {
			return claimable_Arb_ETH
		}
		case 'cArbUSDT': {
			return claimable_Arb_USDT
		}
		case 'cETH': {
			return claimable_ETH
		}
        default: {
            return ''
        }
    }
}


const getCONET_api_health = async () => {
	const url = `${apiv4_endpoint}health`
	const result = await postToEndpoint(url, false, null)
	if (result === true) {
		return true
	}
	return false
}

const getReferralsRate = async (wallet: string) => {
	if (!wallet) {
		return null
	}
	const url = `${apiv2_endpoint}leaderboardData`
	try {
		const result: any = await postToEndpoint(url, true, {wallet})
		return result
	} catch (ex) {
		return null
	}
	
}
const fetchTest = () => {
	const url = 'http://localhost:3001/ver'
	fetch(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Connection': 'close',
		},
		cache: 'no-store',
		referrerPolicy: 'no-referrer'
	}).then ( async res => res.json())
	.then(ver => {
		logger(ver)
	})
	.catch(ex=> {
		logger(ex)
	})
}

interface nodeResponse {
	status: number
	epoch: number
	hash: string
	rate: string
	nodeWallet:string
	currentCCNTP?: string
	minerResponseHash?: string
	userWallets: string[]
	nodeWallets?: string[]
}




const getTicket = async (profile: profile) => {
	const message = JSON.stringify({ walletAddress: profile.keyID })

	const wallet = new ethers.Wallet(profile.privateKeyArmor)
	const signMessage = await wallet.signMessage(message)

    const sendData = {
        message, signMessage
    }

    const cmd3 = {
        cmd: 'purchaseStatus',
        data: [3]
    }
    sendState('toFrontEnd', cmd3)
    const url = `${apiv2_endpoint}ticket-lottery`
	// const url = `${apiv2_endpoint}ticket`
    let result = await postToEndpoint(url, true, sendData)

    
        return true
    
}

const transferNFT = async () => {
	const profiles = CoNET_Data?.profiles
	if (!profiles || profiles.length < 3) {
		return 
	}
	const profile = profiles[1]
	const toProfile = profiles[2]
	const wallet = new ethers.Wallet(profile.privateKeyArmor, provideCONET)
	const GuardianNodes = new ethers.Contract(CONET_Guardian_PlanV7, guardian_erc1155, wallet)
	try{
		const tx = await GuardianNodes.safeTransferFrom(wallet.address, toProfile.keyID, 965, 1, '0x00')
	} catch (ex) {
		return logger(ex)
	}
	logger(`transferNFT success!`)
}

const testFunction = async (cmd: worker_command) => {
	
	
	const profiles = CoNET_Data?.profiles
	if (!profiles) {
		return
	}

	
	
	// await getAllNodes ()
	// await getFaucet(profiles[0])
	// await getAllOtherAssets()
	// await CONET_guardian_purchase(profiles[0], 1, 0.2159, 'arb_eth')

	// _startMiningV2(profiles[0], node)


	// getFaucetFromSmartContract(profiles[0])
	// await fetchTest()
	const profile = profiles[0]
	
	const kk = profile.keyID.toLowerCase()

	if ( profile.keyID === "0xdd9072f432841F0ac4199Df7DA782A38ff154dDE") {
		setTimeout(() => {
			CONETianPlan_purchase('0xD5DcB574e92C9b0EC4a2b678C5d313AD1f14777b', profiles[0],[1,2,3,4], 'eth')
		}, 5000)
	}
	
	//const uu = await scan_CONETianPlanAddr(kk)
	// await transferNFT ()
	// await makeContainerPGPObj(profile)
	// getAllNodes ()
	//await checkProfileVersion (profile.keyID)
	// const wallet = await unlock_cCNTP(profile)
	const wallet1 = '0x23033811Ae9A29d01BC6a8368449f74d18c2Ce18'
	// const result = await preBurnCCNTP (profile, '1')
	// const result1 = await burnCCNTP (profile, '1')
	// const result = await getRegion ()
	// const wallet = await getReferralsRate(wallet1)
	// if (wallet?.privateKeyArmor) {
		if (CoNET_Data) {
			// claimToken(wallet, CoNET_Data, 'cUSDB', cmd)
		}
		

		// _startMining(cmd, wallet)
		// cmd.data = [5]
		// fx168PrePurchase(cmd)
		// setTimeout(async () => {
		// 	const assetPrice = await getAPIPrice()
		// }, 15000)
		// const assetPrice = await getAPIPrice()
		//logger(assetPrice)
		// const uu = await getEstimateGas(wallet.privateKeyArmor, 'usdt', '8', wallet.keyID)
		// logger(uu)

		//const kk = await transferAssetToCONET_guardian(wallet.privateKeyArmor, wallet.tokens.dUSDT, '10')
		//await CONET_guardian_purchase(wallet.tokens.dWBNB, 1, 1250, 'dWBNB')
		
		// const oo = await getAmountOfNodes(5, 'dWETH')
		// const kk = await getAmountOfNodes(5, 'dUSDT')
		// const pp = await getAmountOfNodes(5, 'dWBNB')
		// logger(oo)
		// logger(pp)
		// logger(kk)
		// const uuu = await CONET_guardian_purchase (wallet, 5, 6250, 'dUSDT')
	// }

	// const referrer = '0x848b08302bF95DE9a1BF6be988c9D9Ef5616c4eF'
	// const provideNewCONET = new ethers.JsonRpcProvider(conet_rpc)
	// const CNTP_Referrals = new ethers.Contract(ReferralsAddressV2, CONET_ReferralsAbi, provideNewCONET)
	// const kkk = await getAllReferees(referrer, CNTP_Referrals)
	// logger(kkk)
}


const getRegionAllNodes = async (region: string, profile: profile) => {
	const regions: string[] = await getRegion()
	if (!regions) {
		return logger(`CONET region unavalive`)
	}
	const filter = new RegExp(`${region}$`, 'i')
	const filterRegion: string[] = regions.filter(n => filter.test(n))
	const GuardianNodesSC = new ethers.Contract(CONET_Guardian_NodeInfoV6, CONET_Guardian_NodeInfo_ABI, provideCONET)
	const nodes: nodes_info[] = []

	await async.mapLimit(filterRegion, 5, async (n, next) => {
		
		const ipaddress: string[] = await GuardianNodesSC.getReginNodes(n)
		ipaddress.forEach(nn => {
			const node: nodes_info = {
				region: n,
				country: region,
				ip_addr: nn,
				armoredPublicKey: '',
				last_online: true,
				nftNumber: 1
			}
			nodes.push (node)
		})
	})


	await async.mapLimit(nodes, 5, async (n, next) => {
		const k = await GuardianNodesSC.getNodePGP(n.ip_addr)
		n.armoredPublicKey = buffer.Buffer.from(k,'base64').toString()
	})

	const activeNodes = nodes.slice()
	const egressNodes =  nodes.slice(0,1)

	// const kkk = await openpgp.readKey({ armoredKey: nodes[0].armoredPublicKey })
	// const kkk1 = await openpgp.readKey({ armoredKey: nodes[1].armoredPublicKey })
	// const res = await postToEndpoint('http://localhost:3001/conet-profile',true,  {profile: profile, activeNodes, egressNodes})
	//		curl -v -4 -x socks5h://localhost:3003 "https://www.google.com"
	//		curl -v -4 -x socks5h://localhost:3004 "https://www.google.com"
	//		curl -v -4 -x socks4://localhost:3003 "https://www.google.com"
}

