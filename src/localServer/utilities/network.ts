import { connect } from 'tls'
import { each } from 'async'

import { qtGateImapRead, getMailAttached } from './Imap'
import { seneMessageToFolder, imapPeer } from './imapPeer'

import { inspect } from 'util'

const connerver = ( imapServer: string, port: number, CallBack: ( err?: string|null, time?: number ) => void ) => {
	let err = ''
	let time = 0
    const timeOut = setTimeout (() => {
        err = 'timeout'
        if ( typeof conn.destroy === 'function') {
			conn.destroy ()
		}
        return CallBack (err)
    }, 3000 )

	const _connect = () => {
        clearTimeout (timeOut)
		time = new Date ().getTime () - startTime
		conn.end ()
        if ( !conn.authorized ) {
            const err = conn.authorizationError
            return CallBack ( err.message, time)
        }
		return CallBack (null, time)
	}
    

	const startTime = new Date ().getTime ()
	const conn = connect ( { host: imapServer, servername: imapServer, port: port }, _connect )

	conn.once ( 'error', _err => {

		if ( typeof conn.destroy === 'function') {
			conn.destroy ()
		}
	})

}


/**
 * Test network online
 * @param CallBack 
 * Test results Array for 'imap.gmail.com', 'imap.mail.yahoo.com','imap.mail.me.com','outlook.office365.com','imap.zoho.com'
 * test connecting with tls 993 port
 * {
 * 		name: server name
 * 		err: Error | null if have not error
 * 		time: connected time | null if have error
 * }
 */
export const testImapServer = ( CallBack: ( err: null, {}) => void ) => {
	const imapServers = [ 
		{
			server: 'imap.gmail.com',
			port: 993
		}, 
		{
			server: 'imap.mail.yahoo.com',
			port: 993
		}, 
		{
			server: 'imap.mail.me.com',
			port: 993
		},
		{
			server: 'outlook.office365.com',
			port: 993
		},
		{
			server: 'imap.zoho.com',
			port: 993
		},
		{
			server: 'api.stripe.com',
			port: 443
		}
	]
	const ret: {}[] = []
	return each ( imapServers, ( n, next ) => connerver ( n.server, n.port,( err: string | null | undefined, data: any ) => {
        ret.push ({ n, error: err, time: data })
        return next ()
    }), () => {
		return CallBack ( null, ret )
	})
}

const buildConnectGetImap = ( requestObj: connectRequest, CallBack: ( err?: Error|null, requestObj?: connectRequest ) => void ) => {
	console.log ( inspect ( requestObj, false, 3, true ))
	const imapData: imapConnect = {
		imapPortNumber: requestObj.imap_account.imap_port_number,
		imapUserName: requestObj.imap_account.imap_username,
		imapUserPassword: requestObj.imap_account.imap_user_password,
		imapSsl: true,
		imapServer: requestObj.imap_account.imap_server
	}

	let appendCount = 0
	requestObj.encrypted_response = requestObj.error = ''
	let timeout: NodeJS.Timer
	let _callback = false

	const newMail = ( mail: Buffer ) => {
		requestObj.encrypted_response = getMailAttached ( mail )
		cleanUp ()
		return
	}

	const cleanUp = () => {
		clearTimeout ( timeout )
		return rImap.logout (() => {
			_callback = true
			if ( requestObj.error ) {
				return CallBack ( new Error ( requestObj.error ) )
			}
			return CallBack ( null, requestObj )
			
		})
	}

	const sendMessage = () => {
		seneMessageToFolder ( imapData, requestObj.server_folder, Buffer.from ( requestObj.encrypted_request ).toString ('base64'), '', false, err => {
			if ( err ) {
				console.log ( err )
				if ( ++ appendCount > 3 ) {
					requestObj.error = `IMAP server append error!`
					return cleanUp ()
				}
				return sendMessage ()
			}
			return timeout = setTimeout (() => {
				requestObj.error = 'Listening time out!'
				return cleanUp ()
			}, 15000 )
		})
		return
	}

	const rImap = new qtGateImapRead ( imapData, requestObj.client_folder_name, false, newMail, false )

	rImap.once ( 'ready', () => {
		return sendMessage ()
	})

	rImap.once ( 'end', err => {
		if ( err && !_callback ) {
			return CallBack ( new Error ('Cant reach email server'))
		}
	})


}

export const buildConnect = ( reponseJson: connect_imap_reqponse, CallBack: ( err?: Error|null, ret?: postData ) => void ) => {

	if ( ! reponseJson ) {
		return CallBack ( new Error ('Data format error!'))
	}
	const imapData: imapConnect = {
		imapPortNumber: reponseJson.imap_account.imap_port_number,
		imapServer: reponseJson.imap_account.imap_server,
		imapSsl: true,
		imapUserName: reponseJson.imap_account.imap_username,
		imapUserPassword: reponseJson.imap_account.imap_user_password
	}
	const newMessage = ( attr: string, subject: string ) => {
		console.log ({ buildConnect_newMessage: attr }, false, 3, true )
		return CallBack ( null, { encryptedMessage: attr, imapPeer: null })
	}

	const exit = ( err?: Error ) => {
		return CallBack ( new Error ('imapPeerEnd!'))
	}

	const uu = new imapPeer ( imapData, reponseJson.client_folder, reponseJson.server_folder, newMessage, exit )

	uu.on ( 'CoNETConnected', () => {
		return CallBack ( null,  { status: 'Connected to Seguro network.', connectUUID: uu.serialID, encryptedMessage: '', imapPeer: uu })
	})

	uu.on ( 'ready', () => {
		return CallBack ( null, { status: 'Connect to email server, waiting Seguro response.', connectUUID: uu.serialID, encryptedMessage: '', imapPeer: uu })
	})

	uu.once ( 'pingTimeOut', () => {
		return CallBack ( new Error ('pingTimeOut!'))
	})

	return

}
/**
 * 
 * @param requestObj: connectRequest, request object
 * @param encryptedMessage: string, Encrypted with Seguro public key and sign by device key
 * @param CallBack: ( err: Error, response: connectRequest ), response from Seguro | Error 
 */
export const getInformationFromSeguro = ( requestObj: connectRequest, CallBack: ( err?: Error|null, requestObj?: connectRequest ) => void  ) => {
	return buildConnectGetImap ( requestObj, CallBack )
}