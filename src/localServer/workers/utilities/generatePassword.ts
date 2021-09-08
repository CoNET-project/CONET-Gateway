const CHARACTER_SETS = [
	[true, "Numbers", "0123456789"],
	[true, "Lowercase", "abcdefghijklmnopqrstuvwxyz"],
	[true, "Uppercase", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
	[true, "ASCII symbols", "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"]
]

const getPasswordCharacterSet = () => {
	// Concatenate characters from every checked entry
	var rawCharset = ""
	CHARACTER_SETS.forEach(( entry, i ) => {
        if ( entry[0]) {
            rawCharset += entry[2]
        }
	})

	return rawCharset
}

const generatePassword = ( len: number ) => {

	let result = ""
    const charset = getPasswordCharacterSet ()
	for ( let i = 0; i < len; i++ ) {
        result += charset [ randomInt ( charset.length )]
    }
	return result
}

const randomInt = ( n: number ) => {
	let x = randomIntMathRandom ( n )
	x = ( x + randomIntBrowserCrypto ( n )) % n
	return x
}

const randomIntMathRandom = ( n: number ) => {
	return  Math.round ( Math.random () * n )
}

const randomIntBrowserCrypto = ( n: number ) => {
	if ( crypto === null) {
        return 0
    }
		
	// Generate an unbiased sample
	var x = new Uint32Array(1)
	do crypto.getRandomValues(x)
	while ( x[0] - x[0] % n > 4294967296 - n )
	return x[0] % n
}

const getNumberPasswordCharacterSet = () => {
	let s = ''
	const charset = getPasswordCharacterSet ()
	while ( s.length < 10 ) {
		const j = charset [randomInt ( charset.length )]
		const index = s.indexOf (j)
		if ( index < 0 ) {
			s += j
		}
	}
	return s
}

const getPasscode = (passcode: string, characterSet: string ) => {
	let ret = ''
	for (let i = 0; i < passcode.length; i ++) {
		const k = passcode.charAt (i)
		if ( !/\D/.test (k)) {
			ret += characterSet[parseInt (k)]
		}
	}
	if (ret.length !== passcode.length) {
		return ''
	}
	return ret
}

const createNumberPasscode = ( cmd: worker_command, CallBack: (err: Error|null, password?: any ) => void ) => {
	const scryptObj = {
		charSet: '',
		salt: buffer.Buffer.from (generatePassword (Math.random ()*64)),
		N: Math.pow (2, 7 + Math.round (Math.random() * 5)),
		r: Math.round (10 + Math.random () * 10),
		p: Math.round (10 + Math.random () * 10),
		dkLen: Math.round (32 + Math.random () * 32),
		passcode: '',
		_passcode: cmd.data[0],
		password: cmd.data[0]
	}

	if ( isAllNumbers (scryptObj.password)) {
		scryptObj.charSet = getNumberPasswordCharacterSet()
    	scryptObj._passcode = getPasscode(scryptObj.password, scryptObj.charSet)
	}
    
    const _passwd1 = buffer.Buffer.from (scryptObj._passcode)
    //password, salt, N, r, p, dkLen, callback
	

    scrypt.scrypt(_passwd1, scryptObj.salt, scryptObj.N, scryptObj.r, scryptObj.p, scryptObj.dkLen, ( progressCallback: number ) => {
        cmd.data = [progressCallback]
        return returnCommand (cmd)
    }).then (( pass: string )=> {
		scryptObj.passcode = buffer.Buffer.from (pass).toString ('hex')
        return CallBack ( null, scryptObj)
    }).catch (( ex: Error ) => {
        return CallBack ( ex )
    })

}

const decodePasscode = (cmd: worker_command, CallBack: (err: Error|null) => void ) => {
	if ( !pass?.salt ) {
		return CallBack (new Error ('Object pass have not exist!'))
	}
	pass._passcode = getPasscode(pass.password, pass.charSet)
	const _passwd1 = buffer.Buffer.from (pass._passcode)
    //password, salt, N, r, p, dkLen, callback
	pass.salt = buffer.Buffer.from (pass.salt)

    scrypt.scrypt( _passwd1, pass.salt, pass.N, pass.r, pass.p, pass.dkLen, ( progressCallback: number ) => {
        cmd.data = [progressCallback]
        return returnCommand (cmd)
    }).then (( _pass: string ) => {
		if ( pass ) {
			pass.passcode = buffer.Buffer.from (_pass).toString ('hex')
		}
		
        return CallBack (null)
    }).catch (( ex: Error ) => {
        return CallBack ( ex )
    })
}