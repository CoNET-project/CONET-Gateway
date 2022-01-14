import { connect } from 'tls'
import { each } from 'async'


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

