const returnCommand = ( cmd: worker_command ) => {
    //const data = Buffer.from ( JSON.stringify ( cmd ))
    console.log (`worker returnCommand`)
    self.postMessage ( JSON.stringify ( cmd ))
}

let workerReady = false