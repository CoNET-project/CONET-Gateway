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

const createNumberPasscode = async (passcode: string) => {
	passObj = {
		charSet: '',
		salt: buffer.Buffer.from (generatePassword (Math.random ()*64)),
		N: Math.pow (2, 7 + Math.round (Math.random() * 5)),
		r: Math.round (10 + Math.random () * 10),
		p: Math.round (10 + Math.random () * 10),
		dkLen: Math.round (32 + Math.random () * 32),
		passcode: '',
		_passcode: passcode,
		password: passcode
	}

	if ( isAllNumbers (passObj.password)) {
		passObj.charSet = getNumberPasswordCharacterSet()
    	passObj._passcode = getPasscode( passObj.password, passObj.charSet )
	}
    
    const _passwd1 = buffer.Buffer.from (passObj._passcode)
    //password, salt, N, r, p, dkLen, callback
	
	if (!passObj ) {
		const msg = `createNumberPasscode Error: passObj === null`
		logger (msg)
		return null
	}
	return passObj.passcode = buffer.Buffer.from((await scrypt.scrypt(_passwd1, passObj.salt, passObj.N, passObj.r, passObj.p, passObj.dkLen))).toString('base64')
}

const decodePasscode = async () => {
	if ( !passObj?.salt ) {
		throw new Error (`decodePasscode Error: passObj null`)
	}
	passObj._passcode = getPasscode(passObj.password, passObj.charSet)
	const _passwd1 = buffer.Buffer.from (passObj._passcode)
    //password, salt, N, r, p, dkLen, callback
	passObj.salt = buffer.Buffer.from (passObj.salt)

    return passObj.passcode = buffer.Buffer.from (await scrypt.scrypt( _passwd1, passObj.salt, passObj.N, passObj.r, passObj.p, passObj.dkLen)).toString('base64')
}