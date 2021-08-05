const mainWorkDoCommand = ( cmd: worker_command, mainWorker: launchAllWorkers ) => {
    switch ( cmd.cmd ) {
        case 'initSeguroData': {
            console.log (`initSeguroData`, cmd )
            return mainWorker.encryptWorker.append ( cmd, _cmd => {
                console.log ( _cmd )
                if ( ! _cmd ) {
                    cmd.err = 'encryptWorker Error!'
                    return returnCommand ( cmd )
                }
                returnCommand ( _cmd )
            })
        }

        default: {
            cmd.err = 'InvalidCommand'
            return returnCommand ( cmd )
        }
    }
}