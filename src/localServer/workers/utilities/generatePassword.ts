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
	for ( var i = 0; i < len; i++ ) {
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