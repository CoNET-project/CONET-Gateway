class launchAllWorkers {

    public encryptWorker = new SubWorkerInWorker ( 'encrypt.js', ( cmd: worker_command ) => {
        this.encryptWorkerReady = true
        return this.checkInitDone ()
    })

    public storageWorker = new SubWorkerInWorker ( 'storage.js', ( cmd: worker_command ) => {
        this.storageWorkerReady = true
        this.SeguroContainer = cmd.data
        return this.checkInitDone ()
    })

    constructor () {}
    private SeguroContainer: keyPair|undefined
    private encryptWorkerReady = false
    private storageWorkerReady = false
    private checkInitDone = () => {
        if ( this.storageWorkerReady && this.encryptWorkerReady ) {
            const _cmd: worker_command = {
                cmd: 'ready',
                data: this.SeguroContainer ? true : false
            }
            workerReady = true
            return returnCommand ( _cmd )
        }
    }

}