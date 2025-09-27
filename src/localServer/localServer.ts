import express from 'express'
import type { Server } from 'node:http'
import { request } from 'node:https'
import type {RequestOptions} from 'node:https'
import { join } from 'node:path'
import Colors from 'colors/safe'
import { inspect } from 'node:util'
import { v4 } from 'uuid'
import {ProxyServer} from './proxy-server'
import {logger} from './logger'
import Ip from "ip"
import {ethers} from 'ethers'
import * as openpgp from 'openpgp'
import os from 'node:os'
import CONET_Guardian_NodeInfo_ABI from './CONET_Guardian_NodeInfo_ABI.json'
import {runUpdater, readUpdateInfo} from './updateProcess'
import fs from 'node:fs'
import {LayerMinus} from './layerMinus'

const ver = '0.1.5'

const getLocalNetworkIpaddress = () => {
	const interfaceAll = os.networkInterfaces()
	let ipv4: string[] = []

	Object.keys(interfaceAll).map(n => {
		const _address = interfaceAll[n]?.filter((n:os.NetworkInterfaceInfo) => n.family === 'IPv4')
		if (_address) {
			ipv4 = [...ipv4, ..._address.map(n => n.address)]
		}
		
	})
	
	const ret = ipv4.filter(n => !/^127\.|^169\./.test(n))
	return ret[0]
}

const CONET_Guardian_NodeInfoV6 = "0x9e213e8B155eF24B466eFC09Bcde706ED23C537a"
const conet_rpc = 'https://rpc.conet.network'
const provideCONET = new ethers.JsonRpcProvider(conet_rpc)

const getAllRegions = async () => {
    const regionContract = new ethers.Contract(
      CONET_Guardian_NodeInfoV6,
      CONET_Guardian_NodeInfo_ABI,
      provideCONET
    );

    try {
      const regions =   await regionContract.getAllRegions();
      console.log(regions);
      return regions;
    } catch (ex) {
      logger(ex);
      return null;
    }
}

const createGPGKey = async ( passwd: string, name: string, email: string ) => {
	const userId = {
		name: name,
		email: email
	}
	const option = {
        type: 'ecc',
		passphrase: passwd,
		userIDs: [userId],
		curve: 'curve25519',
        format: 'armored'
	}
	//	@ts-ignore
	return await openpgp.generateKey ( option )
}

let profile: profile

const CoNET_SI_Network_Domain = 'openpgp.online'
const conet_DL_getSINodes = `https://${ CoNET_SI_Network_Domain }:4001/api/conet-si-list`

const postToEndpointJSON = ( url: string, jsonData: string ) => {
	return new Promise ((resolve, reject) => {

        const Url = new URL(url)

        const option: RequestOptions = {
            port: Url.port,
            hostname: Url.hostname,
            host: Url.host,
            path: Url.pathname,
            method: 'POST',
			protocol: Url.protocol,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': jsonData.length
            },
            rejectUnauthorized: false
        }

        const connect = request(option, res => {
            let data = ''
            if (res.statusCode === 200 ) {
                res.on ('data', _data => {
                    data += _data
                })
            }
            res.once ('end', () => {
                logger (`postToEndpoint res on END`)
                if ( data.length) {
                    let ret
                    try {
                        ret = JSON.parse(data)
                    } catch (ex) {
                        logger (Colors.red(`postToEndpointJSON [${url}] JSON parse ERROR! data=\n[${ data }]\n`))
                        return resolve ('')
                    }
                    return resolve (ret)
                }
                return ('')
            })
            res.on('error', err => {
                logger (Colors.red(`postToEndpointJSON [${url}] response on ERROR! \n[${ err.message }]\n`) )
            })

        })

        connect.on ('error', err => {

            logger (Colors.red(`postToEndpointJSON [${url}] connect on ERROR! \n[${ err.message }]\n`))
            return reject (err)
        })

        connect.end(jsonData)

	})

}

export const splitIpAddr = (ipaddress: string | undefined) => {
	if (!ipaddress?.length) {
		logger (Colors.red(`splitIpAddr ipaddress have no ipaddress?.length`), inspect( ipaddress, false, 3, true ))
		return ''
	}
	const _ret = ipaddress.split (':')
	return _ret[_ret.length - 1]
}


const makeMetadata = ( text: string ) => {
    let ret = '{'
    let n = 0
    const makeObj = (text: string) => {
        ret += `${n === 0?'':','}"st${n++}":"${text}"`
    }
    while ( text.length ) {
        const uu = text.substring (0, 500)
        text = text.substring (500)
        makeObj (uu)
    }
    ret += '}'
    return ret
}

const joinMetadata = (metadata: any ) => {
    delete metadata.response
    let _metadata = ''
    Object.keys (metadata).forEach (n => {
        _metadata += metadata[n]
    })

    metadata['text']= _metadata
}

let _proxyServer: ProxyServer


const startSilentPass = (vpnObj: Native_StartVPNObj, currentVer: UpdateInfo, reactFolder: string, restart: () => Promise<void> ) => {
	logger(inspect(vpnObj, false, 3, true))
	logger(`startSilentPass public key ${(new ethers.Wallet(vpnObj.privateKey)).address}`)
    const layerMinus = new LayerMinus(vpnObj.entryNodes, vpnObj.exitNode, vpnObj.privateKey)
	_proxyServer = new ProxyServer(3002, layerMinus)
    _proxyServer.start()
	runUpdater(vpnObj.entryNodes, currentVer, reactFolder, restart)
	return _proxyServer
}






const otherRespon = ( body: string| Buffer, _status: number ) => {
	const Ranges = ( _status === 200 ) ? 'Accept-Ranges: bytes\r\n' : ''
	const Content = ( _status === 200 ) ? `Content-Type: text/html; charset=utf-8\r\n` : 'Content-Type: text/html\r\n'
	const headers = `Server: nginx/1.6.2\r\n`
					+ `Date: ${ new Date ().toUTCString()}\r\n`
					+ Content
					+ `Content-Length: ${ body.length }\r\n`
					+ `Connection: keep-alive\r\n`
					+ `Vary: Accept-Encoding\r\n`
					//+ `Transfer-Encoding: chunked\r\n`
					+ '\r\n'

	const status = _status === 200 ? 'HTTP/1.1 200 OK\r\n' : 'HTTP/1.1 404 Not Found\r\n'
	return status + headers + body
}


export const return404 = () => {
	const kkk = '<html>\r\n<head><title>404 Not Found</title></head>\r\n<body bgcolor="white">\r\n<center><h1>404 Not Found</h1></center>\r\n<hr><center>nginx/1.6.2</center>\r\n</body>\r\n</html>\r\n'
	return otherRespon ( Buffer.from ( kkk ), 404 )
}


type Native_StartVPNObj = {
	entryNodes: nodes_info[]
	privateKey: string
	exitNode: nodes_info[]
}

type filterRule = {
    DOMAIN: string[]
    IP: string[]
}


export class Daemon {
    private logsPool: proxyLogs[] = []

    private loginListening: express.Response|null = null
    private localserver: Server
    private connect_peer_pool: any [] = []
    private worker_command_waiting_pool: Map<string, express.Response> = new Map()
    private logStram = ''
	private currentVer:UpdateInfo|null
    constructor ( private PORT = 3000, private reactBuildFolder: string) {
        this.initialize()
    }

    public _proxyServer: ProxyServer|null = null

	public end = (): Promise<void> => new Promise(resolve => {
		if (this.localserver) {
			this.localserver.close(err => {
				if (err) {
					logger(Colors.red('关闭服务器时出错:'), err)
				}
			})
		}
		// 即使服务器不存在或关闭出错，也继续执行
		resolve()
	})

    public postMessageToLocalDevice ( device: string, encryptedMessage: string ) {
        const index = this.connect_peer_pool.findIndex ( n => n.publicKeyID === device )
        if ( index < 0 ) {
            return console.log ( inspect ({ postMessageToLocalDeviceError: `this.connect_peer_pool have no publicKeyID [${ device }]`}, false, 3, true ))
        }
        const ws = this.connect_peer_pool[ index ]
        const sendData = { encryptedMessage: encryptedMessage }
        console.log ( inspect ({ ws_send: sendData}, false, 3, true ))
        return ws.send ( JSON.stringify ( sendData ))
    }

    private initialize = async () => {
		// --- 关键逻辑开始 ---

		// 1. 定义默认路径（只读的应用包内部）
		const defaultPath = join(__dirname, 'workers')

		// 2. 定义更新路径（可写的 userData 目录内部）
		const userDataPath = this.reactBuildFolder
		const updatedPath = join(userDataPath, 'workers')

		// 3. 检查更新路径是否存在，然后决定使用哪个路径
		//    如果 updatedPath 存在，就用它；否则，回退到 defaultPath。
		let staticFolder = fs.existsSync(updatedPath) ? updatedPath : defaultPath
		logger(`staticFolder = ${staticFolder}`)
		this.currentVer = await readUpdateInfo(staticFolder, '')
		if (!this.currentVer) {
			staticFolder = defaultPath
			logger(Colors.red(`updatedPath ERROR, go back to defaultPath ${defaultPath}`))
		}
		
		// --- 关键逻辑结束 ---

        const app = express()
		const cors = require('cors')

        app.use( cors ())
		app.use ( express.static ( staticFolder ))
        //app.use ( express.static ( launcherFolder ))
        app.use ( express.json() )
		app.use (async (req, res: any, next) => {

			logger(Colors.blue(`${req.url}`))
				
			return next()
			
		})
        app.once ( 'error', ( err: any ) => {
            logger (err)
            logger (`Local server on ERROR, try restart!`)
            return this.initialize ()
        })

		app.get('/ver'), ( req, res ) => {
			res.end({ver: this.currentVer?.ver})
		}

        app.post ( '/rule', ( req: any, res: any ) => {
            const vpnObj = req.body.data
            try {
                const data: filterRule = JSON.parse(vpnObj)
                logger(inspect(data, false, 3, true))
            if (this._proxyServer) {
                this._proxyServer.ruleGet(data)
            }

            } catch (ex) {
                logger(`/rule JSON.parse(vpnObj) Error`)
            }

            
            return res.end()
        })

        app.post ( '/postMessage', ( req: any, res: any ) => {
            const post_data: postData = req.body
            console.log ( inspect ( post_data, false, 3, true ))
            console.log (`unknow type of ${ post_data }`)
            res.sendStatus ( 404 )
            return res.end ()
        })


		app.get('/ipaddress', (req: any, res: any) => {
			
			return res.json ({ip:getLocalNetworkIpaddress()}).end()
		})

        app.post ('/proxyusage', (req, res) => {
            res.json().end()
            logger (inspect(req.body.data, false, 3, true))
            this.logsPool.unshift(req.body.data)
        })

        app.post('/getProxyusage', (req: any, res: any) => {

            if (!this._proxyServer) {
                return res.sendStatus(404).end()
            }
            const headerName=Colors.blue (`/getProxyusage`)
            logger(headerName,  inspect(req.body.data, false, 3, true))
            let roop:  NodeJS.Timeout
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Connection', 'keep-alive')
            res.flushHeaders() // flush the headers to establish SSE with client

            let interValID = () => {

                if (res.closed) {
                    return logger ('')
                }
                if (this.logsPool.length <1) {

                    this.logsPool.push(
                        //@ts-ignore
                        {data:`/getProxyusage ${req.body.data}`}
                    )
                }

                res.write(`${JSON.stringify({data: this.logsPool})}\r\n\r\n`, () => {
                    this.logsPool = []
                    return roop = setTimeout(() => {
                        interValID()
                    }, 10000)
                })
            }

            res.on('close', () => {
                console.log(`[${headerName}] client dropped me!`)
                res.end()
                clearTimeout(roop)
            })
            interValID()

        })

        app.post('/connecting', (req: any, res: any) => {

            const headerName=Colors.blue (`Local Server /connecting remoteAddress = ${req.socket?.remoteAddress}`)
            logger(headerName,  inspect(req.body.data, false, 3, true))
            let roop:  NodeJS.Timeout
            if (this.loginListening) {
                logger (`${headerName} Double connecting. drop connecting!`)
                return res.sendStatus(403).end()

            }
            this.loginListening = res
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Connection', 'keep-alive')
            res.flushHeaders() // flush the headers to establish SSE with client

            const interValID = () => {

                if (res.closed) {
                    this.loginListening = null
                    return logger (` ${headerName} lost connect! `)
                }

                res.write(`\r\n\r\n`, err => {
                    if (err) {
                        logger (`${headerName }res.write got Error STOP connecting`, err)
                        res.end()
                        this.loginListening = null
                    }
                    return roop = setTimeout(() => {
                        interValID()
                    }, 10000)
                })
            }

            res.once('close', () => {
                logger(`[${headerName}] Closed`)
                res.end()
                clearTimeout(roop)
                this.loginListening = null
            })

            res.on('error', err => {
                logger(`[${headerName}] on Error`, err)
            })

            return interValID()

        })

        app.post('/connectingResponse', (req: any, res: any) =>{
            const headerName = Colors.blue (`Local Server /connectingResponse remoteAddress = ${req.socket?.remoteAddress}`)
            const data: worker_command = req.body.data
            logger (`${headerName} connecting `, inspect(data))
            if (!data.uuid) {
                logger (`${headerName} has not UUID in worker_command! STOP connecting!`, inspect(data))
                data.err = 'NO_UUID'
                return res.sendStatus(403).json(data)
            }

            const _res = this.worker_command_waiting_pool.get (data.uuid)

            if (!_res) {
                logger (`${headerName} has not res STOP connecting!`, inspect(data))
                data.err = 'NOT_READY'
                return res.sendStatus(403).json(data)
            }

            this.worker_command_waiting_pool.delete(data.uuid)

            if (_res.closed|| !_res.writable) {
                logger (`${headerName} has not res STOP connecting!`, inspect(data))
                data.err = 'NOT_READY'
                return res.sendStatus(403).json(data)
            }
            res.json()

            if (data.err) {
                return _res.sendStatus(404).end()
            }
            _res.json(data)

        })

        app.get('/ver', (req, res) => {
			logger (`APP get ${req.url}`)
            res.json({ver: this.currentVer?.ver})
        })

        app.get('/getAllRegions',async (req, res) => {
            let regions = await getAllRegions()
            res.json(regions?? [])
        })

        app.get('/switch',async (req, res) => {
            if (this._proxyServer) {
                this._proxyServer.protocolNew = !this._proxyServer.protocolNew
            }
            res.status(200).end()
        })


     	app.post('/startSilentPass', async (req: any, res: any) => {
            const vpnObj: Native_StartVPNObj = req.body.vpnInfo


			if (!vpnObj) {
				return res.status(400).send({ error: "No country selected" })
			}
			if (this.currentVer) {
				this._proxyServer = startSilentPass (vpnObj, this.currentVer, this.reactBuildFolder, this.restart)
			}
			

			res.status(200).json({}).end()
            
        })

		app.get('/stopSilentPass', async (req: any, res: any) => {
			logger(Colors.magenta(`stopSilentPass`))
			if (_proxyServer) {
				await _proxyServer.end()
			}
			logger(Colors.magenta(`send stopSilentPass succcess!`))
			res.status(200).end()
		})

        app.post('/loginRequest', (req: any, res: any) =>{

            const headerName=Colors.blue (`Local Server /loginRequest remoteAddress = ${req.socket?.remoteAddress}`)
            const data = req.body.data
            logger(headerName, inspect(data, false, 3, true))

            if (this._proxyServer) {
                logger (`${headerName} return proxy launched!`)
                return res.sendStatus(200).end()
            }

            if (!this.loginListening || this.loginListening.closed) {
                this.loginListening = null
                logger (`${headerName} has not any loginListening to host Error! STOP connecting!`)
                return  res.sendStatus (403).end()
            }


            if (!data) {
                logger (`${headerName} has not any data! STOP connecting!`)
                return  res.sendStatus (404).end()
            }
            const cmd: worker_command = {
                cmd: 'encrypt_TestPasscode',
                data: [data],
                uuid: v4()
            }

            if (cmd.uuid) {
                this.worker_command_waiting_pool.set (cmd.uuid, res)
            }

            this.loginListening.write (JSON.stringify(cmd)+'\r\n\r\n')
        })

        app.all ('/', (req: any, res: any) => {
			logger (Colors.red(`Local web server got unknow request URL Error! [${ splitIpAddr (req.ip) }] => ${ req.method } url =[${ req.url }]`))
			return res.status(404).end (return404 ())
		})

        this.localserver = app.listen ( this.PORT, () => {
            // 在日志中打印出当前正在使用的路径，这对于调试至关重要！
			return console.table([
				{ 'CONET Local Web Server': `http://localhost:${this.PORT}` },
				{ 'Serving files from': staticFolder } 
			])
        })
    }

	// 将 restart 方法改为箭头函数属性
	public restart = async (): Promise<void> => {
		logger(Colors.magenta('🔄 开始热启动本地 Web 服务器...'))

		// 1. 确保当前有服务器正在运行
		if (!this.localserver) {
			logger(Colors.yellow('服务器未运行，无需重启。将直接进行初始化。'))
			await this.initialize()
			return
		}

		// 2. 关闭现有服务器，并等待其完全关闭
		logger('🚀 正在关闭现有服务器...')
		await this.end()
		logger('✅ 旧服务器已成功关闭。')

		// 3. 再次调用 initialize 方法
		logger('🚀 正在使用新配置重新初始化服务器...')
		await this.initialize()
		logger(Colors.green('🎉 服务器热启动完成！'))
	}
}



//		test 
//		curl -v localhost:3001/getAllRegions
//		curl -X POST -H "Content-Type: application/json" --data '{"walletAddress": "0x39EE68D74E6Dc6FF047E60D6Fc769f6E4Bab7fB5", "solanaWallet": "9qrjMUHXsZg7Er7Q9EJEEZpR4cPvM1FAkDJSwkcbCoFy"}' "https://apiv4.conet.network/api/spclub"
//		Proxy server test 
//		curl -v -x http://localhost:3002 "https://whatismyipaddress.com/"