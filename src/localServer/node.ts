// server.ts
import * as net from "net"
import Colors from "colors/safe"
import { inspect } from "util"

const PORT = 8889

interface VE_IPptpStream {
    buffer: string              // 发往上游服务器的首包
    host: string                // 上游服务器地址或域名
    port: number                // 上游服务器端口
    order?: number            // 顺序号 
}

interface SICommandObj {
	command: 'SilentPass'|'SaaS_Sock5'|'mining'|'mining_validator'|'mining_gossip'|'SaaS_Sock5_v2'
	publicKeyArmored: string
	responseError: string|null
	algorithm: 'aes-256-cbc'
	Securitykey?: string
	requestData?: VE_IPptpStream[]
}

export const logger = (...argv: any ) => {
    const date = new Date ()
    let dateStrang = `[${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }:${ date.getMilliseconds ()}]`
    return console.log ( Colors.yellow(dateStrang), ...argv )
}

const distorySocket = (socket: net.Socket, header = '404 Not Found') => {
	const responseHtml = `<html>\r\n<head><title>${header}</title></head>\r\n<body>\r\n<center><h1>${header}</h1></center>\r\n<hr><center>nginx/1.18.0</center>\r\n</body>\r\n</html>\r\n`
	//	@ts-ignore
	const time = new Date().toGMTString()
	const response = `HTTP/1.1 ${header}\r\nServer: nginx/1.18.0\r\nDate: ${time}\r\nContent-Type: text/html\r\nContent-Length: ${responseHtml.length}\r\nConnection: keep-alive\r\n\r\n${responseHtml}\r\n`
	socket.end(response).destroy()
}

// 支持的 Origin 白名单（可以改为从配置文件读取）
const originWhitelist = [
	/^https?:\/\/([a-zA-Z0-9-]+\.)?openpgp\.online(:\d+)?$/,
	/^https?:\/\/([a-zA-Z0-9-]+\.)?conet\.network(:\d+)?$/,
	/^https?:\/\/([a-zA-Z0-9-]+\.)?silentpass\.io(:\d+)?$/,
	/^local\-first:\/\/localhost(:\d+)?$/,
	/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
]

const responseOPTIONS = (socket: net.Socket, requestHeaders: string[]) => {
	const originHeader = requestHeaders.find(h => h.toLowerCase().startsWith('origin:'));
	const rawOrigin = originHeader ? originHeader.slice(originHeader.indexOf(':') + 1).trim() : '*'

	// 检查 origin 是否在白名单中
	const isAllowed = originWhitelist.some(pattern => pattern.test(rawOrigin));
	const allowOrigin = isAllowed ? rawOrigin : 'null'; // or set to '*' only if no credentials used

	console.log(`[CORS] OPTIONS request from Origin: ${rawOrigin} => allowed: ${isAllowed}`)

	const response = [
		'HTTP/1.1 204 No Content',
		`Access-Control-Allow-Origin: ${allowOrigin}`,
		'Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE, PATCH',
		'Access-Control-Allow-Headers: solana-client, DNT, X-CustomHeader, Keep-Alive, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type',
		'Access-Control-Max-Age: 86400',
		'Content-Length: 0',
		'Connection: keep-alive',
		'',
		''
	].join('\r\n')
	console.log(response)
	socket.write(response)
}


const proxyToTargetServer = (socket: net.Socket, targetHost: string, targetPort: number, initialData: Buffer) => {
    const targetSocket = net.createConnection({ host: targetHost, port: targetPort }, () => {
        logger(Colors.green(`Connected to target ${targetHost}:${targetPort} for ${socket.remoteAddress}`))

        if (initialData && initialData.length) {
            targetSocket.write(initialData)
        }
        socket.pipe(targetSocket)
        targetSocket.pipe(socket)
    })
    
    targetSocket.on('error', (err) => {
        logger(Colors.red(`Error in targetSocket for ${socket.remoteAddress}: ${err.message}`))
        distorySocket(socket, '502 Bad Gateway')
    })
}



const postOpenpgpRouteSocket = async (socket: net.Socket, headers: string[], data: string) => {
    console.log(`postOpenpgpRouteSocket from ${socket.remoteAddress}\n`, inspect({ headers, data }, false, 3, true))
    try {
        const reqCommand: SICommandObj = JSON.parse(data)
        logger(Colors.green(`postOpenpgpRouteSocket from ${socket.remoteAddress} req = `), inspect(reqCommand, false, 3, true))

        const preReq = reqCommand?.requestData
        if (!preReq || !Array.isArray(preReq) || preReq.length === 0) {
            logger(Colors.magenta(`postOpenpgpRouteSocket requestData is not array error! ${socket.remoteAddress}`))
            return distorySocket(socket, '400 Bad Request')
        }

        const req = preReq[0]
        if (!req || typeof req !== 'object' || !req.host || !req.port || !req.buffer) {
            logger(Colors.magenta(`postOpenpgpRouteSocket requestData[0] format error! ${socket.remoteAddress}`))
            return distorySocket(socket, '400 Bad Request')
        }


        // 连接到目标服务器
        const targetHost = req.host
        const targetPort = req.port
        const buffer = Buffer.from(req.buffer, 'base64')

        proxyToTargetServer(socket, targetHost, targetPort, buffer)

    } catch (error) {
        return distorySocket(socket, '400 Bad Request')
    }
}

const getDataPOST = async (socket: net.Socket, chunk: Buffer) => {
    
    const getMoreData = (buf: Buffer): Promise<{ header: string, body: string, tail: Buffer }> => {
        return new Promise((resolve) => {
            const sep = Buffer.from('\r\n\r\n')
            const tryResolve = (b: Buffer): boolean => {
                const sepIndex = b.indexOf(sep)
                if (sepIndex < 0) return false

                const headerPart = b.slice(0, sepIndex).toString('ascii')
                const m = /Content-Length:\s*(\d+)/i.exec(headerPart)
                const contentLength = m ? parseInt(m[1], 10) : 0

                const need = sepIndex + sep.length + contentLength
                if (b.length < need) return false

                const bodyBuf = b.slice(sepIndex + sep.length, need)
                const tail = b.slice(need); // ★ Content-Length 之后已到达的原始流
                resolve({ header: headerPart, body: bodyBuf.toString('utf8'), tail })
                return true
            }

            if (tryResolve(buf)) return
            socket.once('data', (more: Buffer) => {
                getMoreData(Buffer.concat([buf, more])).then(resolve)
            })
        })
    }


    const { header, body, tail } = await getMoreData(chunk)
    const bodyStr = body           
    if (tail && tail.length) {
        socket.unshift(tail)
    }



    const headerLines = header.split('\r\n')
    const requestProtocol = headerLines[0]
    const path = requestProtocol.split(' ')[1]
    const method = requestProtocol.split(' ')[0]


    // 处理 POST 请求的逻辑
    if (method === 'POST') {
        let body: { data?: string }
        try {
            body = JSON.parse(bodyStr)
        } catch (ex) {
            console.log(`JSON.parse Ex ERROR! ${socket.remoteAddress}\n distorySocket request = ${requestProtocol}`, inspect({ request: bodyStr, addr: socket.remoteAddress, header  }, false, 3, true))
            return distorySocket(socket)
        }

        if (!body?.data || typeof body.data !== 'string') {
            logger(Colors.magenta(`startServer HTML body is not string error! ${socket.remoteAddress}`))
            logger(inspect(body, false, 3, true))
            return distorySocket(socket)
        }
		console.log(`postOpenpgpRouteSocket from ${socket.remoteAddress}\n`, inspect({ request: bodyStr, addr: socket.remoteAddress }, false, 3, true))
        return postOpenpgpRouteSocket(socket, headerLines, body.data)
    }

    // 对于其他方法 (PUT, DELETE, etc.) 或无法识别的请求，关闭连接
    //logger(Colors.yellow(`[WARN] Unhandled method '${method}' for path '${path}'. Closing connection.`))
    return distorySocket(socket)
}

const socketData = (socket: net.Socket) => {
    let buffer = Buffer.alloc(0); // 在监听器外部定义一个缓冲区，用于拼接不完整的数据包
    let handledOptions = false; // 状态标记，标识是否处理过OPTIONS

    // 使用 .on 来持续监听数据，而不是 .once
    socket.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk])

        
        const peek = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('ascii')
        const separator = '\r\n\r\n'

        if (!handledOptions && peek.startsWith('OPTIONS')) {
            const end = peek.indexOf(separator)
            if (end !== -1) {
                const requestText = peek.substring(0, end)
                const lines = requestText.split('\r\n').filter(Boolean)
                responseOPTIONS(socket, lines)
                // 真正从 Buffer 中剥离已处理部分
                buffer = buffer.subarray(end + separator.length)
                handledOptions = true
            }
        }

        // 识别 POST/GET 起始
        const headStr = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('ascii').trim()
        
        if (headStr.length > 0 && (headStr.startsWith('POST') || headStr.startsWith('GET'))) {
            socket.removeAllListeners('data')
            // 直接把当前 Buffer 交给 getDataPOST（它会继续按 Buffer 读取）
            return getDataPOST(socket, buffer)
        }
       
        return distorySocket(socket)
    })
}

const server = net.createServer((socket) => {
	console.log("有客户端连接:", socket.remoteAddress, socket.remotePort)

	socketData(socket)

	socket.on("end", () => {
		console.log("客户端断开连接")
	})

	socket.on("error", (err) => {
		console.error("Socket 错误:", err)
	})
})

server.listen(PORT, () => {
	console.log(`TCP 服务器已在端口 ${PORT} 启动`)
})
