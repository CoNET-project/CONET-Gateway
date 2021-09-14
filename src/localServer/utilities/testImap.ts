import * as Imap from './Imap'
import { v4 } from 'uuid'

import { inspect } from 'util'
const CoNetTempAccount = [
	{ userName: 'seguro-1@kloak-io.awsapps.com', passwd: 'C2bsd07xie88' },
	//		office 365 account
	{ userName: 'connect1@kloak.app', passwd: 'fdvkgpmhnnqbwjpw' },			//  public 1
	{ userName: 'connect2@kloak.app', passwd: 'djdhvjmftcbmhwdk' },			
	{ userName: 'connect3@kloak.app', passwd: 'yfdwdcrjczlncgxf' },			
	{ userName: 'connect4@kloak.app', passwd: 'ftzldyydgfhzmmgh' },			
	{ userName: 'connect5@kloak.app', passwd: 'zkjxfnfgvlmwgjtp' },			
	{ userName: 'connect7@kloak.app', passwd: 'wjbfsykwdhywdvxv' },			

	//6		Zoho business
	{ userName: 'connect_zoho1@kloak.io', passwd: 'QUA7MjDzWdU2' },			//	public
	{ userName: 'connect_zoho2@kloak.io', passwd: 'Yi1Yiv6xbLBi' },			
	{ userName: 'connect_zoho3@kloak.io', passwd: 'nrk1SqSYCJrh' },			
	{ userName: 'connect_zoho4@kloak.io', passwd: 'S7na8Ty5rimc' },			
	{ userName: 'connect_zoho5@kloak.io', passwd: '5UK3NPWGESJS' },		
	// 11
	{ userName: 'tempaccount1_zoho@kloak.io', passwd: 'G0vPyC3aduiJ' },	
	{ userName: 'tempaccount2_zoho@kloak.io', passwd: '1C0EJ6sB7zFs' },	
	{ userName: 'tempaccount3_zoho@kloak.io', passwd: 'KFNQyKDpRXXY' },	
	{ userName: 'tempaccount4_zoho@kloak.io', passwd: 'WNHrhw5Q3sHI' },	
	{ userName: 'tempaccount5_zoho@kloak.io', passwd: 'mX05YVfDdeLY' },	

	// 16		Yahoo business
	{ userName: 'connect1@kloak.io', passwd: 'qcjuxlyofnlbluml' },			//	public
	{ userName: 'connect2@kloak.io', passwd: 'zuxgdyddcabjwqyo' },	
	{ userName: 'connect3@kloak.io', passwd: 'lgmybnljbcghvyyk' },	
	{ userName: 'connect4@kloak.io', passwd: 'enywulxugeudllhp' },	
	{ userName: 'connect5@kloak.io', passwd: 'qlqmcvnqgtwrydqa' },

	//21
	{ userName: 'f3e1cad6@kloak.io', passwd: 'oawlwhrqmznkwfzj' },
	{ userName: '7d135616@kloak.io', passwd: 'colesfazflwlimyg' },
	{ userName: '4d11f4ae41d1@kloak.io', passwd: 'vzxjjidklrbpztig' },
	{ userName: 'cf9e4262bfc7@kloak.io', passwd: 'arsucnivsccdsohd' },

	//	25		Ionos
	{ userName: 'e6e4534c@conettech.ca', passwd: 'k4A9/zwEt5lQot' },		
	{ userName: '4308e6ada0cd@conettech.ca', passwd: 'SvcAke+4RZJZ7Y' },
	{ userName: '1f521cc0@conettech.ca', passwd: '2/3PV4QVvZAuG' },
	{ userName: 'd548db1268d2@conettech.ca', passwd: 'EhObH9+bsyIK' },
	{ userName: 'e058e909@conettech.ca', passwd: 'yIK2/3PV4Q' },
	{ userName: '391d6225f@conettech.ca', passwd: 'xvYWswH4h.cNMjEwM' },
	{ userName: '3273fa9a7201@conettech.ca', passwd: 'bsyIK2/3PV4QV' },
	{ userName: 'f5d61f1a@conettech.ca', passwd: '4QVvZAuG,S3vO' },
	{ userName: '3273fa9a72@conettech.ca', passwd: 'EhObH9+bsyIK2/' },
	{ userName: 'c114e35f@conettech.ca', passwd: 'X4W+jX9VGan/L' },

	//	35
	{ userName: 'conet_user2@outlook.com', passwd: 'fkuyalsxtgxtfvtl' },
	{ userName: 'conet_user3@outlook.com', passwd: 'tykdxuigjkxvrtqb' },
	{ userName: 'conet_user4@outlook.com', passwd: 'miidvgkuorvdeqkd' },
	{ userName: 'conet_user5@outlook.com', passwd: 'rsohpjotfnunmrmf' },
	{ userName: 'conet_user6@outlook.com', passwd: 'jhzeinimvcrgdyvz' },
	{ userName: 'conet_user7@outlook.com', passwd: 'lcpiscfwhykypitn' },
	{ userName: 'conet_user8@outlook.com', passwd: 'uvwoaciniommyxvz' },

	//	42
	
	//{ userName: 'qtgate_test1@icloud.com', passwd: 'ohcb-nlcl-eakz-ewgg' },
	{ userName: 'qtgate_test2@icloud.com', passwd: 'hrro-clvo-utjm-dtbx' },		//	public
	{ userName: 'qtgate_test3@icloud.com', passwd: 'wipp-uvkb-cupb-ngnp' },
	{ userName: 'qtgate_test4@icloud.com', passwd: 'pnoy-axvy-epdt-racp' },
	{ userName: 'qtgate_test5@icloud.com', passwd: 'uaav-ehgw-mdir-mbcs' },
	{ userName: 'qtgate_test6@icloud.com', passwd: 'tnkb-iixm-ewlv-pjsr' },
	{ userName: 'qtgate_test7@icloud.com', passwd: 'ymdo-bfoe-qipo-islu' },
	{ userName: 'qtgate_test8@icloud.com', passwd: 'qcit-qzjj-bmfn-ooui' },
	{ userName: 'qtgate_test9@icloud.com', passwd: 'eajz-mxae-otnt-njmw' },
	{ userName: 'qtgate_test10@icloud.com', passwd: 'oimd-qrvx-lelz-mogu' },
	//	52
	{ userName: 'qtgate_test11@icloud.com', passwd: 'ncqg-dadz-doln-udrt' },
	{ userName: 'qtgate_test12@icloud.com', passwd: 'vjwe-neje-xinx-czvd' },
	{ userName: 'qtgate_test13@icloud.com', passwd: 'uabm-fqnv-xuuz-ixbr' },
	{ userName: 'qtgate_test14@icloud.com', passwd: 'ptkd-chac-rzxq-qyvj' },
	{ userName: 'qtgate_test15@icloud.com', passwd: 'bunf-hhlr-bhbe-qsjy' },
	{ userName: 'qtgate_test16@icloud.com', passwd: 'mfez-kqco-mrxy-lwmx' },
	{ userName: 'qtgate_test17@icloud.com', passwd: 'zsyj-yyvq-vekk-sdos' },
	{ userName: 'qtgate_test18@icloud.com', passwd: 'ygmt-ftoz-twad-yeeb' },
	{ userName: 'qtgate_test19@icloud.com', passwd: 'ajyi-mvqr-cluc-ufxu' },
	{ userName: 'qtgate_test20@icloud.com', passwd: 'dgiq-slit-nift-ywgy' },

	//	62
	{ userName: 'qtgate_test21@icloud.com', passwd: 'jflx-eakk-gowq-adwu' },
	{ userName: 'qtgate_test22@icloud.com', passwd: 'rcbl-tmrw-skkw-wdnj' },
	{ userName: 'qtgate_test23@icloud.com', passwd: 'qppa-hzvj-bcmr-uwxk' },
	{ userName: 'qtgate_test24@icloud.com', passwd: 'fcji-uoag-drof-uhqf' },
	{ userName: 'qtgate_test25@icloud.com', passwd: 'kvys-eszu-mnnr-nxav' },
	{ userName: 'qtgate_test26@icloud.com', passwd: 'idbi-cuyl-ztvv-vogz' },
	{ userName: 'qtgate_test27@icloud.com', passwd: 'sdeg-rkck-tzza-qapy' },
	{ userName: 'qtgate_test28@icloud.com', passwd: 'etcb-ihzd-rbau-ekol' },
	{ userName: 'qtgate_test29@icloud.com', passwd: 'tslh-ujpp-gbqj-wejo' },

	//	71
	{ userName: 'conet_test1@icloud.com', passwd: 'ihtc-cvzm-eeds-uavs' },
	{ userName: 'conet_test2@icloud.com', passwd: 'cqvi-nrpx-svfk-thin' },
	{ userName: 'conet_test3@icloud.com', passwd: 'zjoz-qpfd-cidx-alln' },
	{ userName: 'conet_test4@icloud.com', passwd: 'xcpi-drdi-ebkh-ujdr' },
	{ userName: 'conet_test5@icloud.com', passwd: 'fhup-ntiz-hnjj-jivu' },
	{ userName: 'conet_test6@icloud.com', passwd: 'rtrd-myng-egrm-jgeg' },


	//	77 namecheap server
	{ userName: 'peter@getseguro.io', passwd: 'Iosubly1' },
]
const logger = (...argv: any ) => {
    const date = new Date ()
    let dateStrang = `[${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}] `
    return console.log ( dateStrang, ...argv )
}
const start = parseInt ( process.argv[2]) || 0
const localImap = CoNetTempAccount[ start ]
const imapServer = Imap.getImapSmtpHost( localImap.userName )
const imapConnectData: imapConnect = {
	
	imapServer: imapServer?.imap||'',
	imapPortNumber: imapServer?.ImapPort || [],
	imapSsl: imapServer?.imapSsl||false,
	imapUserName: localImap.userName,
	imapIgnoreCertificate: false,
	imapUserPassword: localImap.passwd,

}

const inbox = v4()

let i = 0
let l = parseInt ( process.argv[3]) || 10

let sendTimeCount = 0
console.time ('startup')
let uuid = ''
let startAppendMail = false
let timeoutAppendMail = false
let first = true
const connect = () => {
	const rImap: Imap.qtGateImap = new Imap.qtGateImap( imapConnectData, inbox, false, '', true, ( mail: Buffer ) => {
	
		const body = Imap.getMailAttached(mail)
		const time = (new Date().getTime ()- sendTimeCount)
	
		logger ( inspect(`[${body.toString()}] [${ time }]`, false, 3, true))
		console.timeEnd (uuid)
		uuid = ''
		if ( --l < 0 ) {
			rImap.logout (() => {
				console.timeEnd ('startup')
			})
			return
		}
		if ( !timeoutAppendMail ) {
			timeoutAppendMail = true
			setTimeout (() => {
				timeoutAppendMail = false
				return appendMail()
			}, 3000)
			return
		}
		logger (inspect (`timeoutAppendMail = TRUE, STOP setTimeout appendMail ()`, false, 3, true))
	})
	
	const appendMail: any = () => {
		if ( startAppendMail ) {
			return logger ( inspect (`appendMail already starting`, false, 3, true ))
		}
		uuid = uuid || v4()
		i++
		logger ( inspect (`Start appendMail [${ uuid }] times[${i}]`, false, 3, true ))
		console.debug (`appendMail`)
		return Imap.seneMessageToFolder (imapConnectData, inbox, Buffer.from(`Hello [${ i }] [${ uuid }]`).toString ('base64'), '', false, err => {
	
			if ( err ) {
				logger ( inspect(err, false, 3, true ))
				logger (inspect (`appendMail Error! doing again`, false, 3, true ))
				i--
				startAppendMail = false
				return appendMail ()
			}
			console.time (uuid)
			logger ( inspect(`appendMail 【Hello ${ i }】[${ uuid }] success!`, false, 3, true ))
			startAppendMail = false
			return sendTimeCount = new Date ().getTime ()
		})
	}
	
	
	rImap.once ( 'openBoxReady', () => {
		if ( first ) {
			first = false
			appendMail ()
		}
		return logger ( inspect(`ImapAccountCleanup [${ localImap.userName }] on openBoxReady`, false, 3, true ))
	})
	
	rImap.once ('end', () => {
		
		if ( l > 0 ) {
			logger (`rImap.once ('end') reconnect!`)
			return connect ()
		}
		logger (`rImap.once ('end')`)
	})
}


connect ()
