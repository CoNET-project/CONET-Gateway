//	For native call

export  const logger = (...argv: any ) => {
    const date = new Date ()
    const dateStrang = `%c [CONET-worker INFO ${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}]`
    return console.log ( dateStrang, 'color: #dcde56',  ...argv)
}

const FX168SendData = (message: string) => {
	logger(`FX168SendData got data ${message} echo it with FX168ReceiveData`)
	FX168ReceiveData(message)
}

const FX168ReceiveData = (message: string) => {
	return message
}