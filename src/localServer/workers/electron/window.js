const {app, BrowserWindow} = require('electron')

const isDevelopmentMode = process.env.NODE_ENV === 'development'

let mainWindow
let mobileWindow

const createWindow = async ({clientServerPort}) => {

    const gotTheLock = app.requestSingleInstanceLock()
    if ( ! gotTheLock ) {
		return app.quit()
    }

    await app.whenReady()

    mainWindow = new BrowserWindow({
        width: 640,
        height: 480,
        show: false,
    })

    mobileWindow = new BrowserWindow({
        width: 320,
        height: 640,
        show: false,
        // resizable: false
    })

    const clientServerUrl = `file://${__dirname}/index.html`
        try {
            console.log(`loading client index from ${clientServerUrl}`)
            await mainWindow.loadURL(clientServerUrl)
            if (isDevelopmentMode) {
                mainWindow.webContents.openDevTools()
                await mobileWindow.loadURL(clientServerUrl)
                mobileWindow.webContents.openDevTools()
            }
        } catch {
            console.error('failed to load client index')
            process.exit(1)
        }
    
    app.on('second-instance', ( event, commandLine, workingDirectory) => {
		mainWindow.restore()
	})

    app.on('window-all-closed', () => {
        // if (process.platform !== 'darwin') {
            app.quit()
        // }
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow({
                clientServerPort
            })
        } else {
            mainWindow.restore()
        }
    })

    mainWindow.show()

    mainWindow.once('close', () => {
        app.quit()
    })

    if (isDevelopmentMode) {
        mobileWindow.show()
    }
}

module.exports = {
    createWindow
}
