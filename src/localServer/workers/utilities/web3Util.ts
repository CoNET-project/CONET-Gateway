const getRegion = async () => {

    const regionContract = new ethers.Contract(CONET_Guardian_NodeInfoV6_cancou, CONET_Guardian_NodeInfo_ABI, provideCONET)
    try {
        const gasPrice = await regionContract.getAllRegions()
        return gasPrice
    }
    catch (ex) {
        logger(ex)
        return null
    }
}

const registerReferrer = async (referrer) => {
    if (!CoNET_Data?.profiles) {
        logger(`registerReferrer CoNET_Data?.profiles Empty error!`)
        return false
    }

    const profile = CoNET_Data.profiles[0]
    if (!profile || !referrer) {
        return false
    }

    if (referrer.toLowerCase() === profile.keyID.toLowerCase()) {
        return false
    }

    const provideNewCONET = new ethers.JsonRpcProvider(conet_cancun_rpc)
    const wallet = new ethers.Wallet(profile.privateKeyArmor, provideNewCONET)
    const CNTP_Referrals = new ethers.Contract(CONET_ReferralsAddressV3, CONET_ReferralsAbi, wallet)
    try {
        const ref = await CNTP_Referrals.getReferrer(profile.keyID)
        if (ref === '0x0000000000000000000000000000000000000000') {
            const tx = await CNTP_Referrals.addReferrer(referrer)
			const tr = await tx.wait()
			if (!tr) {
				logger(`CNTP_Referrals.addReferrer got error`)
				return false
			}
        }
    } catch (ex) {
        return false
    }

    profile.referrer = referrer
    return true
}

const preBurnCCNTP = async (profile, totalBurn) => {
    const provideCONET = new ethers.JsonRpcProvider(conet_cancun_rpc)
    const walletObj = new ethers.Wallet(profile.privateKeyArmor, provideCONET)
    const erc20 = new ethers.Contract(cCNTP_cancun_Addr, blast_CNTPAbi, walletObj)
    let total
    try {
        const gasPrice = await provideCONET.getFeeData()
        const gasFees = await erc20.burn.estimateGas(parseEther(totalBurn, 'ccntp'))
        total = gasPrice.gasPrice * gasFees
    }
    catch (ex) {
        return false
    }
    return ethers.formatEther(total)
}

const burnCCNTP = async (profile, totalBurn) => {
	
    const walletObj = new ethers.Wallet(profile.privateKeyArmor, provideCONET)
    const erc20 = new ethers.Contract(cCNTP_cancun_Addr, blast_CNTPAbi, walletObj)
    const value = parseEther(totalBurn, 'ccntp')
    let tx
    try {
        const ts  = await erc20.burn(value)
		tx = await ts.wait()
    }
    catch (ex) {
        return false
    }

    
    // const [_tx1] = await Promise.all([
    //     provideCONET.getTransactionReceipt(tx.hash),
    //     //provideCONET.getTransaction(tx.hash)
    // ])

    const kk1: CryptoAssetHistory = {
        status: 'Confirmed',
        Nonce: tx.nonce,
        to: tx.to,
        transactionFee: stringFix(ethers.formatEther(parseFloat(tx.gasUsed)*parseFloat(tx.gasPrice))),
        gasUsed: tx.gasUsed.toString(),
        isSend: true,
        value: ethers.formatEther(value),
        time: new Date().toISOString(),
        transactionHash: tx.hash,
        cCNTPBurn: true,
        epoch: tx.blockNumber,
        rate: leaderboardData.minerRate
    }

    profile.tokens.cCNTP.history.push(kk1);
    if (!profile.pgpKey) {
        logger(`burnCCNTP profile.pgpKey Error!`)
        return kk1
    }
    return kk1
}

const MaxNodesLength = 10

const getRandomNode = (allNode: nodes_info[]) => {
	const resultNode: nodes_info[] = JSON.parse(JSON.stringify(allNode))

	do {
		const start =  Math.floor((resultNode.length-1) * Math.random())
		resultNode.splice(start, 1)
	} while (resultNode.length > MaxNodesLength)

	return resultNode
}

const startSilentPass = async (profile: profile, entryRegion: string, egressRegion: string): Promise<Object | false> => {
	if (!profile) {
        logger(`startSilentPass profile is null Error!`)
		return false 
	}
	if (!entryRegion) {
        logger(`startSilentPass entry region is null Error!`)
		return false
	}
    if (!egressRegion) {
      logger(`startSilentPass egress region is null Error!`);
      return false;
    }

    const regions: string[] = await getRegion()
	if (!regions) {
        logger(`CONET region unavailable`)
		return false 
	}

	const entryFilter = new RegExp(`${entryRegion}$`, 'i')
	const entryFilterRegion: string[] = regions.filter(n => entryFilter.test(n))
	const egressFilter = new RegExp(`${egressRegion}$`, 'i')
	const egressFilterRegion: string[] = regions.filter(n => egressFilter.test(n))
    
	const GuardianNodesSC = new ethers.Contract(CONET_Guardian_NodeInfoV6_cancou, CONET_Guardian_NodeInfo_ABI, provideCONET)
	const entryNodes: nodes_info[] = []
	const egressNodes: nodes_info[] = []

	await async.mapLimit(entryFilterRegion, 5, async (n, next) => {
		const ipaddress: string[] = await GuardianNodesSC.getReginNodes(n)
		ipaddress.forEach(nn => {
			const node: nodes_info = {
				region: n,
				country: entryRegion,
				ip_addr: nn,
				armoredPublicKey: '',
				last_online: true,
				nftNumber: 1
			}
			entryNodes.push(node)
		})
	})

	await async.mapLimit(egressFilterRegion, 5, async (n, next) => {
		const ipaddress: string[] = await GuardianNodesSC.getReginNodes(n)
		ipaddress.forEach(nn => {
			const node: nodes_info = {
				region: n,
				country: egressRegion,
				ip_addr: nn,
				armoredPublicKey: '',
				last_online: true,
				nftNumber: 1
			}
			egressNodes.push(node)
		})
	})

	await async.mapLimit(entryNodes, 5, async (n, next) => {
		const k = await GuardianNodesSC.getNodePGP(n.ip_addr)
		n.armoredPublicKey = buffer.Buffer.from(k,'base64').toString()
	})

	await async.mapLimit(egressNodes, 5, async (n, next) => {
		const k = await GuardianNodesSC.getNodePGP(n.ip_addr)
		n.armoredPublicKey = buffer.Buffer.from(k,'base64').toString()
	})



	const activeEntryNodes =getRandomNode(entryNodes)	 //entryNodes
	const activeEgressNodes =getRandomNode(egressNodes)  //egressNodes

	await postToEndpoint('http://localhost:3001/conet-profile',true,  {profile, activeNodes: activeEntryNodes, egressNodes: activeEgressNodes})

    return {status: 'Confirmed'}
}

let provideBlastMainChain = null
let provideETH = null
let provideBNB = null
let provideArbOne = null
let provideTron = null

const getProfileAssets_allOthers_Balance = async (profile: profile) => {
    const key = profile.keyID
    if (key) {
		if (!provideBlastMainChain) {
			provideBlastMainChain = new ethers.JsonRpcProvider(blast_mainnet())
		}

		if (!provideETH) {
			provideETH = new ethers.JsonRpcProvider(ethRpc())
		}
		
		if (!provideBNB) {
			provideBNB = new ethers.JsonRpcProvider(bsc_mainchain)
		}

		if (!provideTron) {
			provideTron = new ethers.JsonRpcProvider(tron_mainnet)
		}

		if (!provideArbOne) {
			provideArbOne = new ethers.JsonRpcProvider(Arbitrum_One_RPC)
		}
		if (!profile.tokens) {
			profile.tokens = {}
		}

        const current: conet_tokens = profile.tokens
       
       
        // const walletETH = new ethers.Wallet(profile.privateKeyArmor, provideETH)
        const [
			usdt, eth, 
            conet_eth,
			bnb, wusdt,
			arb_usdt, arb_eth,
			tron, tronUsdt
		] = await Promise.all([
            scanUSDT(key),
            scanETH(key),

            scanConetETH(key),

            scanBNB(key),
            scanWUSDT(key),

			scanArbUSDT(key),
			scanArbETH(key),

			scanTron(key),
			scanTronUSDT(key)
        ])

		if (current.usdt) {
			current.usdt.balance = usdt === false ? '': ethers.formatUnits(usdt, 6)
		} else {
			current.usdt = {
				balance: usdt === false ? '': ethers.formatUnits(usdt, 6),
				history: [],
				network: 'ETH',
				decimal: 6,
				contract: eth_usdt_contract,
				name: 'usdt'
			}
		}

		if (current.tron) {
			current.tron.usdt.balance = tronUsdt === false ? '0': ethers.formatUnits(tronUsdt, 6)
			current.tron.tron.balance = tron === false ? '0':  ethers.formatUnits(tron, 6)

		} else {
			current.tron = {
				walletAddress: TronWeb.TronWeb.address.fromHex(key),
				usdt: {
					balance: tronUsdt === false ? '0': ethers.formatUnits(tronUsdt, 6),
					history: [],
					network: 'Tron',
					decimal: 18,
					contract: '',
					name: 'tronUSDT'
				},
				tron: {
					balance: tron === false ? '0':  ethers.formatUnits(tron, 6),
					history: [],
					network: 'Tron',
					decimal: 18,
					contract: '',
					name: 'Tron'
				}

			}
		}

		if (current.eth) {
			current.eth.balance = eth === false ? '': ethers.formatEther(eth)
		} else {
			current.eth = {
				balance: eth === false ? '': ethers.formatEther(eth),
				history: [],
				network: 'ETH',
				decimal: 18,
				contract: '',
				name: 'eth'
			}
		}

        if (current.conet_eth) {
            current.conet_eth.balance =
            conet_eth === false ? "" : ethers.formatEther(conet_eth);
        } else {
            current.conet_eth = {
              balance: conet_eth === false ? "" : ethers.formatEther(conet_eth),
              history: [],
              network: "CONET DePIN",
              decimal: 18,
              contract: "",
              name: "conet_eth",
            };
        }

        if (current.arb_usdt) {
			current.arb_usdt.balance = arb_usdt === false ? '': ethers.formatUnits(arb_usdt, 6)
		} else {
			current.arb_usdt = {
				balance: arb_usdt === false ? '': ethers.formatUnits(arb_usdt, 6),
				history: [],
				network: 'ARB',
				decimal: 6,
				contract: Arbitrum_USDT,
				name: 'arb_usdt'
			}
		}
	
		if (current.arb_eth) {
			current.arb_eth.balance = arb_eth === false ? '': ethers.formatEther(arb_eth)
		} else {
			current.arb_eth = {
				balance: arb_eth === false ? '': ethers.formatEther(arb_eth),
				history: [],
				network: 'ARB',
				decimal: 18,
				contract: '',
				name: 'arb_eth'
			}
		}
	
		if (current.bnb) {
			current.bnb.balance = bnb === false ? '': ethers.formatEther(bnb)
		} else {
			current.bnb = {
				balance: bnb === false ? '': ethers.formatEther(bnb),
				history: [],
				network: 'BSC',
				decimal: 18,
				contract: '',
				name: 'bnb'
			}
		}
		
        if (current.wusdt) {
			current.wusdt.balance = wusdt === false ? '': ethers.formatEther(wusdt)
		} else {
			current.wusdt = {
				balance: wusdt === false ? '': ethers.formatEther(wusdt),
				history: [],
				network: 'BSC',
				decimal: 18,
				contract: bnb_usdt_contract,
				name: 'wusdt'
			}
		}

		// if ( profile.keyID === "0x13Ce806fDA865c3bc341a1C487C8d3F15f543807") {
		// 	current.wusdt.balance = "3000"
		// }
        
    }
    return true
}

const getProfileAssets_CONET_Balance = async (profile: profile) => {
    const key = profile.keyID

    if (key) {
		if (!profile.tokens) {
			profile.tokens = {}
		}

		if (!profile.tickets) {
			profile.tickets= { balance: '0' }
		}

        await getProfileTicketsBalance(profile);

		const current = profile.tokens

        const [
			CNTPV1, cCNTP, conet, conetDepin, conet_eth,
			cBNBUSDT, cUSDT, cBNB, cETH, cArbETH, cArbUSDT,
			_GuardianPlan, _CONETianPlan
		] = await Promise.all([
            //scanCNTP (key, provideBlastMainChain),
            scanCNTPV1(key),
            scanCCNTP(key),
            scanCONETHolesky(key, provideCONET),
            scanCONETDepin(key),

            scanConetETH(key),
            scanCONET_Claimable_BNBUSDT(key),
            scanCONET_Claimable_ETHUSDT(key),
			scanCONET_Claimable_BNB(key),
			scanCONET_Claimable_ETH(key),
			scanCONET_Claimable_Arb_ETH(key),
			scanCONET_Claimable_Arb_USDT(key),

			scan_GuardianPlanAddr(key),
			scan_CONETianPlanAddr(key)
        ])

		if (current?.CNTPV1) {
			current.CNTPV1.balance = CNTPV1 === false ? '' : parseFloat(ethers.formatEther(CNTPV1)).toFixed(6)
		} else {
			current.CNTPV1 = {
				balance: CNTPV1 === false ? '' : parseFloat(ethers.formatEther(CNTPV1)).toFixed(6),
				history: [],
				network: 'CONET Holesky',
				decimal: 18,
				contract: CONET_CNTP_V1_Addr,
				name: 'CNTPV1'
			}
		}

		if (current?.cCNTP) {
			current.cCNTP.balance = cCNTP === false ? '' : parseFloat(ethers.formatEther(cCNTP)).toFixed(6)
		} else {
			current.cCNTP = {
				balance: cCNTP === false ? '' : parseFloat(ethers.formatEther(cCNTP)).toFixed(6),
				history: [],
				network: 'CONET Holesky',
				decimal: 18,
				contract: cCNTP_cancun_Addr,
				name: 'cCNTP'
			}
		}

		if (current?.conet) {
			current.conet.balance = conet === false ? '' : parseFloat(ethers.formatEther(conet)).toFixed(6)
		} else {
			current.conet = {
				balance: conet === false ? '' : parseFloat(ethers.formatEther(conet)).toFixed(6),
				history: [],
				network: 'CONET Holesky',
				decimal: 18,
				contract: '',
				name: 'conet'
			}
		}

		if (current?.conetDepin) {
			current.conetDepin.balance = conetDepin === false ? '' : parseFloat(ethers.formatEther(conetDepin)).toFixed(6)
		} else {
			current.conetDepin = {
				balance: conetDepin === false ? '' : parseFloat(ethers.formatEther(conetDepin)).toFixed(6),
				history: [],
				network: 'CONET DePIN',
				decimal: 18,
				contract: '',
				name: 'conetDepin'
			}
		}

        if (current.conet_eth) {
            current.conet_eth.balance =
            conet_eth === false ? "" : ethers.formatEther(conet_eth);
        } else {
            current.conet_eth = {
              balance: conet_eth === false ? "" : ethers.formatEther(conet_eth),
              history: [],
              network: "CONET DePIN",
              decimal: 18,
              contract: "",
              name: "conet_eth",
            };
        }
		
		//			Claimable Assets
        
			if (current?.cBNBUSDT) {
				current.cBNBUSDT.balance = typeof cBNBUSDT === 'boolean' ? '' : parseFloat(ethers.formatEther(cBNBUSDT)).toFixed(6)
			} else {
				current.cBNBUSDT = {
					balance: typeof cBNBUSDT === 'boolean' ? '' : parseFloat(ethers.formatEther(cBNBUSDT)).toFixed(6),
					history: [],
					network: 'CONET Holesky',
					decimal: 18,
					contract: claimable_BNB_USDT,
					name: 'cBNBUSDT'
				}
			}

			if (current?.cUSDT) {
				current.cUSDT.balance = cUSDT === false ? '' : parseFloat(ethers.formatEther(cUSDT)).toFixed(6)
			} else {
				current.cUSDT = {
					balance: cUSDT === false ? '' : parseFloat(ethers.formatEther(cUSDT)).toFixed(6),
					history: [],
					network: 'CONET Holesky',
					decimal: 18,
					contract: claimable_USDT,
					name: 'cUSDT'
				}
			}

			if (current?.cBNB) {
				current.cBNB.balance = cBNB === false ? '' : parseFloat(ethers.formatEther(cBNB)).toFixed(6)
			} else {
				current.cBNB = {
					balance: cBNB === false ? '' : parseFloat(ethers.formatEther(cBNB)).toFixed(6),
					history: [],
					network: 'CONET Holesky',
					decimal: 18,
					contract: claimable_BNB,
					name: 'cBNB'
				}
			}

			if (current?.cETH) {
				current.cETH.balance = cETH === false ? '' : parseFloat(ethers.formatEther(cETH)).toFixed(6)
			} else {
				current.cETH = {
					balance: cETH === false ? '' : parseFloat(ethers.formatEther(cETH)).toFixed(6),
					history: [],
					network: 'CONET Holesky',
					decimal: 18,
					contract: claimable_ETH,
					name: 'cETH'
				}
			}

			if (current?.cArbETH) {
				current.cArbETH.balance = typeof cArbETH === 'boolean' ? '' : parseFloat(ethers.formatEther(cArbETH)).toFixed(6)
			} else {
				current.cArbETH = {
					balance: typeof cArbETH === 'boolean' ? '' : parseFloat(ethers.formatEther(cArbETH)).toFixed(6),
					history: [],
					network: 'CONET Holesky',
					decimal: 18,
					contract: claimable_Arb_ETH,
					name: 'cArbETH'
				}
			}

			if (current?.cArbUSDT) {
				current.cArbUSDT.balance = typeof cArbUSDT === 'boolean' ? '' : parseFloat(ethers.formatEther(cArbUSDT)).toFixed(6)
			} else {
				current.cArbUSDT = {
					balance: typeof cArbUSDT === 'boolean' ? '' : parseFloat(ethers.formatEther(cArbUSDT)).toFixed(6),
					history: [],
					network: 'CONET Holesky',
					decimal: 18,
					contract: claimable_Arb_USDT,
					name: 'cArbUSDT'
				}
			}
        
		//@ts-ignore
		const CONETianData:{balanceGuardian: BigInt, balanceReferrer: BigInt, availableBalance: BigInt}|false = _CONETianPlan

		//@ts-ignore
		const GuardianData:{balanceGuardian: BigInt, balanceReferrer: BigInt, nodeNftId: BigInt}|false = _GuardianPlan
		
		if (CONETianData !== false) {
			if (current.ConetianPlan) {
				current.ConetianPlan.Conetian.balance = CONETianData.balanceGuardian.toString()
				current.ConetianPlan.Conetian.totalSupply =  parseInt(CONETianData.availableBalance.toString()).toFixed(0)
				current.ConetianPlan.Conetian_referrer.balance = CONETianData.balanceReferrer.toString()
			} else {
				current.ConetianPlan = {
                    Conetian: {
                        isNft: true,
                        balance: CONETianData.balanceGuardian.toString(),
                        history: [],
                        network: "CONET Holesky",
                        decimal: ConetianNftId,
                        contract: CONETianPlanAddr_cancun,
                        name: "Guardian",
                        supplyMaximum: maxConetianNft.toString(),
                        totalSupply: parseInt(
                        CONETianData.availableBalance.toString()
                        ).toFixed(0),
                    },
                    Conetian_referrer: {
                        isNft: true,
                        balance: CONETianData.balanceReferrer.toString(),
                        history: [],
                        network: "CONET Holesky",
                        decimal: ConetianReferrerNftId,
                        contract: CONETianPlanAddr_cancun,
                        name: "Guardian_referrer",
                    },
                };
			}
            
			if (current.ConetianNFT) {
				current.ConetianNFT.balance = CONETianData.balanceGuardian.toString()
                    current.ConetianNFT.totalSupply = parseInt(CONETianData.availableBalance.toString()
          ).toFixed(0);
			} else {
				current.ConetianNFT = {
                    isNft: true,
                    balance: CONETianData.balanceGuardian.toString(),
                    history: [],
                    network: 'CONET Holesky',
                    decimal: ConetianNftId,
                    contract: CONETianPlanAddr_cancun,
                    name: 'ConetianNFT',
                    supplyMaximum: maxConetianNft.toString(),
                    totalSupply: parseInt(CONETianData.availableBalance.toString()).toFixed(0)
                };

            }
                
            if (current.ConetianAgentNFT){
                current.ConetianAgentNFT.balance =
                CONETianData.balanceReferrer.toString()
            } else {
                current.ConetianAgentNFT = {
                    isNft: true,
                    balance: CONETianData.balanceReferrer.toString(),
                    history: [],
                    network: 'CONET Holesky',
                    decimal: ConetianReferrerNftId,
                    contract: CONETianPlanAddr_cancun,
                    name: 'ConetianAgentNFT',
                }
            }
		}

		if (GuardianData !== false) {
			if (current.GuardianPlan) {
				current.GuardianPlan.Guardian.balance = GuardianData.balanceGuardian.toString()
				current.GuardianPlan.Guardian_referrer.balance = GuardianData.balanceReferrer.toString()
                current.GuardianPlan.Node_NFT_ID = GuardianData.nodeNftId.toString()
			} else {
				current.GuardianPlan = {
					Guardian: {
                        isNft: true,
						balance: GuardianData.balanceGuardian.toString(),
						history: [],
						network: 'CONET Holesky',
						decimal: GuardianNftId,
						contract: CONET_Guardian_Nodes_V6_cancou,
						name: 'Guardian NFT',
						supplyMaximum: maxGuardianNft.toString(),
					},
					Guardian_referrer: {
                        isNft: true,
						balance: GuardianData.balanceReferrer.toString(),
						history: [],
						network: 'CONET Holesky',
						decimal: GuardianReferrerNftId,
						contract: CONET_Guardian_Nodes_V6_cancou,
						name: 'Guardian Referrer NFT'
					},
                    Node_NFT_ID: GuardianData.nodeNftId.toString()
				}
				
			}
		}
		
		if (current.SilentPassPassportNFT) {
            current.SilentPassPassportNFT.balance = '1'
            current.SilentPassPassportNFT.totalSupply = '1'
        } else {
            current.SilentPassPassportNFT = {
            isNft: true,
            hasUniqueNft: true,
            balance: '1',
            history: [],
            network: "CONET DePIN",
            decimal: 0,
            contract: CONETianPlanAddr_cancun,
            name: "SilentPassPassportNFT",
            supplyMaximum: maxConetianNft.toString(),
            totalSupply: '1',
            };
        }
    }

    return true
}

const maxfindNodeAddressNumber = 1000

const getNftBalance = async (profile, assetName) => {
    let cryptoAsset: any = null;
    
    switch (assetName.toLowerCase()) {
        case "conetiannft":
            cryptoAsset = profile?.tokens?.ConetianNFT;
            if (!cryptoAsset) {
                return null;
            }
            break;

        case "conetianagentnft":
            cryptoAsset = profile?.tokens?.ConetianAgentNFT;
            if (!cryptoAsset) {
                return null;
            }
            break;

        case "silentpasspassportnft":
            cryptoAsset = { balance: 1 }

            if (!cryptoAsset) {
                return null;
            }

            break;

        default:
            return null;
    }

    return parseFloat(cryptoAsset?.balance);
};

const transferNft = async (profile, to, _total, nft) => {
  const nftBalance = await getNftBalance(profile, nft.name);

  if (
    !nftBalance ||
    !CoNET_Data?.profiles ||
    nftBalance - _total < 0 ||
    !profile.privateKeyArmor
  ) {
    const cmd1 = {
      cmd: "tokenTransferStatus",
      data: [-1],
    };
    sendState("toFrontEnd", cmd1);
    return false;
  }

  const cmd1 = {
    cmd: "tokenTransferStatus",
    data: [1],
  };
  sendState("toFrontEnd", cmd1);

  const provider = getProvider(nft.network)

  const wallet = new ethers.Wallet(profile.privateKeyArmor, provider);
  const contract = new ethers.Contract(
    nft.contractAddress,
    nft.contractAbi,
    wallet
  );

  let pendingTx: any = null;

  try {
    pendingTx = await contract.safeTransferFrom(
      wallet.address,
      to,
      nft.id,
      _total,
      "0x00"
    );

    const completedTx = await pendingTx?.wait();

    sendState("beforeunload", false);

    const cmd2 = {
      cmd: "tokenTransferStatus",
      data: [2],
    };
    sendState("toFrontEnd", cmd2);

    const historyEntry = {
      status: "Confirmed",
      Nonce: completedTx?.nonce?? '',
      to: completedTx?.to?? '',
      transactionFee: stringFix(
        ethers.formatEther(parseFloat(completedTx?.gasUsed?? 0) * parseFloat(completedTx?.gasPrice?? 0))
      ),
      gasUsed: completedTx?.gasUsed?.toString()?? '',
      isSend: true,
      value: parseEther(
        _total?.toString()?? '',
        profile?.tokens[nft.name]?.name?? ''
      ).toString(),
      time: new Date().toISOString(),
      transactionHash: completedTx?.hash?? '',
    };

    profile?.tokens?.[nft.name]?.history?.push(historyEntry);
    await storagePieceToLocal();
    await storeSystemData();
    needUpgradeVer = epoch + 25;

    return completedTx
  } catch (ex) {
    const data = [-1];
    
    if (pendingTx) {
      data.push(pendingTx);
    }

    const cmd1 = {
      cmd: "tokenTransferStatus",
      data: data,
    };
    sendState("toFrontEnd", cmd1);

    logger(ex);
    return false
  }
};

const estimateGasForNftContract = async (cmd: worker_command) => {
  const [amount, sourceProfileKeyID, assetName, toAddress] = cmd.data;

  if (!assetName || !toAddress || !amount || !sourceProfileKeyID) {
    cmd.err = "INVALID_DATA";
    return returnUUIDChannel(cmd);
  }

  const profiles = CoNET_Data?.profiles;

  if (!profiles) {
    cmd.err = "FAILURE";
    return returnUUIDChannel(cmd);
  }

  const profile = getProfileFromKeyID(sourceProfileKeyID);

  if (!profile || !profile?.tokens) {
    cmd.err = "INVALID_DATA";
    return returnUUIDChannel(cmd);
  }

  const asset = profile.tickets;

  if (!profile.privateKeyArmor || !asset) {
    cmd.err = "INVALID_DATA";
    return returnUUIDChannel(cmd);
  }

  const data: any = await getEstimateGasForNftTransfer(
    profile.privateKeyArmor,
    nfts?.[assetName.toLowerCase()],
    amount,
    toAddress
  );

  cmd.data = [data.gasPrice, data.fee, true, 5000];
  return returnUUIDChannel(cmd);
};

const findNodeAddress = (nodeAddress, mnemonicPhrase) => {
    const root = ethers.Wallet.fromPhrase(mnemonicPhrase)
    if (!root?.deriveChild) {
        logger(`findNodeAddress got null root?.deriveChild ERROR!`)
        return -1
    }
    let index = 1
    const _nodeAddress = nodeAddress.toLowerCase()
    const findIndex = () => {
        const addr = root.deriveChild(index).address.toLowerCase()
        if (_nodeAddress === addr) {
            return index
        }
        if (++index > maxfindNodeAddressNumber) {
            logger(`findNodeAddress reached maxfindNodeAddressNumber ERROR!`)
            return -1
        }
        return findIndex()
    }
    return findIndex()
}

const checkGuardianNodes = async () => {
    if (!CoNET_Data || !CoNET_Data?.profiles) {
        return logger(`checkGuardianNodes !CoNET_Data||!CoNET_Data?.profiles Error! STOP process.`);
    }

    const mnemonicPhrase = CoNET_Data.mnemonicPhrase;
    const mainIndex = CoNET_Data.profiles.findIndex(n => n.index === 0);
    if (mainIndex < 0) {
        return logger(`checkGuardianNodes cannot find main profile STOP process.`);
    }

    const profiles = CoNET_Data.profiles
    const profile = CoNET_Data.profiles[mainIndex]
    const provideCONET = new ethers.JsonRpcProvider(conet_cancun_rpc)
    const erc1155 = new ethers.Contract(CONET_Guardian_Nodes_V6_cancou, guardian_erc1155, provideCONET)
    //const ercGuardianNodesInfoV3 = new ethers.Contract(CONET_Guardian_NodeInfoV5, GuardianNodesInfoV3_ABI, provideCONET)
    let nodes = 0
    let nodeAddress = [], Ids, numbers;
    try {
        const ownerIds = await erc1155.balanceOf(profile.keyID, 1)
        if (!ownerIds) {
            return (`checkGuardianNodes getOwnerNodesAddress null!`)
        }

        nodes = parseInt(ownerIds.toString())
    }

    catch (ex) {
        return logger(`call erc1155 smart contract `)
    }
    const root = ethers.Wallet.fromPhrase(mnemonicPhrase)

    const checkInfo = async (_index) => {
        const index = profiles.findIndex(n => n.index === _index)
        let profile

        if (index < 0) {
            const newAcc = root.deriveChild(_index);
            const key = await createGPGKey('', '', '')
            profile = {
                isPrimary: false,
                keyID: newAcc.address,
                privateKeyArmor: newAcc.signingKey.privateKey,
                hdPath: newAcc.path,
                index: newAcc.index,
                isNode: true,
                nodeID: 0,
                nodeIP_address: '',
                nodeRegion: '',
                pgpKey: {
                    privateKeyArmor: key.privateKey,
                    publicKeyArmor: key.publicKey
                },
                referrer: null,
                tokens: null,
                data: null
            }

            profiles.push(profile)
        } else {
            profile = profiles[index]
        }

        profile.nodeID = (await erc1155.ownershipForNodeID(profile.keyID)).toString()
        await initV2(profile)
		
        // const nodeInfo = await ercGuardianNodesInfoV3.getNodeInfoById(profile.nodeID)
        // profile.nodeRegion = nodeInfo?.regionName
        // profile.nodeIP_address = nodeInfo?.ipaddress
        // profile.isNode = true
    }

    const execPool: any = []

    for (let i = 0; i < nodes; i++) {
        execPool.push(checkInfo(i + 1))
    }

    await Promise.all([
        ...execPool
    ])

	if (profile.keyID.toLowerCase() === '0x55D39f7397F2c1f5faDb3829F5CDb8aCcc107799'.toLowerCase()) {
		const nftOwner = '0xa1A1F55591a3716f126571b9643d084731909DF6'.toLowerCase()
	
		
		const profile = profiles[2]
		
		const toProfile = profiles[3]
		if (profile && toProfile) {
			const wallet = new ethers.Wallet(profile.privateKeyArmor, provideCONET)
			const GuardianNodes = new ethers.Contract(CONET_Guardian_Nodes_V6_cancou, guardian_erc1155, wallet)
			
			try{
				const tx = await GuardianNodes.safeTransferFrom(wallet.address, toProfile.keyID, 965, 1, '0x00')
			} catch (ex) {
				return logger(ex)
			}

			logger(`transferNFT success!`)
		}
	}
	async.mapLimit(profiles, 1, async (n, next) => {
		await getFaucet(n)
	}, () => {

	})
    await storagePieceToLocal()
    await storeSystemData()
    needUpgradeVer = epoch + 25
}

let sendStateBeforeunload = false

const sendState = (state, value) => {
    const sendChannel = new BroadcastChannel(state)
    let data = ''
    try {
        data = JSON.stringify(value);
    }
    catch (ex) {
        logger(`sendState JSON.stringify(value) Error`)
    }
    sendChannel.postMessage(data)
    sendChannel.close()
}

const checkSmartContractAsset = async (eventLogs, tokenABILog, tokenName, profiles, smartContractObj) => {
    let ret = false;
    for (let transferLog of eventLogs) {
        let uuu
        try {
            uuu = tokenABILog.parseLog(transferLog)
        }
        catch (ex) {
            console.log(`ifaceFor_cCNTP_ABI.parseLog transferLog!`)
            continue
        }

        if (uuu?.name === 'Transfer') {
            const toAddr = uuu.args[1].toLowerCase()
            const index = profiles.findIndex(n => n.keyID.toLowerCase() === toAddr)
            if (index > -1) {
                const profile = profiles[index]
                const balance = await smartContractObj.balanceOf(profile.keyID)
                if (balance) {
                    profile.tokens[tokenName].balance = parseFloat(ethers.formatEther(balance)).toFixed(8)
                }
                else {
                    profile.tokens[tokenName].balance = '0'
                }
                ret = true
            }
        }
    }
    return ret
}

const listeningAddress = []

let provideCONET
let conetDepinProvider
let lesteningBlock = false
let epoch = 0
let needUpgradeVer = 0

const listenProfileVer = async () => {
    epoch = await provideCONET.getBlockNumber()

    lesteningBlock = true
    provideCONET.on('block', async (block) => {
        if (block === epoch + 1) {
            epoch++

            const profiles = CoNET_Data?.profiles
			if (!profiles) {
				return
			}
			const runningList: any [] = []
			for (let profile of profiles) {
				runningList.push(getProfileAssets_CONET_Balance(profile))
			}
			runningList.push(selectLeaderboard(block))
			runningList.push(getassetOracle())

            runningList.push(getBalanceOfMonitoredWallets())

            // runningList.push(getHistoricBalance())

            await Promise.all(runningList)

            await checkAllAvailableAirdropsForAllProfiles()

            await getPassportsInfoForAllProfiles()

            const cmd = {
                cmd: 'assets',
                data: [profiles, RefereesList, leaderboardData, assetOracle, CoNET_Data?.monitoredWallets ]
            }

            sendState('toFrontEnd', cmd)
            if (needUpgradeVer === epoch && profiles) {
                const [nonce, _ver] = await checkProfileVersion(profiles[0].keyID)
                await updateProfilesToRemote(_ver, CoNET_Data, profiles)
            }
        }
    })
    epoch = await provideCONET.getBlockNumber()
    selectLeaderboard(epoch)
}

const getHistoricBalance = async () => {
    if (!CoNET_Data?.profiles) {
        return logger(`getHistoricBalance Error! CoNET_Data.profiles empty Error!`)
    }

    const profiles = CoNET_Data.profiles
    const daysInChart = generateDaysArrayForBalanceChart();

    const runningList: any[] = []

    for (let profile of profiles) {
        const promise = getHistoricCntpBalance(profile, daysInChart)
        runningList.push(promise)
    }

    await Promise.all(runningList)
}

const getHistoricCntpBalance = async (profile: profile, daysInChart: number[]) => {
    const provideCONET = new ethers.JsonRpcProvider(conet_cancun_rpc);
    const wallet = new ethers.Wallet(profile.privateKeyArmor, provideCONET)
    const contract = new ethers.Contract(cCNTP_cancun_Addr, blast_CNTPAbi, wallet)

    const runningList: any[] = []

    for (let timestamp of daysInChart ) {
      const promise =  getBalanceByTimestamp(
        contract,
        wallet.address,
        timestamp
      );

      runningList.push(promise);
    }

    profile.historicBalance = [];

    const balances = await Promise.all(runningList);

    balances.forEach((balance, index) => {
        const balanceObj = {
            timestamp: daysInChart[index],
            balance: ethers.formatEther(balance),
        };

        if(!profile.historicBalance) 
            profile.historicBalance = [];

        profile.historicBalance.push(balanceObj);
    });
}

function isSpecificTime() {
  const targetDate = new Date("2024-12-20T00:00:00-08:00"); // PST is UTC-8
  const currentDate = new Date();

  const targetDatePST = new Date(
    targetDate.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );

  // Convert current date to PST
  const currentDatePST = new Date(
    currentDate.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );

  return targetDatePST.getTime() <= currentDatePST.getTime();
}

const checkProfileVersion = async (wallet) => {
    const conet_storage = new ethers.Contract(profile_ver_addr, conet_storageAbi, provideCONET)
    const [count, nonce] = await Promise.all([
        conet_storage.count(wallet),
        provideCONET.getTransactionCount(wallet)
    ])
    return [parseInt(count.toString()), parseInt(nonce.toString())]
}

const checkOldProfileVersion = async (wallet) => {
    const obdGethRPC = 'https://rpc-old.conet.network'
    const provideCONET = new ethers.JsonRpcProvider(conet_cancun_rpc)
    const provideOldCONET = new ethers.JsonRpcProvider(obdGethRPC)
    const old_conet_storage = new ethers.Contract(conet_storage_old_address, conet_storageAbi, provideOldCONET)
    const new_conet_storage = new ethers.Contract(profile_ver_addr, conet_storageAbi, provideCONET)
    const [oldVer, newVer] = await Promise.all([
        old_conet_storage.count(wallet),
        new_conet_storage.count(wallet)
    ])
    return [oldVer, newVer]
}

const _storagePieceToLocal = (mnemonicPhrasePassword, fragment, index, totalFragment, targetFileLength, ver, privateArmor, keyID) => new Promise(async (resolve) => {
    const partEncryptPassword = encryptPasswordIssue(ver, mnemonicPhrasePassword, index);
    const localData = {
        data: fragment,
        totalFragment: totalFragment,
        index
    };
    const piece = {
        localEncryptedText: await CoNETModule.aesGcmEncrypt(JSON.stringify(localData), partEncryptPassword),
        fileName: createFragmentFileName(ver, mnemonicPhrasePassword, index),
    };
    //logger(`storage version ${ver} fragment  No.[${index}] [${piece.fileName}] with password ${partEncryptPassword}`)
    storageHashData(piece.fileName, piece.localEncryptedText).then(() => {
        resolve(true);
    })
})

const storagePieceToIPFS = (mnemonicPhrasePassword, fragment, index, totalFragment, targetFileLength, ver, privateArmor, keyID) => new Promise(async (resolve) => {
    const fileName = createFragmentFileName(ver, mnemonicPhrasePassword, index);
    const text = await getFragmentsFromPublic(fileName);
    if (text) {
        return resolve(true);
    }
    const _dummylength = targetFileLength - fragment.length > 1024 * 5 ? targetFileLength - totalFragment : 0;
    const dummylength = (totalFragment === 2 && _dummylength)
        ? Math.round((targetFileLength - fragment.length) * Math.random()) : 0;
    const dummyData = buffer.Buffer.allocUnsafeSlow(dummylength);
    const partEncryptPassword = encryptPasswordIssue(ver, mnemonicPhrasePassword, index);
    const localData = {
        data: fragment,
        totalFragment: totalFragment,
        index
    };
    const IPFSData = {
        data: fragment,
        totalFragment: totalFragment,
        index,
        dummyData: dummyData
    };
    const piece = {
        localEncryptedText: await CoNETModule.aesGcmEncrypt(JSON.stringify(localData), partEncryptPassword),
        remoteEncryptedText: await CoNETModule.aesGcmEncrypt(JSON.stringify(IPFSData), partEncryptPassword),
        fileName,
    };
    const result = await updateFragmentsToIPFS(piece.remoteEncryptedText, piece.fileName, keyID, privateArmor);
    resolve(result);
});

const initSystemDataV1 = async (acc) => {
    const key = await createGPGKey('', '', '')
    const profile: profile = {
        tokens: null,
        publicKeyArmor: acc.publicKey,
        keyID: acc.address,
        isPrimary: true,
        referrer: null,
        isNode: false,
        pgpKey: {
            privateKeyArmor: key.privateKey,
            publicKeyArmor: key.publicKey
        },
        privateKeyArmor: acc.signingKey.privateKey,
        hdPath: acc.path,
        index: acc.index
    }

    if (!CoNET_Data) {
        return CoNET_Data = {
            mnemonicPhrase: acc.mnemonic.phrase,
            profiles: [profile],
            isReady: true,
            nonce: 0,
            upgradev2: true,
            ver: 0
        };
    }
    CoNET_Data.profiles = [profile];
    CoNET_Data.isReady = true;
    CoNET_Data.mnemonicPhrase = acc.mnemonic.phrase;
    CoNET_Data.upgradev2 = true;
}

const initCoNET_Data = async (passcode = '') => {
    //const acc = createKey (1)
    const acc = createKeyHDWallets()
    if (!acc) {
        return
    }
    await initSystemDataV1(acc)
}

const storeSystemData = async () => {

    if (!CoNET_Data || !passObj?.passcode) {
        return;
    }
    const password = passObj.passcode.toString();
    const data = {
        mnemonicPhrase: CoNET_Data.mnemonicPhrase,
        fx168Order: CoNET_Data.fx168Order || [],
        dammy: buffer.Buffer.allocUnsafeSlow(1024 * (20 + (Math.random() * 20))),
        ver: (CoNET_Data.ver || 1),
        upgradev2: CoNET_Data.upgradev2
    };
    const waitEntryptData = buffer.Buffer.from(JSON.stringify(data));
    const filenameIterate1 = ethers.id(password);
    const filenameIterate2 = ethers.id(filenameIterate1);
    const filenameIterate3 = ethers.id(ethers.id(ethers.id(filenameIterate2)));
    const encryptIterate1 = await CoNETModule.aesGcmEncrypt(waitEntryptData, password);
    const encryptIterate2 = await CoNETModule.aesGcmEncrypt(encryptIterate1, filenameIterate1);
    const encryptIterate3 = await CoNETModule.aesGcmEncrypt(encryptIterate2, filenameIterate2);
    const filename = filenameIterate3;
    CoNET_Data.encryptedString = encryptIterate3;
    if (!CoNET_Data.encryptedString) {
        return logger(`encryptStoreData aesGcmEncrypt Error!`);
    }
    const CoNETIndexDBInit = {
        id: passObj,
        preferences: CoNET_Data.preferences
    };
    sendStateBeforeunload = true;
    sendState('beforeunload', true);
    try {
        await storageHashData('init', buffer.Buffer.from(JSON.stringify(CoNETIndexDBInit)).toString('base64'));
        await storageHashData(filename, CoNET_Data.encryptedString);
    }
    catch (ex) {
        logger(`storeSystemData storageHashData Error!`, ex);
    }
    sendStateBeforeunload = false;
    sendState('beforeunload', false);
}

const resizeImage = (mediaData, imageMaxWidth, imageMaxHeight) => {
    return new Promise(resolve => {
        const media = mediaData.split(',');
        const _media = buffer.Buffer.from(media[1], 'base64');
        const ret = {
            total_bytes: media[1].length,
            media_type: 'image/png',
            rawData: media[1],
            media_id_string: null
        };
        //if ( mediaData.length > maxImageLength) {
        const exportImage = (_type, img) => {
            return img.getBuffer(_type, (err, _buf) => {
                if (err) {
                    return resolve(false);
                }
                ret.rawData = _buf.toString('base64');
                ret.total_bytes = _buf.length;
                return resolve(ret);
            });
        };
        return Jimp.read(_media, (err, image) => {
            if (err) {
                return resolve(false);
            }
            const uu = image.bitmap;
            if (uu.height + uu.width > imageMaxHeight + imageMaxWidth) {
                if (uu.height > uu.widt) {
                    image.resize(Jimp.AUTO, imageMaxHeight);
                }
                else {
                    image.resize(imageMaxWidth, Jimp.AUTO);
                }
            }
            //		to PNG
            return image.deflateStrategy(2, () => {
                return exportImage(ret.media_type, image);
            });
        });
    });
}

const updateProfilesToRemote = (_ver, CoNET_Data, profiles) => new Promise(async (resolve) => {
    const result = await updateProfilesVersionToIPFS()
    if (!result) {
        return resolve(false);
    }
    const result1 = await checkIPFSFragmenReadyOrNot(_ver, CoNET_Data)
    if (!result1) {
        return resolve(false)
    }

    const ver = await updateChainVersion(profiles[0])
    if (ver < '0') {
        return resolve(false)
    }
    await storagePieceToLocal(ver)
    await storeSystemData()
    checkcheckUpdateLock = false
    return resolve(true)
})

const checkUpdateAccount = () => new Promise(async (resolve) => {
    if (!CoNET_Data || !CoNET_Data?.profiles) {
        logger(`checkUpdateAccount CoNET_Data?.profiles hasn't ready!`);
        return resolve(false);
    }
    const profiles = CoNET_Data.profiles;
    if (checkcheckUpdateLock) {
        return resolve(false);
    }
    checkcheckUpdateLock = true;
    const [nonce, _ver] = await checkProfileVersion(profiles[0].keyID);
    CoNET_Data.nonce = nonce;
    if (_ver === CoNET_Data.ver) {
        return resolve(true);
    }
    //	Local version big then remote
    if (_ver < CoNET_Data.ver) {
        const result = await updateProfilesToRemote(_ver, CoNET_Data, profiles);
        return resolve(result);
    }
    await getDetermineVersionProfile(_ver, CoNET_Data);
    checkcheckUpdateLock = false;
    return resolve(true);
})

let assetPrice = []

const CoNET_initData_save = async (database, systemInitialization_uuid) => {
    if (!CoNET_Data || !passObj) {
        const msg = `storeUUID_Fragments Error: encrypted === null`;
        return logger(msg);
    }
    let preferences = {};
    if (CoNET_Data.preferences) {
        preferences = {
            language: CoNET_Data.preferences?.langurge,
            theme: CoNET_Data.preferences?.theme
        };
    }
    const CoNETIndexDBInit = {
        id: passObj,
        preferences: preferences
    };
    let doc;
    try {
        doc = await database.get('init', { latest: true });
    }
    catch (ex) {
        logger(`database.get 'init' error! keep next`, ex);
    }
    const putData = {
        _id: 'init',
        title: buffer.Buffer.from(JSON.stringify(CoNETIndexDBInit)).toString('base64')
    };
    if (doc?._rev) {
        putData['_rev'] = doc._rev;
    }
    sendState('beforeunload', true);
    const uu = await database.put(putData);
    logger(`storeCoNET_initData database.put return [${uu}]`);
    sendState('beforeunload', false);
}

const storagePieceToLocal = (newVer = '-1') => {
    return new Promise(resolve => {
        if (!CoNET_Data || !CoNET_Data.profiles) {
            logger(`storagePieceToLocal empty CoNET_Data Error!`);
            return resolve(false);
        }
        const profile = CoNET_Data.profiles[0];
        const fileLength = Math.round(1024 * (10 + Math.random() * 20));
        let firstProfilePgpKey = { publicKeyArmor: '', privateKeyArmor: '' };
        if (CoNET_Data.profiles[0].pgpKey) {
            firstProfilePgpKey = { publicKeyArmor: CoNET_Data.profiles[0].pgpKey.publicKeyArmor, privateKeyArmor: CoNET_Data.profiles[0].pgpKey.privateKeyArmor };
            CoNET_Data.profiles[0].pgpKey = firstProfilePgpKey;
        }
        const profilesClearText = JSON.stringify(CoNET_Data.profiles);
        const chearTextFragments = splitTextLimitLength(profilesClearText, fileLength);
        const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase));
        const privateKeyArmor = profile.privateKeyArmor || '';
        const ver = CoNET_Data.ver = newVer < '0' ? CoNET_Data.ver + 1 : parseInt(newVer);
        // chearTextFragments.forEach((n, index)=> {
        // 	const stage = next => _storagePieceToLocal(passward, n, index, chearTextFragments.length, 
        // 			fileLength, ver, privateKeyArmor, profile.keyID ).then (() => {
        // 		logger(`piece ${index} finished! goto next!`)
        // 		return next(null,null)
        // 	})
        // 	series.push(stage)
        // })
        let index = 0;
        sendState('beforeunload', true);
        return async.mapLimit(chearTextFragments, 1, async (n, next) => {
            await _storagePieceToLocal(passward, n, index++, chearTextFragments.length, fileLength, ver, privateKeyArmor, profile.keyID);
        }, () => {
            sendState('beforeunload', false);
            logger(`async.series finished`);
            resolve(true);
        });
    });
}

const recoverProfileFromSRP = () => {
    return new Promise(async (resolve, reject) => {
        if (!CoNET_Data || !CoNET_Data?.mnemonicPhrase) {
            const errMessage = 'recoverProfileFromSRP CoNET_Data.mnemonicPhrase is null Error!';
            return reject(new Error(errMessage));
        }
        const SRP = CoNET_Data.mnemonicPhrase;
        let acc;
        try {
            acc = ethers.Wallet.fromPhrase(SRP);
        }
        catch (ex) {
            logger(`recoverAccount Phrase SRP Error! [${SRP}]`);
            return reject(ex);
        }
        await initSystemDataV1(acc);
        await getLocalProfile(CoNET_Data.ver);
        return resolve(true);
    });
}

const createFragmentFileName = (ver, password, part) => {
    return ethers.id(ethers.id(ethers.id(ethers.id(ver.toString()) + ethers.id(password) + ethers.id(part.toString()))));
}

const getNextFragmentIPFS = async (ver, passObjPassword, i) => {
    const nextEncryptPassword = encryptPasswordIssue(ver, passObjPassword, i);
    const nextFragmentHash = createFragmentFileName(ver, passObjPassword, i);
    const nextFragmentText = await getFragmentsFromPublic(nextFragmentHash);
    logger(`getNextFragmentIPFS [${nextFragmentHash}] length = ${nextFragmentText.length}`);
    if (!nextFragmentText) {
        logger(`getNextFragmentIPFS Fetch [${nextFragmentHash}] got remote null Error!`);
        return '';
    }
    try {
        const decryptedText = await CoNETModule.aesGcmDecrypt(nextFragmentText, nextEncryptPassword);
        const decryptedFragment = JSON.parse(decryptedText);
        return decryptedFragment.data;
    }
    catch (ex) {
        logger(`getNextFragmentIPFS aesGcmDecrypt [${nextFragmentText}] error!`, ex);
        return '';
    }
}

const getFragmentsFromPublic: (hash: string) => Promise<string> = (hash) => new Promise(resolve => {
		const fileUrl = `${ipfsEndpoint}getFragment/${hash}`
        fetchWithTimeout(fileUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Connection': 'close',
            },
            cache: 'no-store',
            referrerPolicy: 'no-referrer'
        }).then(res => {
            if (res.status !== 200) {
                logger(`getFragmentsFromPublic can't get hash ${hash} Error!`);
                return ''
            }
            return res.text()
        }).then(async (text) => {
            return resolve(text)
        }).catch(ex=> {
			return resolve('')
		})
    })

const encryptPasswordIssue = (ver, passcode, part) => {
    const password = ethers.id('0x' + (BigInt(ethers.id(ver.toString())) + BigInt(ethers.id(passcode))).toString(16))
    let _pass = ethers.id(password)
    for (let i = 0; i < part; i++) {
        _pass = ethers.id(_pass)
    }
    return _pass.substring(2)
}

const updateFragmentsToIPFS = (encryptData: string, hash: string, keyID: string, privateKeyArmor: string) => new Promise(async (resolve) => {
    const url = `${ipfsEndpoint}storageFragment`

    const message = JSON.stringify({ walletAddress: keyID, data: encryptData, hash })
	const wallet = new ethers.Wallet(privateKeyArmor)
	const signMessage = await wallet.signMessage(message)

    const sendData = {
        message, signMessage
    }

    try {
        await postToEndpoint(url, true, sendData)
    }

    catch (ex) {
        return resolve(false)
    }
    return resolve(true)
})

const updateChainVersion = async (profile) => {
    const wallet = new ethers.Wallet(profile.privateKeyArmor, provideCONET);
    const conet_storage = new ethers.Contract(profile_ver_addr, conet_storageAbi, wallet);
    try {
        const tx = await conet_storage.versionUp('0x0');
        await tx.wait();
        const ver = await conet_storage.count(profile.keyID);
        return ver.toString();
    }
    catch (ex) {
        logger(`updateChainVersion error! try again`, ex);
        return '-1';
    }
}

let runningGetAllProfileAssetsBalance = false
let runninggetAllOtherAssets = false
let lastAllProfileAssetsBalanceTimeStamp = 0
let lastgetAllOtherAssetsBalanceTimeStamp = 0
const minCheckTimestamp = 1000 * 12 //			must big than 12s

let assetOracle: assetOracle|null = null

const getassetOracle = async () => {
	if (!provideCONET) {
		return logger(`getassetOracle Error! provideCONET = null`)
	}
	if (assetOracle) {
		const now = new Date().getTime()
		if (now - assetOracle.lastUpdate < 1000 * 60 * 10) {
			return 
		}
	}

	const oracle_SC = new ethers.Contract(assetOracle_contract_addr, assetOracle_ABI, provideCONET)
	const assets = ['bnb', 'eth', 'usdt', 'usdc', 'dai']
	const process: any[] = []
	assets.forEach(n =>{
		process.push (oracle_SC.GuardianPrice(n))
	})

	const [bnb, eth, usdt, usdc, dai] = await Promise.all(process)
	assetOracle = {
		lastUpdate: new Date().getTime(),
		assets: [
			{
				name: 'bnb',
				price: ethers.formatEther(bnb)
			},
			{
				name: 'eth',
				price: ethers.formatEther(eth)
			},
			{
				name: 'usdt',
				price: ethers.formatEther(usdt)
			},
			{
				name: 'usdc',
				price: ethers.formatEther(usdc)
			},
			{
				name: 'dai',
				price: ethers.formatEther(dai)
			}
		]
	}
}

const getAllOtherAssets = async () => {
    return new Promise(async (resolve) => {
        if (!CoNET_Data?.profiles) {
            logger(`getAllOtherAssets Error! CoNET_Data.profiles empty!`)
            return resolve(false)
        }

        const timeStamp = new Date().getTime()
        if (timeStamp - lastgetAllOtherAssetsBalanceTimeStamp < minCheckTimestamp) {
            return resolve(true)
        }

        if (runninggetAllOtherAssets) {
            logger(`getAllOtherAssets already running! return false`)
            return resolve(true)
        }

        runninggetAllOtherAssets = true
        lastgetAllOtherAssetsBalanceTimeStamp = timeStamp
        const runningList: any[] = []
        for (let profile of CoNET_Data.profiles) {
            runningList.push(getProfileAssets_allOthers_Balance(profile))
        }
        await Promise.all(runningList)
        runninggetAllOtherAssets = false
        resolve(true)
        
    })
}

let leaderboardData
const leaderboardDataDelay = 20

const selectLeaderboard = (block) => new Promise(async (resolve) => {
    const readBlock = block - leaderboardDataDelay

	let leaderboardFree: any
	let allWalletsFree: any
	let leaderboardNodes: any
    [leaderboardFree, allWalletsFree, leaderboardNodes] = await Promise.all([
        getIpfsFile(`${readBlock}_free`),
        getIpfsFile(`free_wallets_${readBlock}`),
        getIpfsFile(`${readBlock}_node`)
    ])

    if (!leaderboardFree?.cntp?.length) {
        return resolve(false)
    }

    leaderboardData = {
        epoch: block - leaderboardDataDelay,
        free_cntp: leaderboardFree.cntp.slice(0, 10),
        free_referrals: leaderboardFree.referrals.slice(0, 10),
        minerRate: (parseFloat(leaderboardFree.minerRate) / 12).toFixed(8),
        totalMiner: leaderboardFree.totalMiner,
    }

    const profiles = CoNET_Data?.profiles
    if (profiles) {
        const profile = profiles[0]
        if (profile) {
            const key = profile.keyID.toLowerCase()
            const referrals_rate_list = leaderboardNodes?.referrals_rate_list
            if (referrals_rate_list?.length) {
                const findIndex = referrals_rate_list.findIndex(n => n.wallet.toLowerCase() === key);
                if (findIndex > -1) {
                    leaderboardData.guardian = referrals_rate_list[findIndex]
                }
            }
            const free_rate_list = leaderboardFree.cntp
            if (free_rate_list?.length) {
                const findIndex = free_rate_list.findIndex(n => n.wallet.toLowerCase() === key);
                if (findIndex > -1) {
                    leaderboardData.free = free_rate_list[findIndex]
                }
            }
        }
    }
    const walltes = allWalletsFree
    //			
    // if (miningProfile !== null && miningConn !== null && epoch - mining_epoch > 10) {
    //     await miningConn.abort()
    //     miningConn = null
    //     miningStatus = 'RESTART'
    //    // await _startMiningV2(miningProfile)
    // }
    // if (miningProfile && walltes?.length) {
    // 	const walltes: string[] = allWalletsFree
    // 	const currentWallet = miningProfile.keyID.toLowerCase()
    // 	const index = walltes.findIndex(n => n.toLowerCase() === currentWallet)
    // 	if (index < 0) {
    // 		logger(`Mining restart`)
    // 		miningStatus = 'RESTART'
    // 	}
    // }
    resolve(true)
})

// const getWasabiFile = async (fileName) => new Promise(resolve => {
//     //const cloudStorageEndpointPath = `/conet-mvp/storage/FragmentOcean/${fileName}`
//     const cloudStorageEndpointUrl = `https://s3.us-east-1.wasabisys.com/conet-mvp/storage/FragmentOcean/${fileName}`;
//     return fetch(cloudStorageEndpointUrl, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json;charset=UTF-8',
//             'Connection': 'close',
//         },
//         cache: 'no-store',
//         referrerPolicy: 'no-referrer'
//     }).then(async (res) => {
//         if (res.status !== 200) {
//             throw (`!200 Error`)
//         }
//         return res.json();
//     }).then(result => {
//         return resolve(result)
//     }).catch(ex => {
//         logger(`getCONET_HoleskyAssets Error!`, ex)
//         return resolve([])
//     })
// })

const getAllProfileAssetsBalance = () => new Promise(async (resolve) => {
    if (!CoNET_Data?.profiles) {
        logger(`getAllProfileAssetsBalance Error! CoNET_Data.profiles empty!`)
        return resolve(false)
    }
    const profiles = CoNET_Data.profiles
    const runningList: any[] = []

    for (let profile of CoNET_Data.profiles) {
        runningList.push(getProfileAssets_CONET_Balance(profile))
        // runningList.push(getProfileAssets_allOthers_Balance(profile))
    }

    await Promise.all(runningList)
    const CNTP_Referrals = new ethers.Contract(ReferralsAddress_cancun, CONET_ReferralsAbi, provideCONET)
    RefereesList = await getAllReferees(profiles[0].keyID, CNTP_Referrals)

    const connt = profiles[0]?.tokens?.conet

    async.mapLimit(profiles, 1, async (n, next) => {
		await getFaucet(n)
	}, () => {

	})
    
    
	
    const cmd = {
        cmd: 'assets',
        data: [profiles]
    }
    sendState('toFrontEnd', cmd)
    return resolve(true)
})


// const getCONET_HoleskyAssets = (wallet) => new Promise(resolve => {
//     if (!wallet) {
//         return resolve([]);
//     }
//     const api_url = `https://scan.conet.network/api/v2/addresses/${wallet.toLowerCase()}/tokens?type=ERC-20%2CERC-721%2CERC-1155`;
//     return fetch(api_url, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json;charset=UTF-8',
//             'Connection': 'close',
//         },
//         cache: 'no-store',
//         referrerPolicy: 'no-referrer'
//     }).then(async (res) => res.json())
//         .then(result => {
//         return resolve(result.items);
//     }).catch(ex => {
//         logger(`getCONET_HoleskyAssets Error!`, ex);
//         return resolve([]);
//     });
// });

let checkcheckUpdateLock = false
let lastCheckcheckUpdateTimeStamp = 0

const getIpfsFile = async (fileName) => new Promise(resolve => {
    //const cloudStorageEndpointPath = `/conet-mvp/storage/FragmentOcean/${fileName}`
    const cloudStorageEndpointUrl = `${ipfsEndpoint}getFragment/${fileName}`
    return fetch(cloudStorageEndpointUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Connection': 'close',
        },
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
    }).then(async (res) => {
        if (res.status !== 200) {
            throw (`!200 Error`)
        }
        return res.json()
    }).then(result => {
        return resolve(result)
    }).catch(ex => {
        logger(`getCONET_HoleskyAssets from getIpfsFile got Error!`, ex)
        return resolve([])
    })
})

const checkIPFSFragmenReadyOrNot = (ver, CoNET_data) => new Promise(async (resolve) => {
    let _chainVer = ver;
    const passward = ethers.id(ethers.id(CoNET_data.mnemonicPhrase));
    const partEncryptPassword = encryptPasswordIssue(_chainVer, passward, 0);
    const firstFragmentName = createFragmentFileName(_chainVer, passward, 0);
    if (!CoNET_data?.fragmentClass) {
        CoNET_data.fragmentClass = {
            mainFragmentName: firstFragmentName,
            failures: 0
        }
    } else {
        CoNET_data.fragmentClass.mainFragmentName = firstFragmentName;
    }

    const firstFragmentEncrypted = await getFragmentsFromPublic(firstFragmentName);
    if (!firstFragmentEncrypted) {
        return resolve(false)
    }

    let firstFragmentObj
    try {
        const firstFragmentdecrypted = await CoNETModule.aesGcmDecrypt(firstFragmentEncrypted, partEncryptPassword);
        firstFragmentObj = JSON.parse(firstFragmentdecrypted);
    }

    catch (ex) {
        return resolve(false)
    }
    const totalFragment: any = []
    for (let i = 0; i < firstFragmentObj.totalFragment; i++) {
        totalFragment.push(i)
    }


    let success = false
    await async.mapLimit(totalFragment, 3, async (n, next) => {
        const cleartext = await getNextFragmentIPFS(_chainVer, passward, n)
        if (cleartext) {
            success = true
        }
    })
    return resolve(success)
})

const getDetermineVersionProfile = (ver, CoNET_Data) => new Promise(async (resolve) => {
    //	give up get remote version， try back to previous version
    // const failures = async () => {
    // 	logger(`getVersonFragments getFragmentsFromPublic error! Fragment of ver number${chainVer1} `)
    // 	fragmentClass.failures = _chainVer - 1
    // 	return await tryGetProfile (CoNET_Data)
    // }
    let _chainVer = ver
    const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
    const partEncryptPassword = encryptPasswordIssue(_chainVer, passward, 0)
    const firstFragmentName = createFragmentFileName(_chainVer, passward, 0)
    if (!CoNET_Data.fragmentClass) {
        CoNET_Data.fragmentClass = {
            mainFragmentName: firstFragmentName
        }
    }

    CoNET_Data.fragmentClass.mainFragmentName = firstFragmentName
    const firstFragmentEncrypted = await getFragmentsFromPublic(firstFragmentName)
    if (!firstFragmentEncrypted) {
        //	try to get Previous bersion
        if (ver > 2) {
            return resolve(await getDetermineVersionProfile(ver - 1, CoNET_Data))
        }
        return resolve(false)
    }
    logger(`checkUpdateAccount fetch ${_chainVer} first Fragment [${firstFragmentName}] with passward [${partEncryptPassword}]`)
    let firstFragmentObj
    try {
        const firstFragmentdecrypted = await CoNETModule.aesGcmDecrypt(firstFragmentEncrypted, partEncryptPassword);
        firstFragmentObj = JSON.parse(firstFragmentdecrypted);
    }
    catch (ex) {
        return resolve(false)
    }

    const totalFragment = firstFragmentObj.totalFragment
    let clearData = firstFragmentObj.data
    const series: any = []

    for (let i = 1; i < totalFragment; i++) {
        const stage = next => {
            getNextFragmentIPFS(_chainVer, passward, i)
                .then(text => {
                if (!text) {
                    return next(`getNextFragment [${i}] return NULL Error`);
                }
                clearData += text
                return next(null)
            })
        }
        series.push(stage)
    }

    return async.series(series)
        .then(async () => {
        let profile
        profile = JSON.parse(clearData)
        if (CoNET_Data) {
            CoNET_Data.profiles = profile
            CoNET_Data.ver = _chainVer
            CoNET_Data.fragmentClass.failures = 0
        }
        await storagePieceToLocal()
        await storeSystemData()
        const cmd = {
            cmd: 'profileVer',
            data: [_chainVer]
        };
        sendState('toFrontEnd', cmd);
        return resolve(true)
    }).catch(ex => {
        return resolve(false)
    })
})

const splitTextLimitLength = (test, limitLength) => {
    const ret: any = []
    let start = 0
    let _limitLength = test.length > limitLength ? limitLength : test.length / 2
    const split = () => {
        const price = test.substring(start, _limitLength + start)
        if (price.length) {
            ret.push(price)
            start += _limitLength
        }
        if (start < test.length) {
            return split()
        }
        return ret
    }
    return split()
}

const getLocalProfile = (ver) => new Promise(async (resolve) => {
    if (!CoNET_Data?.profiles || !passObj) {
        resolve(false);
        return logger(`updateProfilesVersion !CoNET_Data[${!CoNET_Data}] || !passObj[${!passObj}] === true Error! Stop process.`);
    }
    const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
    const partEncryptPassword = encryptPasswordIssue(ver, passward, 0)
    const firstFragmentName = createFragmentFileName(ver, passward, 0)
    let firstFragmentObj
    try {
        const firstFragmentEncrypted = await getHashData(firstFragmentName)
        const firstFragmentdecrypted = await CoNETModule.aesGcmDecrypt(firstFragmentEncrypted, partEncryptPassword);
        firstFragmentObj = JSON.parse(firstFragmentdecrypted)
    }
    catch (ex) {
        resolve(false)
        return logger(`getLocalProfile JSON.parse(firstFragmentdecrypted) Error!`)
    }
    //logger(`getLocalProfile ver [${ver}] first Fragment [${firstFragmentName}] with password [${partEncryptPassword}]`)
    const totalFragment = firstFragmentObj.totalFragment
    let clearData = firstFragmentObj.data
    const series: any = []
    for (let i = 1; i < totalFragment; i++) {
        const stage = next => {
            getNextFragmentLocal(ver, passward, i).then(text => {
                if (!text) {
                    return next(`getNextFragment return NULL Error`)
                }
                clearData += text
                return next(null)
            })
        }
        series.push(stage)
    }
    return async.series(series).then(() => {
        sendState('beforeunload', false)
        const profile = JSON.parse(clearData)
        if (CoNET_Data) {
            CoNET_Data.profiles = profile
            CoNET_Data.ver = ver
        }
        resolve(true)
    }).catch(ex => {
        sendState('beforeunload', false)
        logger(`async.series catch ex`, ex)
        resolve(false)
    })
})

const getNextFragmentLocal = async (ver, passObjPassword, i) => {
    const nextEncryptPassword = encryptPasswordIssue(ver, passObjPassword, i);
    const nextFragmentName = createFragmentFileName(ver, passObjPassword, i);
    try {
        const EncryptedText = await getHashData(nextFragmentName);
        //logger(`getNextFragmentLocal get nextFragment [${nextFragmentName}] length = ${EncryptedText.length}`)
        const decryptedText = await CoNETModule.aesGcmDecrypt(EncryptedText, nextEncryptPassword);
        const decryptedFragment = JSON.parse(decryptedText);
        return decryptedFragment.data;
    }
    catch (ex) {
        logger(`getNextFragment error!`, ex);
        return '';
    }
};

const getReferees = async (wallet, CNTP_Referrals) => {
    let result = [];
    try {
        result = await CNTP_Referrals.getReferees(wallet);
    }
    catch (ex) {
        logger(`getReferees [${wallet}] Error! try again!`);
        return null;
    }
    return result;
};

const getReferee = async (wallet, CNTP_Referrals) => {
    let result = [];
    try {
        result = await CNTP_Referrals.getReferrer(wallet);
    }
    catch (ex) {
        logger(`getReferees [${wallet}] Error! try again!`)
        return null;
    }
    return result;
};

const getAllReferees = async (_wallet, CNTP_Referrals) => {
    const firstArray = await getReferees(_wallet, CNTP_Referrals);
    if (!firstArray?.length) {
        return [];
    }
    const ret: any[] = []
    const getData = async (wallet) => {
        const kkk = await getReferees(wallet, CNTP_Referrals)
        const data = JSON.parse(`{"${wallet}": ${JSON.stringify(kkk)}}`)
        return data
    }

    for (let i = 0; i < firstArray.length; i++) {
        const kk = await getReferees(firstArray[i], CNTP_Referrals)
        const ret1: any = []

        if (kk?.length) {
            for (let j = 0; j < kk.length; j++) {
                ret1.push(await getData(kk[j]))
            }
        }
        const data = `{"${firstArray[i]}": ${JSON.stringify(ret1)}}`
        const k = JSON.parse(data);
        ret.push(k)
    }
    return ret
}

let getFaucetRoop = 0

const getFaucetFromSmartContract: (profile: profile) => Promise<boolean|any> = async (profile: profile) => {
	const wallet = new ethers.Wallet (profile.privateKeyArmor, provideCONET)
	const faucetSC = new ethers.Contract (CONET_Faucet_Smart_Contract_addr, faucet_ABI, wallet)
	try {
		const tx = await faucetSC.getFaucet()
		const tr = await tx.wait()
		return tr
	} catch (ex: any) {
		logger(`getFaucetFromSmartContract call smart contract Error!`, ex.message)
		return false
	}
}

const getFaucet: (profile: profile) => Promise<boolean|any> = async (profile) => new Promise(async (resolve) => {

	const conet = profile?.tokens?.conet

	const health = await getCONET_api_health()
	if (!health) {
		return resolve(false)
	}

    const url = `${apiv4_endpoint}conet-faucet`
    let result
    try {
        result = await postToEndpoint(url, true, { walletAddr: profile.keyID })
    }

    catch (ex) {
        logger(`getFaucet postToEndpoint [${url}] error! `, ex)
        return resolve(false)
    }
	setTimeout(() => {
		return resolve (true)
	}, 1000)
	
})

const getProfileTicketsBalance = async (profile: profile) => {
  const provide = new ethers.JsonRpcProvider(conet_cancun_rpc);
  const wallet = new ethers.Wallet(profile.privateKeyArmor, provide);
  const ticketSmartContract = new ethers.Contract(
    ticketContractAddress,
    ticketAbi,
    wallet
  );

  try {
    const ticketBalance = await ticketSmartContract.balanceOf(profile.keyID, 1);
    console.log(`ticket balance = ${ticketBalance}`);
    profile.tickets = { balance: ticketBalance.toString() };
  } catch (ex) {
    console.log(ex);
  }
};

const createKeyHDWallets = () => {    
    try {
        const root = ethers.Wallet.createRandom()
		return root
    }
    catch (ex) {
        return null
    }
}

const isWalletAgent = async (cmd) => {
	const [walletKeyId] = cmd.data

    if (!walletKeyId || !ethers.isAddress(walletKeyId)) {
        cmd.err = "INVALID DATA";
        return returnUUIDChannel(cmd);
    }
    
    const provideNewCONET = new ethers.JsonRpcProvider(conet_cancun_rpc);
    
    const ConetianContract = new ethers.Contract(
      nftContract,
      CONETianPlan_ABI,
      provideNewCONET
    );
    
    try {
        const isWalletAgent = await ConetianContract.isReferrer(walletKeyId);
        cmd.data = [isWalletAgent];
    } catch (err) {
        logger(`isWalletAgent error`, err);
        cmd.err = "FAILURE";
    }

    return returnUUIDChannel(cmd)
}

const decryptSystemData = async () => new Promise((resolve, reject) => {
    //	old version data
    if (!CoNET_Data || !passObj) {
        resolve(null);
        return new Error(`decryptSystemData Have no CoNET_Data Error!`);
    }
    const password = passObj.passcode.toString();
    if (!password) {
        resolve(null);
        throw new Error(`decryptSystemData Password Empty Error!`);
    }
    const filenameIterate1 = ethers.id(password);
    const filenameIterate2 = ethers.id(filenameIterate1);
    const filenameIterate3 = ethers.id(ethers.id(ethers.id(filenameIterate2)));
    const process = async (CoNET_Data) => {
        const filename = filenameIterate3;
        const encryptedObj = await getHashData(filename);
        let encryptIterate1;
        try {
            const encryptIterate3 = await CoNETModule.aesGcmDecrypt(encryptedObj, filenameIterate2);
            const encryptIterate2 = await CoNETModule.aesGcmDecrypt(encryptIterate3, filenameIterate1);
            encryptIterate1 = await CoNETModule.aesGcmDecrypt(encryptIterate2, password);
        }
        catch (ex) {
            return reject(false);
        }
        const obj = JSON.parse(encryptIterate1);
        CoNET_Data.mnemonicPhrase = obj.mnemonicPhrase;
        CoNET_Data.fx168Order = obj.fx168Order;
        CoNET_Data.ver = obj.ver || 1;
        CoNET_Data.upgradev2 = obj.upgradev2;
        return resolve(true);
    };
    if (sendStateBeforeunload) {
        const sendChannel = new BroadcastChannel('beforeunload');
        return sendChannel.onmessage = (ev) => {
            return process(CoNET_Data);
        };
    }
    return process(CoNET_Data)
})

//*		scan assets
const scanCONET_dWBNB = async (walletAddr) => {
    return await scan_erc20_balance(walletAddr, conet_dWBNB, provideCONET)
}

const updateProfilesVersionToIPFS = () => new Promise(async (resolve) => {
    if (!CoNET_Data?.profiles || !passObj) {
        logger(`updateProfilesVersion !CoNET_Data[${!CoNET_Data}] || !passObj[${!passObj}] === true Error! Stop process.`);
        return resolve(false);
    }
    const profile = CoNET_Data.profiles[0]

    const privateKeyArmor = profile.privateKeyArmor || ''

    if (!profile || !privateKeyArmor) {
        logger(`updateProfilesVersion Error! profile empty Error! `)
        return resolve(false)
    }

	const conet = profile?.tokens?.conet
	if ( !conet || conet.balance < '0.0005') {
		return resolve(false)
	}


    let chainVer
    try {
        [, chainVer] = await checkProfileVersion(profile.keyID);
        const health = await getCONET_api_health();
        if (!health) {
            logger(`CONET api server hasn't health`);
            return resolve(false);
        }
    }
    catch (ex: any) {
        logger(`updateProfilesVersion checkProfileVersion or getCONET_api_health had Error!`, ex.message)
        return resolve(false)
    }


    const passward = ethers.id(ethers.id(CoNET_Data.mnemonicPhrase))
    const profilesClearText = JSON.stringify(CoNET_Data.profiles)
    const fileLength = Math.round(1024 * (10 + Math.random() * 20))
    const chearTextFragments = splitTextLimitLength(profilesClearText, fileLength)
    const series: any[] = []
    sendState('beforeunload', true)

    chearTextFragments.forEach((n, index) => {
        series.push(storagePieceToIPFS(passward, n, index, chearTextFragments.length, fileLength, chainVer, privateKeyArmor, profile.keyID))
    })
    try {
        await Promise.all([
            ...series
        ])
        const cloud = await checkIPFSFragmenReadyOrNot(chainVer, CoNET_Data)
        if (!cloud) {
            logger(`updateProfilesVersionToIPFS has failed!`)
            return resolve(false)
        }
    }
    catch (ex) {
        sendState('beforeunload', false)
        logger(`updateProfilesVersion Error!`)
        return resolve(false)
    }
    resolve(true)
});

const scanCONET_dUSDT = async (walletAddr: string, privideCONET) => {
    return await scan_erc20_balance(walletAddr, privideCONET, conet_dUSDT)
};

const scanCONET_dWETH = async (walletAddr: string, privideCONET) => {
    return await scan_erc20_balance(walletAddr, privideCONET, conet_dWETH)
};

const scanCONETDepin = async (walletAddr: string) => {
    return await scan_erc20_balance(
      walletAddr,
      conetDepinContractAddress,
      conetDepinProvider
    );
};

const scanCONETHolesky = async (walletAddr: string, privideCONET) => {
    return await scan_natureBalance(privideCONET, walletAddr)
}

const scanCNTPV1 = async (walletAddr: string) => {
    return await scan_erc20_balance(walletAddr, CONET_CNTP_V1_Addr, provideCONET)
}

const scanCCNTP = async (walletAddr: string) => {
    return await scan_erc20_balance(walletAddr, cCNTP_cancun_Addr, provideCONET)
}

const scanCNTP = async (walletAddr: string) => {
    return await scan_erc20_balance(walletAddr, blast_mainnet_CNTP, provideCONET)
}

const scanUSDT = async (walletAddr: string) => {
    return await scan_erc20_balance(walletAddr, eth_usdt_contract, provideETH)
}

const scanUSDB = async (walletAddr: string) => {
    return await scan_erc20_balance(walletAddr,blast_usdb_contract, provideBlastMainChain)
}

const scanETH = async (walletAddr: string) => {
    return await scan_natureBalance(provideETH, walletAddr)
}

const scanBlastETH = async (walletAddr: string) => {
    return await scan_natureBalance(provideBlastMainChain, walletAddr)
}

const scanWBNB = async (walletAddr: string) => {
    return await scan_erc20_balance(walletAddr, bnb_wbnb_contract, provideBNB)
}

const scanArbETH = async (walletAddr: string) => {
	return await scan_natureBalance(provideArbOne, walletAddr)
}

const scanTron = async (walletAddr: string) => {
	return await scan_natureBalance (provideTron, walletAddr)
}

const scanWUSDT = async (walletAddr: string) => {
    return await scan_erc20_balance(walletAddr, bnb_usdt_contract, provideBNB)
}

const scanTronUSDT = async(walletAddr: string) => {
	return await scan_erc20_balance(walletAddr, tron_USDT, provideTron)
}

const scanArbUSDT = async(walletAddr: string) => {
	return await scan_erc20_balance(walletAddr, Arbitrum_USDT, provideArbOne)
}

const scanBNB = async (walletAddr) => {
    return await scan_natureBalance(provideBNB, walletAddr)
}

const scanConetETH = async (walletAddr: string) => {
    return await scan_natureBalance(conetDepinProvider, walletAddr);
};

const scan_natureBalance = (provider, walletAddr) => new Promise(async (resolve) => {
    try {
        const result = await provider.getBalance(walletAddr)
        return resolve(result)
    }
    catch (ex) {
        logger(`scan_natureBalance Error!`, ex)
        return resolve(false)
    }
})

//				Claimable	

const scanCONET_Claimable_BNBUSDT = async (walletAddr: string) => {
    return await scan_erc20_balance(walletAddr, claimable_BNB_USDT, provideCONET)
}

// const scanCONET_Claimable_BlastUSDB = async (walletAddr) => {
//     return await scan_erc20_balance(walletAddr, Claimable_BlastUSDBv3, provideCONET)
// }

// const scanCONET_Claimable_BlastETH = async (walletAddr: string, privideCONET: any) => {
// 	return await scan_erc20_balance(walletAddr, privideCONET, Claimable_BlastETH)
// }

const scanCONET_Claimable_BNB = async (walletAddr: string) => {
	return await scan_erc20_balance(walletAddr, claimable_BNB, provideCONET)
}

const scanCONET_Claimable_ETH = async (walletAddr: string) => {
	return await scan_erc20_balance(walletAddr, claimable_ETH, provideCONET)
}

const scanCONET_Claimable_Arb_ETH = async (walletAddr: string) => {
	return await scan_erc20_balance(walletAddr, claimable_Arb_ETH, provideCONET)
}

const scanCONET_Claimable_Arb_USDT = async (walletAddr: string) => {
	return await scan_erc20_balance(walletAddr, claimable_Arb_USDT, provideCONET)
}

const scanCONET_Claimable_ETHUSDT = async (walletAddr) => {
    return await scan_erc20_balance(walletAddr, claimable_USDT, provideCONET)
}

const scan_erc20_balance: (walletAddr: string, erc20Address: string, provide: any)=> Promise<false|BigInt> = (walletAddr, erc20Address, provide) => new Promise(async (resolve) => {
    const erc20 = new ethers.Contract(erc20Address, blast_CNTPAbi, provide)
    try {
        const result = await erc20.balanceOf(walletAddr)
        return resolve(result)
    }
    catch (ex) {
        logger(`scan_erc20_balance Error!`)
        return resolve(false)
    }
})

const getBalanceByTimestamp = async (erc20Contract, walletAddress: string, timestamp: number)=>{
    try {
        const block = await getBlockByTimestamp(provideCONET, timestamp);
        const balance = await getBalanceByBlockNumber(erc20Contract, walletAddress, block);
        
        return balance
    } catch (ex) {
        console.log("historic balance error", ex);
        return 0
    }
}

const getBalanceByBlockNumber = async (erc20Contract, walletAddress, block)=>{
    try {
        const balance = await erc20Contract.balanceOf(walletAddress, {
        blockTag: block.number,
        });

        return balance
    } catch (ex) {
        throw ex;
    }
}

const getBlockByTimestamp = async (
  provider: any,
  targetTimestamp: number
) => {
  let latestBlock = await provider.getBlock("latest");
  let earliestBlock = await provider.getBlock(0);

  // Ensure the target timestamp is valid
  if (targetTimestamp < earliestBlock.timestamp) {
    throw new Error("Timestamp is earlier than the first block");
  }

  if (targetTimestamp > latestBlock.timestamp) {
    throw new Error("Timestamp is in the future");
  }

  // Binary search for the block
  let low = 0;
  let high = latestBlock.number;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const block = await provider.getBlock(mid);

    if (block.timestamp === targetTimestamp) {
      return block; // Exact match
    } else if (block.timestamp < targetTimestamp) {
      low = mid + 1; // Target is in the future
    } else {
      high = mid - 1; // Target is in the past
    }
  }

  // Return the closest block (either `low` or `high` will work here)
  const closestBlock = await provider.getBlock(low);

  return closestBlock;
}

const scan_Guardian_Nodes = async (walletAddr) => {
    return await scan_src1155_balance(walletAddr, CONET_Guardian_Nodes_V6_cancou, GuardianNftId)
}

const scan_Guardian_ReferralNodes = async (walletAddr) => {
    return await scan_src1155_balance(walletAddr, CONET_Guardian_Nodes_V6_cancou, GuardianReferrerNftId)
}

const scan_CONETianPlanAddr = async (walletAddr) => new Promise(async resolve => {
	const CONETianPlanContract = new ethers.Contract(CONETianPlanAddr_cancun, CONETianPlan_ABI, provideCONET)
	try {
		const [balanceGuardian, balanceReferrer, availableBalance] = await Promise.all([
			CONETianPlanContract.balanceOf(walletAddr, ConetianNftId),
			CONETianPlanContract.balanceOf(walletAddr, ConetianReferrerNftId),
			CONETianPlanContract.getAvailableBalance()
		])

		return resolve({balanceGuardian, balanceReferrer, availableBalance})
	} catch (ex) {
		resolve (false)
	}
})

const scan_GuardianPlanAddr = async (walletAddr) => new Promise(async resolve => {
	const GuardianPlanContract = new ethers.Contract(
    CONET_Guardian_Nodes_V6_cancou,
    guardian_erc1155,
    provideCONET
  );
	try {
		const [balanceGuardian, balanceReferrer, nodeNftId] = await Promise.all([
      GuardianPlanContract.balanceOf(walletAddr, GuardianNftId),
      GuardianPlanContract.balanceOf(walletAddr, GuardianReferrerNftId),
      GuardianPlanContract.ownershipForNodeID(walletAddr),
    ]);
		return resolve({balanceGuardian, balanceReferrer, nodeNftId})
	} catch (ex) {
		resolve (false)
	}
})

const scan_src1155_balance: (walletAddr: string, erc1155Address: string, id: number) => Promise<false|BigInt> = (walletAddr, erc1155Address, id) => new Promise(async (resolve) => {
    const erc1155 = new ethers.Contract(erc1155Address, guardian_erc1155, provideCONET)
    try {
        const result = await erc1155.balanceOf(walletAddr, id)
        return resolve(result)
    }
    catch (ex) {
        logger(`scan_src1155_balance Error!`)
        return resolve(false)
    }
})

const getNetwork = (networkName) => {
    switch (networkName) {
        // case 'usdb':
        // case 'blastETH':
        //     {
        //         return blast_mainnet()
        //     }
        case 'cCNTP':
        case 'cUSDB':
        case 'cCNTP':
        case 'cUSDT':
        case 'cBNBUSDT':
        case 'conet':
        case 'cntpb':
            {
                return conet_cancun_rpc
            }
        case 'conetDepin':
        case 'conet_eth':
            {
                return mainChain_rpc
            }
        case 'usdt':
        case 'eth':
            {
                return ethRpc()
            }
        case 'wusdt':
        case 'bnb':
            {
                return bsc_mainchain
            }
		case 'arb_eth':
		case 'arb_usdt': {
			return Arbitrum_One_RPC
		}
        // case 'cntp':
        //     {
        //         return blast_sepoliaRpc
        //     }
        default: {
            return ''
        }
    }
}

const getProvider = (network) => {
    switch (network.toLowerCase().replaceAll(' ', '')) {
        case 'conetholesky': {
            return new ethers.JsonRpcProvider(conet_cancun_rpc)
        }
        case 'conetdepin': {
            return new ethers.JsonRpcProvider(mainChain_rpc)
        }
        default: {
            return new ethers.JsonRpcProvider(conet_cancun_rpc)
        }
    }
}

const getAssetERC20Address = (assetName) => {
    switch (assetName) {
        case 'usdt': {
            return eth_usdt_contract
        }
        case 'wusdt': {
            return bnb_usdt_contract
        }
        case 'usdb': {
            return blast_usdb_contract
        }
        case 'dWBNB': {
            return conet_dWBNB
        }
        case 'dUSDT': {
            return conet_dUSDT
        }
        case 'dWETH': {
            return conet_dWETH
        }
        case 'cCNTP': {
            return cCNTP_cancun_Addr
        }
		case 'arb_usdt': {
			return Arbitrum_USDT
		}
        default: {
            return ``
        }
    }
}

const CONET_guardian_purchase_Receiving_Address = (networkName) => {
    switch (networkName) {
		case 'eth':
		case 'usdc':
		case 'dai':
        case 'usdt':{
			return `0x4875bbae10b74F9D824d75281B5A4B5802b147f5`
		}
        case 'bnb':
        case 'wusdt':{
			return `0xaFFb573f6a5F0C9b491775FD3F932b52ccf4eAfF`
		}
        case 'arb_eth':
		case 'arb_usdt':{
			return '0x97E96Cc8Ee4f6373e87C77E98fAF1A6FfA8548f2'
		}
		// case 'usdb':{
		// 	return `0x4A8E5dF9F1B2014F7068711D32BA72bEb3482686`
		// }
        default: {
            return ``
        }
    }
}

const parseEther = (_ether, tokenName) => {
	const ether = typeof (_ether) === 'number' ? _ether.toFixed(8) : _ether

    switch (tokenName) {
		case 'arb_usdt':
        case 'usdt': {
            return ethers.parseUnits(ether, 6)
        }

        default: {
            return ethers.parseEther(ether)
        }
    }
}

const getEstimateGas = (privateKey, asset, _transferNumber) => new Promise(async (resolve) => {
    const provide = new ethers.JsonRpcProvider(getNetwork(asset))
    const wallet = new ethers.Wallet(privateKey, provide)
    const toAddr = CONET_guardian_purchase_Receiving_Address(asset)

    let _fee
    const transferNumber = parseEther(_transferNumber, asset)
    const smartContractAddr = getAssetERC20Address(asset)
    if (smartContractAddr) {

        const estGas = new ethers.Contract(smartContractAddr, blast_CNTPAbi, wallet)
        try {
            _fee = await estGas.transfer.estimateGas(toAddr, transferNumber)
            //_fee = await estGas.safetransferFrom(keyAddr, toAddr, transferNumber)
        }
        catch (ex) {
            return resolve(false)
        }
    }
    else {
        const tx = {
            to: toAddr,
            value: transferNumber
        };
        try {
            _fee = await wallet.estimateGas(tx)
        }
        catch (ex) {
            return resolve(false);
        }
    }
    try {
        const Fee = await provide.getFeeData();
        const gasPrice = ethers.formatUnits(Fee.gasPrice, 'gwei')
        const fee = parseFloat(ethers.formatEther(_fee * Fee.gasPrice)).toFixed(8)
        return resolve({ gasPrice, fee })
    }
    catch (ex) {
        return resolve(false)
    }
})

const getEstimateGasForTokenTransfer = (privateKey: string, asset: string, _transferNumber: string, toAddr: string) => new Promise(async (resolve) => {
    const provide = new ethers.JsonRpcProvider(getNetwork(asset))
    const wallet = new ethers.Wallet(privateKey, provide)
    let _fee
    const transferNumber = parseEther(_transferNumber, asset)
    const smartContractAddr = getAssetERC20Address(asset)
    if (smartContractAddr) {
        const estGas = new ethers.Contract(smartContractAddr, blast_CNTPAbi, wallet)
        try {
            _fee = await estGas.transfer.estimateGas(toAddr, transferNumber)
        }
        catch (ex) {
            return resolve(false)
        }
    }
    else {
        const tx = {
            to: toAddr,
            value: transferNumber,
        }
        try {
            _fee = await wallet.estimateGas(tx)
        }
        catch (ex) {
            return resolve(false)
        }
    }
    try {
        const Fee = await provide.getFeeData();
        const gasPrice = ethers.formatUnits(Fee.gasPrice, 'gwei')
        const fee = parseFloat(ethers.formatEther(_fee * Fee.gasPrice)).toFixed(8)
        return resolve({ gasPrice, fee })
    }
    catch (ex) {
        return resolve(false)
    }
})

const getEstimateGasForNftTransfer = (
  privateKey,
  nftObj,
  transferAmount,
  toAddr
) =>
  new Promise(async (resolve) => {
    const provider = getProvider(nftObj.network);
    const wallet = new ethers.Wallet(privateKey, provider);
    let _fee;
    const smartContractAddr = nftObj?.contractAddress;

    if (smartContractAddr) {
      const estGas = new ethers.Contract(smartContractAddr, nftObj?.contractAbi, wallet);
      try {
        _fee = await estGas.safeTransferFrom.estimateGas(
          wallet.address,
          toAddr,
          nftObj?.id,
          transferAmount,
          "0x"
        );
      } catch (ex) {
        return resolve(false);
      }
    } else {
      const tx = {
        to: toAddr,
        value: transferAmount,
      };
      try {
        _fee = await wallet.estimateGas(tx);
      } catch (ex) {
        return resolve(false);
      }
    }

    try {
      const Fee = await provider.getFeeData();
      const gasPrice = ethers.formatUnits(Fee.gasPrice, "gwei");
      const fee = parseFloat(ethers.formatEther(_fee * Fee.gasPrice));

      const roundedUpFee = Math.ceil(fee * 100000000) / 100000000;
      let roundedUpFeeStr = roundedUpFee.toFixed(8).toString();

      if (parseFloat(roundedUpFeeStr) === 0) {
        roundedUpFeeStr = roundedUpFeeStr.slice(0, -1) + "1";
      }

      return resolve({ gasPrice, fee: roundedUpFeeStr });
    } catch (ex) {
      return resolve(false);
    }
  });

const CONET_guardian_purchase = async (profile: profile, nodes, totalPrice, tokenName) => {

    let cryptoAsset: CryptoAsset
    // const total = await getAmountOfNodes(nodes, tokenName)
    if (!tokenName || !CoNET_Data?.profiles || !profile?.tokens||! (cryptoAsset = profile.tokens[tokenName])) {
        const cmd1 = {
            cmd: 'purchaseStatus',
            data: [-1]
        }
        sendState('toFrontEnd', cmd1)
        return false
    }


    const _total = getAmountToPay(profile, cryptoAsset, totalPrice);

    if (!_total) {
        const cmd1 = {
        cmd: "purchaseStatus",
        data: [-1],
        };

        sendState("toFrontEnd", cmd1);
        return false;
    }

    if (parseFloat(cryptoAsset.balance) - _total < 0 || !profile.privateKeyArmor) {
        const cmd1 = {
            cmd: 'purchaseStatus',
            data: [-1]
        }
        sendState('toFrontEnd', cmd1)
        return false
    }

    const cmd1 = {
        cmd: 'purchaseStatus',
        data: [1]
    }

    sendState('toFrontEnd', cmd1)

    const tx: any = await transferAssetToCONET_guardian(profile.privateKeyArmor, cryptoAsset.name, _total.toString())
    if (typeof tx === 'boolean') {
        const cmd1 = {
            cmd: 'purchaseStatus',
            data: [-1]
        }
        sendState('toFrontEnd', cmd1)
        return false
    }

    const cmd2 = {
        cmd: 'purchaseStatus',
        data: [2]
    }

    sendState('toFrontEnd', cmd2)

    const kk1: CryptoAssetHistory = {
        status: 'Confirmed',
        Nonce: tx.nonce,
        to: tx.to,
        transactionFee: stringFix(ethers.formatEther(parseFloat(tx.gasUsed)*parseFloat(tx.gasPrice))),
        gasUsed: tx.gasUsed.toString(),
        isSend: true,
        value: parseEther(typeof _total === 'string' ? _total: _total.toFixed(8), cryptoAsset.name).toString(),
        time: new Date().toISOString(),
        transactionHash: tx.hash,
    }

    cryptoAsset.history.push(kk1)

    const profiles = CoNET_Data.profiles
    const publikPool = await createWallet(profiles, CoNET_Data.mnemonicPhrase, nodes)
	
	getProfileAssets_allOthers_Balance(profile)

    const data = {
        receiptTx: tx.hash,
        publishKeys: publikPool,
        nodes: nodes,
        tokenName,
        network: cryptoAsset.network,
        amount: parseEther(_total.toString(), cryptoAsset.name).toString()
    }

    const message = JSON.stringify({ walletAddress: profile.keyID, data })

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
    const url = `${apiv4_endpoint}Purchase-Guardian`
    let result

    try {
        result = await postToEndpoint(url, true, sendData)
    }
    catch (ex) {
        const cmd3 = {
            cmd: 'purchaseStatus',
            data: [-2, kk1]
        }
        sendState('toFrontEnd', cmd3);
        return false
    }

    if (!result) {
        const cmd3 = {
            cmd: 'purchaseStatus',
            data: [-2, kk1]
        }
        sendState('toFrontEnd', cmd3)
        return false
    }
    await storagePieceToLocal()
    await storeSystemData()
    needUpgradeVer = epoch + 25
    return true
}

const stringFix = (num) => {
    const index = num.indexOf('.')
    if (index < 0) {
        return num
    }
    return num.substring(0, index + 12)
}

const transferAssetToCONET_guardian = (privateKey: string, token: string , transferNumber: string) => new Promise(async (resolve) => {
    const provide = new ethers.JsonRpcProvider(getNetwork(token))
    const wallet = new ethers.Wallet(privateKey, provide)
    const toAddr = CONET_guardian_purchase_Receiving_Address(token)
    const smartContractAddr = getAssetERC20Address(token)

    if (smartContractAddr) {
        const transferObj = new ethers.Contract(smartContractAddr, blast_CNTPAbi, wallet)
        const amount = parseEther(transferNumber, token)
        try {
            // const k1 = await transferObj.approve(toAddr, amount)
            const k2 = await transferObj.transfer(toAddr, amount)
			const ts = await k2.wait()
            return resolve(ts)
        }
        catch (ex) {
            return resolve(false)
        }
    }
    else {
        const tx = {
            to: toAddr,
            value: ethers.parseEther(transferNumber)
        }
        try {
			const kk = await wallet.sendTransaction(tx)
			const ts = await kk.wait()
            return resolve(ts)
        }
        catch (ex) {
            return resolve(false)
        }
    }
})

const CONET_transfer_token = async (profile, to, _total, tokenName) => {
    const cryptoAsset = profile.tokens[tokenName];
    if (!cryptoAsset || !CoNET_Data?.profiles) {
        const cmd1 = {
            cmd: 'tokenTransferStatus',
            data: [-1],
        };
        sendState('toFrontEnd', cmd1)
        return false
    }
    if (parseFloat(cryptoAsset.balance) - _total < 0 ||
        !profile.privateKeyArmor) {
        const cmd1 = {
            cmd: 'tokenTransferStatus',
            data: [-1],
        };
        sendState('toFrontEnd', cmd1);
        return false;
    }
    const cmd1 = {
        cmd: 'tokenTransferStatus',
        data: [1],
    }
    sendState('toFrontEnd', cmd1)
    const tx: any = await transferAssetToCONET_wallet(profile.privateKeyArmor, cryptoAsset, _total.toString(), to);
    if (typeof tx === 'boolean') {
        const cmd1 = {
            cmd: 'tokenTransferStatus',
            data: [-1],
        }

        sendState('toFrontEnd', cmd1)
        return false
    }

    const cmd2 = {
        cmd: 'tokenTransferStatus',
        data: [2],
    }
    sendState('toFrontEnd', cmd2)

    const kk1 = {
        status: 'Confirmed',
        Nonce: tx?.nonce?? '',
        to: tx?.to?? '',
        transactionFee: stringFix(ethers.formatEther(parseFloat(tx?.gasUsed?? 0)*parseFloat(tx?.gasPrice?? 0))),
        gasUsed: tx?.gasUsed?.toString()?? '',
        isSend: true,
        value: parseEther(_total?.toString()?? '', cryptoAsset?.name?? '').toString(),
        time: new Date().toISOString(),
        transactionHash: tx?.hash?? '',
    }

    cryptoAsset?.history?.push(kk1)
    await storagePieceToLocal()
    await storeSystemData()
    needUpgradeVer = epoch + 25
    return tx
}

const transferAssetToCONET_wallet = (privateKey, token, transferNumber, toAddr) => new Promise(async (resolve) => {
    const provide = new ethers.JsonRpcProvider(getNetwork(token.name))
    const wallet = new ethers.Wallet(privateKey, provide)
    const smartContractAddr = getAssetERC20Address(token.name)

    if (smartContractAddr) {
        const transferObj = new ethers.Contract(smartContractAddr, blast_CNTPAbi, wallet)
        const amount = parseEther(transferNumber, token.name)
        try {
            // const k1 = await transferObj.approve(toAddr, amount)
            const k2 = await transferObj.transfer(toAddr, amount)
			const k3 = await k2.wait()
            return resolve(k3)
        }
        catch (ex) {
            return resolve(false)
        }
    }
    else {
        const tx = {
            to: toAddr,
            value: ethers.parseEther(transferNumber),
        }
        try {
            return resolve(await wallet.sendTransaction(tx))
        }
        catch (ex) {
            return resolve(false)
        }
    }
})

const getProfileByWallet = (wallet) => {
    if (!CoNET_Data?.profiles) {
        return null;
    }
    const index = CoNET_Data.profiles.findIndex(n => n.keyID.toLowerCase() === wallet.toLowerCase());
    if (index < 0) {
        return null;
    }
    return CoNET_Data.profiles[index];
}

const createWallet = async (profiles, mnemonicPhrase, total) => {

    const pIndex = profiles.map(n => n.index)
    const root = ethers.Wallet.fromPhrase(mnemonicPhrase)
    const nextIndex = pIndex.sort((a, b) => b - a)[0]
    const publikPool: any[] = []

    for (let i = 1; i <= total; i++) {
        const newAcc = root.deriveChild(nextIndex + i)
        const key = await createGPGKey('', '', '')
        publikPool.push(newAcc.address)

        const _profile = {
            isPrimary: false,
            keyID: newAcc.address,
            privateKeyArmor: newAcc.signingKey.privateKey,
            hdPath: newAcc.path,
            index: newAcc.index,
            isNode: true,
            pgpKey: {
                privateKeyArmor: key.privateKey,
                publicKeyArmor: key.publicKey
            },
            referrer: null,
            tokens: {},
            data: {
                alias: `CONET Guardian node${i}`,
                isNode: true
            }
        };
        profiles.push(_profile)
    }
    return publikPool

}

const getFx168OrderStatus = async (oederID, fx168ContractObj, wallet) => {
    try {
        const tx = await fx168ContractObj.OrderStatus(oederID);
        const nodes = await fx168ContractObj.balanceOf(wallet, oederID);
        return { id: oederID.toString(), nodes: nodes.toString(), status: tx.toString() };
    }
    catch (ex) {
        return null;
    }
}

const fx168PrePurchase = async (cmd) => {
    const [nodes] = cmd.data;
    if (!nodes || !CoNET_Data || !CoNET_Data.profiles) {
        cmd.err = 'INVALID_DATA';
        return returnUUIDChannel(cmd);
    }
    const profiles = CoNET_Data.profiles;
    if (!CoNET_Data.fx168Order) {
        CoNET_Data.fx168Order = [];
    }
    const publikPool = await createWallet(profiles, CoNET_Data.mnemonicPhrase, nodes);
    const provideCONET = new ethers.JsonRpcProvider(conet_cancun_rpc);
    const wallet = new ethers.Wallet(profiles[0].privateKeyArmor, provideCONET);
    const fx168ContractObj = new ethers.Contract(fx168OrderContractAddress, fx168_Order_Abi, wallet);
    const fx168ContractObjRead = new ethers.Contract(fx168OrderContractAddress, fx168_Order_Abi, provideCONET);
    let tx, kk;
    try {
        tx = await fx168ContractObj.newOrder(publikPool);
        await tx.wait();
        kk = await fx168ContractObjRead.getOwnerOrders(profiles[0].keyID);
    }
    catch (ex) {
        logger(`await fx168ContractObj.newOrder(nodes, publikPool) Error!`, ex);
    }
    const fx168OrderArray: any[] = []
    for (let i of kk) {
        const status = await getFx168OrderStatus(i, fx168ContractObjRead, profiles[0].keyID)
        fx168OrderArray.push(status)
    }
    if (!fx168OrderArray.length) {
        cmd.err = 'NOT_READY'
        return returnUUIDChannel(cmd)
    }
    const last = fx168OrderArray[fx168OrderArray.length - 1]
    cmd.data = [[last]]
    return returnUUIDChannel(cmd)
}

let miningConn: any = null
let Stoping = false
let mining_epoch = 0
let cCNTPcurrentTotal = 0
let miningAddress = ''
let miningProfile:profile|null = null
let miningStatus = 'STOP'

const startMining = async (cmd) => {
    const _authorization_key = cmd.data[0]
    const _profile = cmd.data[1]
    if (!CoNET_Data || !CoNET_Data?.profiles || authorization_key !== _authorization_key || !_profile) {
        cmd.err = 'FAILURE'
        return returnUUIDChannel(cmd)
    }
    const index = CoNET_Data.profiles.findIndex(n => n.keyID.toLowerCase() === _profile.keyID.toLowerCase())
    if (index < 0 || Stoping) {
        cmd.err = 'FAILURE'
        return returnUUIDChannel(cmd)
    }

    const profile = CoNET_Data.profiles[index]

	//return await _startMining(profile, cmd)
	return await _startMiningV2(profile, cmd)
    
}

const getAllReferrer = async () => {

    if (!CoNET_Data?.profiles) {
        return null
    }
    const provideNewCONET = new ethers.JsonRpcProvider(conet_cancun_rpc)
    const CNTP_Referrals = new ethers.Contract(ReferralsAddress_cancun, CONET_ReferralsAbi, provideNewCONET)
    for (let i of CoNET_Data?.profiles) {
        const kk = await getReferrer(i.keyID, CNTP_Referrals);
        if (!kk || kk === '0x0000000000000000000000000000000000000000') {
            delete i.referrer
            continue
        }
        i.referrer = kk
    }
}

const getReferrer = async (wallet, CNTP_Referrals) => {
    let result
    try {
        result = await CNTP_Referrals.getReferrer(wallet)
    }
    catch (ex) {
        logger(`getReferees [${wallet}] Error! try again!`)
        return null
    }
    return result
}

const createMonitoredWalletStructure = (walletAddress):MonitoredWallet => {
    const monitoredWallet: MonitoredWallet = {
        address: walletAddress,
        assets: {
            cntp: {
                id: 'cntp',
                name: 'CNTP',
                balance: '0'
            },
            conet: {
                id: 'conet',
                name: 'CONET',
                balance: '0'
            },
            guardianNft: {
                id: 'guardianNft',
                name: 'Guardian NFT',
                balance: '0'
            },
            conetianNft: {
                id: 'conetianNft',
                name: 'CoNETian NFT',
                balance: '0'
            },
            guardianReferralNft: {
                id: 'guardianReferralNft',
                name: 'Guardian Referral NFT',
                balance: '0'
            },
            conetianReferralNft: {
                id: 'conetianReferralNft',
                name: 'CoNETian Agent NFT',
                balance: '0'
            }
        }
    }

    return monitoredWallet
}

const addMonitoredWallet = async (cmd) => {
    const walletAddress = cmd.data[0]

    if (
        !CoNET_Data ||
        !walletAddress
    ) {
        cmd.err = "FAILURE";
        return returnUUIDChannel(cmd);
    }

    if (!CoNET_Data?.monitoredWallets){
        CoNET_Data.monitoredWallets = []
    }

    if (!CoNET_Data.monitoredWallets.find(w => w.address === walletAddress)) {
        const monitoredWallet: MonitoredWallet = createMonitoredWalletStructure(walletAddress)

        CoNET_Data?.monitoredWallets.push(monitoredWallet)
    }

    await storageHashData(monitoredWalletsDatabase, JSON.stringify(CoNET_Data.monitoredWallets))

    return returnUUIDChannel(cmd)
}

const removeMonitoredWallet = async (cmd) => {
    const walletAddress = cmd.data[0]

    if (
        !CoNET_Data ||
        !walletAddress
    ) {
        cmd.err = "FAILURE";
        return returnUUIDChannel(cmd);
    }

    if (!CoNET_Data?.monitoredWallets) {
        CoNET_Data.monitoredWallets = [];
    }

    if (CoNET_Data.monitoredWallets.find(w => w.address === walletAddress)) {
        CoNET_Data.monitoredWallets = CoNET_Data?.monitoredWallets.filter(w => w.address !== walletAddress)
    }    

    await storageHashData(monitoredWalletsDatabase, JSON.stringify(CoNET_Data.monitoredWallets))

    return returnUUIDChannel(cmd);
}

const getBalanceOfMonitoredWallets = async () => {
    if(!CoNET_Data) {
        return
    }

    if (!CoNET_Data?.monitoredWallets) {
      CoNET_Data.monitoredWallets = [];
    }

    const wallets: MonitoredWallet[] = CoNET_Data?.monitoredWallets

    if (!wallets || wallets.length === 0) {
        return
    }

    const tmpMonitoredWallets: MonitoredWallet[] = []

    for (let wallet of wallets) {
        if(!wallet.assets){
            wallet = createMonitoredWalletStructure(wallet.address)
        }

        const promises: any = []

        promises.push(scanCCNTP(wallet.address));
        promises.push(scanCONETHolesky(wallet.address, provideCONET));
        promises.push(scan_GuardianPlanAddr(wallet.address));
        promises.push(scan_CONETianPlanAddr(wallet.address));

        const [cntp, conet, guardianPlan, conetianPlan] = await Promise.all(promises)

        if (cntp) {
            wallet.assets.cntp.balance = !cntp
                ? ""
                : parseFloat(ethers.formatEther(cntp)).toFixed(6).toString();
        }

        if (conet) {
        wallet.assets.conet.balance = !conet
            ? ""
            : parseFloat(ethers.formatEther(conet)).toFixed(6).toString();
        }

		const conetianData: {
          balanceGuardian: BigInt;
          balanceReferrer: BigInt;
          availableBalance: BigInt;
        } | false = conetianPlan;

        const guardianData: { 
            balanceGuardian: BigInt; 
            balanceReferrer: BigInt; 
            nodeNftId: BigInt 
        } | false = guardianPlan;

        if (conetianData !== false) {
            wallet.assets.conetianNft.balance = conetianData.balanceGuardian.toString();
            wallet.assets.conetianReferralNft.balance =
            conetianData.balanceReferrer.toString();
        }

        if (guardianData !== false) {
            wallet.assets.guardianNft.balance =
            guardianData.balanceGuardian.toString();
            wallet.assets.guardianReferralNft.balance =
            guardianData.balanceReferrer.toString();
        }

        tmpMonitoredWallets.push(wallet)
    }

    CoNET_Data.monitoredWallets = tmpMonitoredWallets
}

const checkAllAvailableAirdropsForAllProfiles = async () =>{
    if (!CoNET_Data) return;

    const profiles = CoNET_Data.profiles;

    if (!profiles) {
      return;
    }

    const promises: Promise<any>[] = []

    promises.push(checkAvailableConetianAirdropForAllProfiles())
    promises.push(checkAvailableCntpAirdropForAllProfiles())
    promises.push(checkAvailablePassportAirdropForAllProfiles());

    const  [conetianAirdrop, cntpAirdrop, passportAirdrop ]: any = await Promise.all(promises)

    for (let i = 0; i < profiles.length; i++) {
        profiles[i].airdrop = { 
            availableConetian: conetianAirdrop?.airdrops[i],
            availableCntp: cntpAirdrop?.airdrops[i],
            availableGuardianPassport: passportAirdrop?.airdrops[i]?.guardianPassport,
            availableConetianPassport: passportAirdrop?.airdrops[i]?.conetianPassport,
        };
    }

    CoNET_Data.profiles = profiles;
};

const checkAvailableConetianAirdropForAllProfiles = async () => {
    if(!CoNET_Data)
        return 

    const profiles = CoNET_Data.profiles

    if (!profiles) {
        return
    }
    
    const airdropPromises: Promise<any>[] = []

    for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i]
        airdropPromises.push(checkAvailableConetianAirdropForProfile(profile))
    }

    const airdropResults = await Promise.all(airdropPromises)

    const results = {
        airdrops: airdropResults,
    }

    return results;
}

const checkAvailableConetianAirdropForProfile = async (profile: profile) => {
    const provider = new ethers.JsonRpcProvider(conet_cancun_rpc)
    const wallet = new ethers.Wallet(profile.privateKeyArmor, provider)
	const contract_update = new ethers.Contract(airdropContract_update_Address_cancun, airdropAbi, wallet)
    try {
        const result = await contract_update.availableCONETianAirDrop(profile.keyID);
        return parseInt(result) / Math.pow(10, 18)	
    } catch (error) {
        console.log(error)
        return 0
    }
}

const checkAvailableCntpAirdropForAllProfiles = async () => {
    if(!CoNET_Data)
        return 

    const profiles = CoNET_Data.profiles

    if (!profiles) {
        return
    }
    
    const availableAirdropPromises: Promise<any>[] = []

    for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i]
        
        availableAirdropPromises.push(checkAvailableCntpAirdropForProfile(profile))
    }

    const airdropResults = await Promise.all(availableAirdropPromises)

    const results = {
        airdrops: airdropResults,
    }

    return results;
}

const checkAvailableCntpAirdropForProfile = async (profile: profile) => {
    const provider = new ethers.JsonRpcProvider(conet_cancun_rpc)
    const wallet = new ethers.Wallet(profile.privateKeyArmor, provider)
    const contract = new ethers.Contract(airdropContractAddress_cancun, airdropAbi, wallet)

    try {
        const result = await contract.availableCNTPAirDrop(profile.keyID);
        return parseInt(result) / Math.pow(10, 18)	
    } catch (error) {
        console.log(error)
        return 0
    }
}

const checkAvailablePassportAirdropForAllProfiles =  async () => {
    if (!CoNET_Data) return;

    const profiles = CoNET_Data.profiles;

    if (!profiles) {
      return;
    }

    const airdropPromises: Promise<passportAirdrop>[] = [];

    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      airdropPromises.push(checkAvailablePassportAirdropsForProfile(profile));
    }

    const airdropResults = await Promise.all(airdropPromises);

    const results = {
      airdrops: airdropResults,
    };

    return results;
};

const getPassportsInfoForAllProfiles = async () => {
    if (!CoNET_Data) return;

    const profiles = CoNET_Data.profiles;

    if (!profiles) {
      return;
    }

    for (const profile of profiles) {
        const passports = await getPassportsInfoForProfile(profile);
        const currentPassport = await getCurrentPassportInfo(profile);

        profile.silentPassPassports = passports;
        profile.activePassport = {
            nftID: currentPassport?.nftIDs?.toString(),
            expires: currentPassport?.expires?.toString(),
            expiresDays: currentPassport?.expiresDays?.toString(),
            premium: currentPassport?.premium,
            }
    }
};

const getCurrentPassportInfoInMainnet = async (profile: profile) => {
  if (!profile) {
    return;
  }

  const wallet = new ethers.Wallet(
    profile.privateKeyArmor,
    conetDepinProvider
  );

  const passportContract = new ethers.Contract(
    passportContractAddress_mainnet,
    passportAbi_mainnet,
    wallet
  );

  try {
    const result = await passportContract.getCurrentPassport(wallet.address);
    return result;
  } catch (ex) {
    console.log(ex);
  }
};

const getCurrentPassportInfo = async (profile: profile) => {
  if (!CoNET_Data) {
    return;
  }

  const resultMainnet = await getCurrentPassportInfoInMainnet(profile);

  return resultMainnet;
};

const getPassportsInfoForProfile = async (profile: profile): Promise<passportInfo[]> => {
    const tmpCancunPassports = await getPassportsInfo(profile, 'cancun');
    const tmpMainnetPassports = await getPassportsInfo(profile, 'mainnet');

    const cancunPassports: passportInfo[] = []
    const mainnetPassports: passportInfo[] = []

    for (let i = 0; i < tmpCancunPassports?.nftIDs?.length; i++) {
        cancunPassports.push({
            walletAddress: profile.keyID,
            nftID: parseInt(tmpCancunPassports.nftIDs[i].toString()),
            expires: parseInt(tmpCancunPassports.expires[i].toString()),
            expiresDays: parseInt(tmpCancunPassports.expiresDays[i].toString()),
            premium: tmpCancunPassports.premium[i],
            network: 'Conet Holesky'
        })
    }

    for (let i = 0; i < tmpMainnetPassports?.nftIDs?.length; i++) {
        mainnetPassports.push({
            walletAddress: profile.keyID,
            nftID: parseInt(tmpMainnetPassports.nftIDs[i].toString()),
            expires: parseInt( tmpMainnetPassports.expires[i].toString()),
            expiresDays: parseInt (tmpMainnetPassports.expiresDays[i].toString()),
            premium: tmpMainnetPassports.premium[i],
            network: 'CONET DePIN'
        })
    }

    const allPassports = cancunPassports.concat(mainnetPassports)

    allPassports?.sort((a, b) => {
        return a.nftID - b.nftID
    })

    return allPassports;
}

const getPassportsInfo = async (profile: profile, chain: string): Promise<passportInfoFromChain> => {  
    let provider;
    let contractAddress;
    let contractAbi;

    if (chain === 'mainnet') {
        provider = conetDepinProvider
        contractAddress = passportContractAddress_mainnet
        contractAbi = passportAbi_mainnet
    } else {
        provider = provideCONET
        contractAddress = passportContractAddress_cancun
        contractAbi = passportAbi_cancun
    }

    const wallet = new ethers.Wallet(profile.privateKeyArmor, provider);
    const passportContract = new ethers.Contract(contractAddress, contractAbi, wallet);

    try {
        const tx = await passportContract.getUserInfo(wallet.address);
        return tx;
    } catch (ex) {
        console.log(ex);
        return {
            nftIDs: [],
            expires: [],
            expiresDays: [],
            premium: []
        }
    }
};

const checkAvailablePassportAirdropsForProfile = async (
  profile: profile
): Promise<passportAirdrop> => {
  const airdropPromises: Promise<any>[] = [];

  airdropPromises.push(
    checkAvailableGuardianPassportAirdropForProfile(profile)
  );
  airdropPromises.push(
    checkAvailableConetianPassportAirdropForProfile(profile)
  );

  const [guardianAirdropResults, conetianAirdropResults] = await Promise.all(
    airdropPromises
  );

  const results: passportAirdrop = {
    guardianPassport: guardianAirdropResults,
    conetianPassport: conetianAirdropResults,
  };

  return results;
};

const checkAvailableGuardianPassportAirdropForProfile = async (profile: profile) => {
  const provider = new ethers.JsonRpcProvider(conet_cancun_rpc);
  const wallet = new ethers.Wallet(profile.privateKeyArmor, provider);
  const contract = new ethers.Contract(
    passportAirdropContractAddress_cancun,
    passportAirdropAbi_cancun,
    wallet
  );
  try {
    const result = await contract.availableGuardianAirdrop(profile.keyID);
    return parseInt(result)
  } catch (error) {
    console.log(error);
    return 0;
  }
};

const checkAvailableConetianPassportAirdropForProfile = async (profile: profile) => {
  const provider = new ethers.JsonRpcProvider(conet_cancun_rpc);
  const wallet = new ethers.Wallet(profile.privateKeyArmor, provider);
  const contract = new ethers.Contract(
    passportAirdropContractAddress_cancun,
    passportAirdropAbi_cancun,
    wallet
  );
  try {
    const result = await contract.availableCONETianAirDrop(profile.keyID);
    return parseInt(result)
  } catch (error) {
    console.log(error);
    return 0;
  }
};

const getGasFeeForCntpAirdrop = async (profile: profile) => {
    const provider = new ethers.JsonRpcProvider(conet_cancun_rpc)
    const wallet = new ethers.Wallet(profile.privateKeyArmor, provider)
    const airdropContract = new ethers.Contract(airdropContractAddress_cancun, airdropAbi, wallet)
    const cntpContract = new ethers.Contract(cCNTP_cancun_Addr, blast_CNTPAbi, wallet)
    const ethInWei = ethers.parseEther(profile?.tokens?.cCNTP?.balance);

    try {
        const cntpContractResult = await cntpContract.approve.estimateGas(airdropContractAddress_cancun, ethInWei);
        const approveGasFee = parseInt(cntpContractResult) / Math.pow(10, 18)	
        
        const airdropContractResult =
          await airdropContract.CNTPAirBridgeAirdrop.estimateGas();
        const airdropGasFee = parseInt(airdropContractResult) / Math.pow(10, 18)	

        return airdropGasFee + approveGasFee
    } catch (error) {
        console.log(error)
        return 0
    }
}

const getGasFeeForConetianAirdrop = async (profile: profile) => {
    const provider = new ethers.JsonRpcProvider(conet_cancun_rpc)
    const wallet = new ethers.Wallet(profile.privateKeyArmor, provider)
    const airdropContract = new ethers.Contract(airdropContractAddress_cancun, airdropAbi, wallet)

    try {
        const airdropContractResult =
          await airdropContract.CONETianBridgeAirdrop.estimateGas();
        const airdropGasFee = parseInt(airdropContractResult) / Math.pow(10, 18)	

        return airdropGasFee
    } catch (error) {
        console.log(error)
        return 0
    }
}

const getGasFeeForGuardianPassportAirdrop = async (profile: profile) => {
  const provider = new ethers.JsonRpcProvider(conet_cancun_rpc);
  const wallet = new ethers.Wallet(profile.privateKeyArmor, provider);
  const contract = new ethers.Contract(
    passportAirdropContractAddress_cancun,
    passportAirdropAbi_cancun,
    wallet
  );

  try {
    const result = await contract.GuardianAirdrop.estimateGas();
    const gasFee = parseInt(result) / Math.pow(10, 18);

    return gasFee;
  } catch (error) {
    console.log(error);
    return 0;
  }
};

const getGasFeeForConetianPassportAirdrop = async (profile: profile) => {
  const provider = new ethers.JsonRpcProvider(conet_cancun_rpc);
  const wallet = new ethers.Wallet(profile.privateKeyArmor, provider);
  const contract = new ethers.Contract(
    passportAirdropContractAddress_cancun,
    passportAirdropAbi_cancun,
    wallet
  );

  try {
    const result = await contract.CONETianAirdrop.estimateGas();
    const gasFee = parseInt(result) / Math.pow(10, 18);

    return gasFee;
  } catch (error) {
    console.log(error);
    return 0;
  }
};

const redeemAirdrop = async (cmd) => {
  const walletAddress = cmd.data[0];
  if (!CoNET_Data || !walletAddress) {
    cmd.err = "FAILURE";
    return returnUUIDChannel(cmd);
  }
  const profile = CoNET_Data.profiles?.find(
    (profile) => profile.keyID === walletAddress
  );
  if (!profile) {
    cmd.err = "FAILURE";
    return returnUUIDChannel(cmd);
  }
  const provider = new ethers.JsonRpcProvider(conet_cancun_rpc);
  const wallet = new ethers.Wallet(profile.privateKeyArmor, provider);
  
  const conetContract = new ethers.Contract(
    airdropContract_update_Address_cancun,
    airdropAbi,
    wallet
  );

  const cntpContract = new ethers.Contract(
    cCNTP_cancun_Addr,
    cCNTP_V8_ABI,
    wallet
  );

  let canCntpAirdropTotal = 0;
  let canConetianAirdropTotal = 0;
  cmd.data = [];

  try {
    canCntpAirdropTotal = await checkAvailableCntpAirdropForProfile(profile);
    canConetianAirdropTotal = await checkAvailableConetianAirdropForProfile(
      profile
    );
    if (canCntpAirdropTotal <= 0 && canConetianAirdropTotal <= 0)
      throw new Error("FAILURE");
	const newBalance = await cntpContract.balanceOf(profile.keyID)
	const bronCNTPValue = parseInt(ethers.formatEther(newBalance))
	// const bronCNTPValue = parseInt((parseFloat(newBalance) * 1000).toFixed(0))/1000 - 0.00001
    if (bronCNTPValue >= 0.001) {
		//		don't brun all balance
        // const ethInWei = ethers.parseEther(bronCNTPValue.toString())
        const approveTx = await cntpContract.bronCNTP(newBalance);
        await approveTx.wait()
      	cmd.data.push(true);
    }
  } catch (error: any) {
    cmd.err = "FAILURE";
    if (error?.reason) {
      cmd.data.push(error?.reason);
    }
    return returnUUIDChannel(cmd);
  }

  try {
    if (canConetianAirdropTotal > 0) {
      const pendingConetianAirdropTx =
        await conetContract.CONETianBridgeAirdrop();
      cmd.data.push(true);
    }
  } catch (error: any) {
    cmd.err = "FAILURE";
    if (error?.reason) {
      cmd.data.push(error?.reason);
    }
  }

  return returnUUIDChannel(cmd);
};

const redeemSilentPassPassport = async (cmd) => {
  const walletAddress = cmd.data[0];

  if (!CoNET_Data || !walletAddress) {
    cmd.err = "FAILURE";
    return returnUUIDChannel(cmd);
  }

  const profile = CoNET_Data.profiles?.find(
    (profile) => profile.keyID === walletAddress
  );

  if (!profile) {
    cmd.err = "FAILURE";
    return returnUUIDChannel(cmd);
  }
  
  const provider = new ethers.JsonRpcProvider(conet_cancun_rpc);
  const wallet = new ethers.Wallet(profile.privateKeyArmor, provider);

  const passportContract = new ethers.Contract(
    passportAirdropContractAddress_cancun,
    passportAirdropAbi_cancun,
    wallet
  );

  let canGuardianAirdropTotal = 0;
  let canConetianAirdropTotal = 0;
  cmd.data = [];

  try {
    canGuardianAirdropTotal = await checkAvailableGuardianPassportAirdropForProfile(profile);
    canConetianAirdropTotal = await checkAvailableConetianPassportAirdropForProfile(profile);

    if (canGuardianAirdropTotal <= 0 && canConetianAirdropTotal <= 0)
        throw new Error("FAILURE");
  } catch (error: any) {
    cmd.err = "FAILURE";
    if (error?.reason) {
      cmd.data.push(error?.reason);
    }
    return returnUUIDChannel(cmd);
  }

  try {
    if (canGuardianAirdropTotal > 0) {
      const pendingGuardianAirdropTx =
        await passportContract.GuardianAirdrop();
      cmd.data.push(true);
    }
  } catch (error: any) {
    cmd.err = "FAILURE";
    if (error?.reason) {
      cmd.data.push(error?.reason);
    }
  }

  try {
    if (canConetianAirdropTotal > 0) {
      const pendingConetianAirdropTx =
        await passportContract.CONETianAirdrop();
      cmd.data.push(true);
    }
  } catch (error: any) {
    cmd.err = "FAILURE";
    if (error?.reason) {
      cmd.data.push(error?.reason);
    }
  }

  return returnUUIDChannel(cmd);
};

const waitBridgeReady = (profile: profile, amount: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const provider = new ethers.JsonRpcProvider(mainChain_rpc);
    const ethTreasuryContract = new ethers.Contract(
      ethTreasuryContractAddress,
      ethTreasuryAbi,
      provider
    );

    const timeout = setTimeout(() => {
      provider.off("block", bridgeTransactionListener);

        const error: any = new Error(
          "Timeout: No matching bridge transaction found within 1 minute"
        );
        error.reason = "Timeout: No matching bridge transaction found within 1 minute";

      reject(error);
    }, 60000); // 1 minute timeout

    function bridgeTransactionListener(blockNumber: number) {
      provider.getBlock(blockNumber).then(async (block) => {
        const transactions = await Promise.all(
          block.transactions.map((tx) => provider.getTransactionReceipt(tx))
        );

        const logs: any[] = [];
        transactions.forEach((tx) => {
          tx.logs.forEach((log) => {
            try {
              const parsedLog = ethTreasuryContract.interface.parseLog(log);
              logs.push({ rawLog: log, parsedLog });
            } catch (error) {
              // Ignore logs that cannot be parsed
            }
          });
        });

        const found = logs.some((log) => {
          const txValueInEth = ethers.formatEther(log?.parsedLog?.args?.[1]);
          return (
            ethTreasuryContractAddress === log?.rawLog?.address &&
            profile.keyID === log?.parsedLog?.args?.[0] &&
            amount === txValueInEth.toString()
          );
        });

        if (found) {
          clearTimeout(timeout);
          provider.off("block", bridgeTransactionListener); // Stop listening
          resolve(); // Resolve the promise
        }
      });
    }

    provider.on("block", bridgeTransactionListener);
  });
};

const bridge = async (cmd: any) => {
    const walletAddress = cmd.data[0];
    const originChain = cmd.data[1];
    const destinationChain = cmd.data[2];
    const tokenName = cmd.data[3];
    const amount = cmd.data[4];

    if (!CoNET_Data || !walletAddress || !originChain || !destinationChain || !tokenName || !amount) {
        cmd.err = "FAILURE";
        return returnUUIDChannel(cmd);
    }

    const profile = CoNET_Data.profiles?.find((profile) => profile.keyID === walletAddress);

    if (!profile) {
        cmd.err = "FAILURE";
        return returnUUIDChannel(cmd);
    }
    
    if(!profile.tokens){
        cmd.err = "FAILURE";
        return returnUUIDChannel(cmd);
    }

    const token = profile.tokens[tokenName];

    try {
      const waitPromise = waitBridgeReady(profile, amount); // Start listening

      const tx: any = await transferAssetToCONET_wallet(
        profile.privateKeyArmor,
        token,
        amount,
        ethTreasuryContractAddress
      );

      if (tx === false) {
        throw new Error('Transfer failed. Check your ETH balance and try again!');
      }

      await waitPromise; // Wait for the condition in listener to be met

      return returnUUIDChannel(cmd);
    } catch (error: any) {
        cmd.err = "FAILURE";
        
        if (!error?.reason) {
            error.reason = 'Bridge failed. Check your ETH balance and try again!'
        }

        cmd.data = []
        cmd.data.push(error?.reason);
        return returnUUIDChannel(cmd);
    }
}

const estimateGasForBridge = async (cmd: any) => {
    const walletAddress = cmd.data[0];
    const tokenName = cmd.data[1];
    const amount = cmd.data[2];

    if (!CoNET_Data || !walletAddress || !tokenName || !amount) {
        cmd.err = "FAILURE";
        return returnUUIDChannel(cmd);
    }

    const profile = CoNET_Data.profiles?.find((profile) => profile.keyID === walletAddress);

    if (!profile) {
        cmd.err = "FAILURE";
        return returnUUIDChannel(cmd);
    }
    
    if(!profile.tokens){
        cmd.err = "FAILURE";
        return returnUUIDChannel(cmd);
    }

    const provider = new ethers.JsonRpcProvider(getNetwork(tokenName));
    const wallet = new ethers.Wallet(profile.privateKeyArmor, provider);

    const tx = {
        to: ethTreasuryContractAddress,
        value: parseEther(amount, tokenName),
    };

    let _fee;
    try {
        try {
            _fee = await wallet.estimateGas(tx)
        } catch (error) {
            throw new Error('Getting gas failed. Check your ETH balance and try again!');
        }

        const Fee = await provider.getFeeData();
        const gasPrice = ethers.formatUnits(Fee.gasPrice, "gwei");
        const fee = parseFloat(ethers.formatEther(_fee * Fee.gasPrice)).toFixed(8);

        cmd.data = [fee, gasPrice];

        return returnUUIDChannel(cmd);
    } catch (error: any) {
        cmd.err = "FAILURE";
        
        if (!error?.reason) {
            error.reason =
              "Getting gas failed. Check your ETH balance and try again!";
        }

        cmd.data = []
        cmd.data.push(error?.reason);
        return returnUUIDChannel(cmd);
    }
}