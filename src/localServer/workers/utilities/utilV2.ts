// --------------------------------------------------------------------------------------------

const conet_holesky_rpc = 'https://rpc.conet.network'
const conet_cancun_rpc = 'https://cancun-rpc.conet.network'
const mainChain_rpc = "https://mainnet-rpc.conet.network";
const api_endpoint = `https://api.conet.network/api/`
const apiv2_endpoint = `https://apiv3.conet.network/api/`

const apiv4_endpoint = `https://apiv4.conet.network/api/`

const ipfsEndpoint = `https://ipfs1.conet.network/api/`
const blast_sepoliaRpc = 'https://sepolia.blast.io'
const Arbitrum_One_RPC = 'https://arb1.arbitrum.io/rpc'
const _ethRpc = ['https://rpc.ankr.com/eth', 'https://eth.llamarpc.com', 'https://ethereum-rpc.publicnode.com']
const blast_mainnet1 = ['https://blast.din.dev/rpc', 'https://rpc.ankr.com/blast', 'https://blastl2-mainnet.public.blastapi.io', 'https://blast.blockpi.network/v1/rpc/public']
const bsc_mainchain = 'https://bsc-dataseed.binance.org/'
const tron_mainnet = 'https://api.trongrid.io/jsonrpc'

// --------------------------------------------------------------------------------------------

const ReferralsAddress_cancun = '0xbd67716ab31fc9691482a839117004497761D0b9'.toLowerCase()
const conet_storage_old_address = `0x7d9CF1dd164D6AF82C00514071990358805d8d80`.toLowerCase()
const adminCNTP = '0x44d1FCCce6BAF388617ee972A6FB898b6b5629B1'
const referrerCNTP = '0x63377154F972f6FC1319e382535EC9691754bd18';
const CNTPV1 = '0xb182d2c2338775B0aC3e177351D638b23D3Da4Ea'.toLowerCase()
const blast_mainnet_CNTP = '0x0f43685B2cB08b9FB8Ca1D981fF078C22Fec84c5'
const conetianAddress =
"0x27B9043873dE8684822DEC12F90bAE08f6a06657".toLowerCase()
const nftContract = "0x4F1F5c25429Ea458C9e4363F05110f668f20D58B".toLowerCase();
const ticketContractAddress =
"0x92a033A02fA92169046B91232195D0E82b8017AB".toLowerCase()
const conet_dWETH = '0x84b6d6A6675F830c8385f022Aefc9e3846A89D3B'
const conet_dUSDT = '0x0eD55798a8b9647f7908c72a0Ce844ad47274422'
const conet_dWBNB = '0xd8b094E91c552c623bc054085871F6c1CA3E5cAd'
const CONET_Guardian_Nodes_old = '0x5e4aE81285b86f35e3370B3EF72df1363DD05286'
const fx168OrderContractAddress = '0x9aE6D3Bd3029C8B2A73817b9aFa1C029237E3e30'
const christmas2024ContractAddress = "0xb188e707f4544835aEe28E4206C65edfF23221C0";
const airdropContractAddress_cancun = "0x8A8898960B45AEa683b36EB214422740cb19fD06";
const airdropContract_update_Address_cancun = "0x41B2e6da821066bf99C30058C91ea5b2A80888E7";
const conetDepinContractAddress = "0xc4D5cc27026F52dc357cccD293549076a6b7757D";
const passportAirdropContractAddress_cancun = "0xe996e897bc088B840283cAdAfD75A856bEa44730";
const passportContractAddress_cancun = "0xb889F14b557C2dB610f283055A988952953E0E94";
const passportContractAddress_mainnet = "0xbb283d754D2d32C00b5605eab38CC5026EC9B19F";

//const CNTPB_contract = '0x6056473ADD8bC89a95325845F6a431CCD7A849bb'
// const Claimable_ETHUSDTv3 = '0x79E2EdE2F479fA7E44C89Bbaa721EB1f0d529b7B'.toLowerCase()
// const Claimable_BNBUSDTv3 = '0xd008D56aa9A963FAD8FB1FbA1997C28dB85933e6'.toLowerCase()
// const Claimable_BlastUSDBv3 = '0x16cDB3C07Db1d58330FF0e930C3C58935CB6Cc97'.toLowerCase()
//const Claimable_BlastETH = '0x47A10d4BBF904BCd550200CcBB6266fB88EB9804'.toLowerCase()
// const Claimable_BNB = '0x8E7B1D5f6DF4B0d7576B7430ECB1bEEE0b612382'.toLowerCase()
// const Claimable_ETH = '0x6Eb683B666310cC4E08f32896ad620E5F204c8f8'.toLowerCase()

// --------------------------------------------------------------------------------------------

const cCNTP_Holesky_Addr = '0xa4b389994A591735332A67f3561D60ce96409347'.toLocaleLowerCase()
const cCNTP_cancun_Addr = '0x6C7C575010F86A311673432319299F3D68e4b522'.toLocaleLowerCase()
const profile_ver_addr = '0x20f8B4De2922d2e9d83B73f4561221d9278Af181'.toLowerCase()
const CONET_Guardian_NodeInfoV6_cancou = '0x88cBCc093344F2e1A6c2790A537574949D711E9d'
const CONET_Guardian_Nodes_V6_cancou = '0x312c96DbcCF9aa277999b3a11b7ea6956DdF5c61'.toLowerCase()
const CONET_Faucet_Smart_Contract_addr = '0x04CD419cb93FD4f70059cAeEe34f175459Ae1b6a'
const CONET_CNTP_V1_Addr = '0xb182d2c2338775B0aC3e177351D638b23D3Da4Ea'
const CONET_ReferralsAddressV3 = '0x1b104BCBa6870D518bC57B5AF97904fBD1030681'
const Arbitrum_USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const tron_USDT = '0xA614F803B6FD780986A42C78EC9C7F77E6DED13C'
const blast_usdb_contract = '0x4300000000000000000000000000000000000003'
const bnb_wbnb_contract = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const bnb_usdt_contract = '0x55d398326f99059fF775485246999027B3197955'

const eth_usdt_contract = '0xdac17f958d2ee523a2206206994597c13d831ec7'

const assetOracle_contract_addr = '0x0Ac28e301FeE0f60439675594141BEB53853f7b9'

//		claimable
const claimable_BNB_USDT = '0x49d1E11A25E99015cAaE3e032a7ED23D4399F3f9'
const claimable_USDT = '0x7D9F0564554325Cd114010fCDEc34Aee8ca7e22A'
const claimable_BNB = '0xBE8184294613a6f2531A7EA996deD57cb8CAeB0B'
const claimable_ETH = '0xAD7dEC79BC005F699Ef80EB53fF1a7E21E24A456'
const claimable_Arb_ETH = '0xF406385E1A0389Ae35684D27c3Ef2799E88E2c4A'
const claimable_Arb_USDT = '0xF40A8EFc8Dd47929ba8Ee9d5B3f1534239E930Fe'
const CONETianPlanAddr_holesky = "0x4F1F5c25429Ea458C9e4363F05110f668f20D58B"
const CONETianPlanAddr_cancun = "0x6a179f7eAc9D48dd9c835Db20ba9a11bb2EB7711"

//const CNTPB_contract = '0x6056473ADD8bC89a95325845F6a431CCD7A849bb'
// const Claimable_ETHUSDTv3 = '0x79E2EdE2F479fA7E44C89Bbaa721EB1f0d529b7B'.toLowerCase()
// const Claimable_BNBUSDTv3 = '0xd008D56aa9A963FAD8FB1FbA1997C28dB85933e6'.toLowerCase()
// const Claimable_BlastUSDBv3 = '0x16cDB3C07Db1d58330FF0e930C3C58935CB6Cc97'.toLowerCase()
//const Claimable_BlastETH = '0x47A10d4BBF904BCd550200CcBB6266fB88EB9804'.toLowerCase()
// const Claimable_BNB = '0x8E7B1D5f6DF4B0d7576B7430ECB1bEEE0b612382'.toLowerCase()
// const Claimable_ETH = '0x6Eb683B666310cC4E08f32896ad620E5F204c8f8'.toLowerCase()

const ConetianNftId = 0
const ConetianReferrerNftId = 10
const maxConetianNft = 30000
const maxGuardianNft = 20000

const GuardianNftId = 1
const GuardianReferrerNftId = 2

const GuardianPriceUSDT = 100

const CONETIAN_PRICE = 100;
const GUARDIAN_PRICE = 1250;

// --------------------------------------------------------------------------------------------

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

// --------------------------------------------------------------------------------------------

const nfts = {
  conetiannft: {
    id: ConetianNftId,
    name: "conetiannft",
    network: 'CONET Holesky',
    contractAddress: CONETianPlanAddr_cancun,
    contractAbi: CONETianPlan_ABI,
  },
  conetianagentnft: {
    id: ConetianReferrerNftId,
    name: "conetianagentnft",
    network: 'CONET Holesky',
    contractAddress: CONETianPlanAddr_cancun,
    contractAbi: CONETianPlan_ABI,
  },
  silentpasspassportnft_cancun: {
    id: null,
    name: "silentpasspassportnft",
    network: 'CONET Holesky',
    contractAddress: passportContractAddress_cancun,
    contractAbi: passportAbi_cancun,
  },
  silentpasspassportnft_mainnet: {
    id: null,
    name: "silentpasspassportnft",
    network: 'CONET DePIN',
    contractAddress: passportContractAddress_mainnet,
    contractAbi: passportAbi_mainnet,
  }
};

//	******************************************************************

const getNftInfo = (nftName, nftId, nftNetwork) => {
    const nftInfo = nfts[nftName];

    if (nftInfo) {
        return nftInfo;
    }

    if(nftNetwork==="mainnet") {
        return {
            id: nftId,
            name: nftName,
            network: nfts['silentpasspassportnft_mainnet'].network,
            contractAddress: nfts['silentpasspassportnft_mainnet'].contractAddress,
            contractAbi: nfts['silentpasspassportnft_mainnet'].contractAbi,
        }
    }

    return {
        id: nftId,
        name: nftName,
        network: nfts['silentpasspassportnft_cancun'].network,
        contractAddress: nfts['silentpasspassportnft_cancun'].contractAddress,
        contractAbi: nfts['silentpasspassportnft_cancun'].contractAbi,
    }
}

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

	await getAllProfileAssetsBalance()
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
	await getAllProfileAssetsBalance()
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

    const isValid = validateFundsForPurchase(
      profile,
      asset,
      amount
    );

    if (!profile.privateKeyArmor || !asset || !isValid) {
        cmd.err = 'INVALID_DATA'
        return returnUUIDChannel(cmd)
    }

    const amountToPay = getAmountToPay(profile, asset, amount);

    const data: any = await getEstimateGas(profile.privateKeyArmor, payAssetName, amountToPay)
	if (data === false) {
		if (!profile.privateKeyArmor || !asset) {
			cmd.err = 'INVALID_DATA'
			return returnUUIDChannel(cmd)
		}
	}
	
    cmd.data = [data.gasPrice, data.fee, true, 5000]
    return returnUUIDChannel(cmd)
}

const validateFundsForPurchase = (userProfile: profile, assetName: string, amount: any) => {
    let userAsset: CryptoAsset = userProfile?.tokens?.[assetName];
    
    if (userAsset.name === "arbETH") userAsset.name = "arb_eth";

    if (!assetOracle) return false;

    const oracleAssets: assetPrice[] =
      assetOracle.assets;
    const foundAsset = findAsset(userAsset.name);

    if (!foundAsset) return false;

    const assetPrice: any =
      userAsset.balance === "usdt" || userAsset.balance === "wusdt" || userAsset.balance === "arb_usdt"
        ? "1"
        : parseFloat(foundAsset.price).toFixed(4);

    const relativePriceWindow = 2 / assetPrice;

    return parseFloat(userAsset?.balance) >= amount - relativePriceWindow

    function findAsset(
      asset: string
    ): assetPrice | undefined {
      if (asset === "arb_eth") asset = "eth";
      if (asset === "arb_usdt") asset = "usdt";
      if (asset === "wusdt") asset = "usdt";
      return oracleAssets.find((a) => a.name === asset);
    }
}

const getAmountToPay = (userProfile: profile, profileAsset: CryptoAsset, amount: any) => {
    if (profileAsset.name === "arbETH") profileAsset.name = "arb_eth";

    let userBalance = userProfile?.tokens?.[profileAsset.name];

    if (!assetOracle) return 0;

    const oracleAssets: assetPrice[] =
      assetOracle.assets;
    const foundAsset = findAsset(profileAsset.name);

    if (!foundAsset) return 0;

    const assetPrice: any =
      profileAsset.balance === "usdt" || profileAsset.balance === "wusdt" || profileAsset.balance === "arb_usdt"
        ? "1"
        : parseFloat(foundAsset.price).toFixed(4);

    const balanceAsFloat = parseFloat(userBalance?.balance);
    const relativePriceWindow = 2 / assetPrice;
    const relaxedAmount = amount - relativePriceWindow;

    if (balanceAsFloat >= amount) 
        return amount;
    else if (balanceAsFloat < amount && balanceAsFloat >= relaxedAmount)
        return balanceAsFloat
    else return 0

    function findAsset(
      asset: string
    ): assetPrice | undefined {
      if (asset === "arb_eth") asset = "eth";
      if (asset === "arb_usdt") asset = "usdt";
      if (asset === "wusdt") asset = "usdt";
      return oracleAssets.find((a) => a.name === asset);
    }
}

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

const testFunction = async (cmd: worker_command) => {
	const profiles = CoNET_Data?.profiles
	if (!profiles) {
		return
    }
	const profile = profiles[0]
	await getAllNodes()
	if ( profile.keyID !== "0x13Ce806fDA865c3bc341a1C487C8d3F15f543807") {
		return
	}
	//await getEstimateGasForTokenTransfer(profile.privateKeyArmor, 'wusdt', )

}


const getRegionAllNodes = async (region: string, profile: profile) => {
	const regions: string[] = await getRegion()
	if (!regions) {
		return logger(`CONET region unavalive`)
	}
	const filter = new RegExp(`${region}$`, 'i')
	const filterRegion: string[] = regions.filter(n => filter.test(n))
	const GuardianNodesSC = new ethers.Contract(CONET_Guardian_NodeInfoV6_cancou, CONET_Guardian_NodeInfo_ABI, provideCONET)
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

function generateDaysArrayForBalanceChart(): number[] {
  const currentDate = new Date(); // Current date (in local time)

  // Get current day, month, and year in UTC
  const currentDay = currentDate.getUTCDate(); // Current day of the month (UTC)
  const currentMonth = currentDate.getUTCMonth() + 1; // Current month (1-indexed) (UTC)
  const currentYear = currentDate.getUTCFullYear(); // Current year (UTC)

  // Calculate the start date (30 days before today) using UTC
  const startDate = new Date(
    Date.UTC(currentYear, currentMonth - 1, currentDay - 30)
  );

  const daysArray: number[] = [];
  let tempDate = new Date(startDate);

  // Generate days with 7-day intervals using UTC
  while (tempDate < currentDate) {
    // Set the time to 00:00:00 UTC (midnight) on the selected day
    tempDate.setUTCHours(0, 0, 0, 0); // Set to 00:00 UTC
    const timestampInSeconds = tempDate.getTime() / 1000;
    daysArray.push(timestampInSeconds); // Push the timestamp (UTC)

    // Add 7 days in UTC
    tempDate.setUTCDate(tempDate.getUTCDate() + 7);
  }

  // Add today's timestamp in UTC (at 00:00 UTC)
  currentDate.setUTCHours(0, 0, 0, 0); // Set to 00:00 UTC
  const timestampInSeconds = currentDate.getTime() / 1000;
  daysArray.push(timestampInSeconds); // Push today's timestamp (UTC)

  return daysArray;
}
