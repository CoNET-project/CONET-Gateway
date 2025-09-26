import { createServer, Socket, Server } from 'node:net'
import { logger } from './logger'
import { LayerMinus } from './layerMinus'
import * as dns from 'node:dns/promises'
import { inspect } from 'node:util'
import {BandwidthCount} from './BandwidthCount'
import {createRuleMatcher} from './createRuleMatcher'
import { parse as parseUrl } from 'node:url'


declare function CreateRuleMatcher(
  rules: filterRule
): { match: (host: string) => boolean; pac: (proxy?: string) => string }

/**
 * 优雅关闭：
 * 1) 先 end() 发送 FIN
 * 2) 若在 protect 窗口内 bytesRead 仍在增长，说明还有下行在流入 → 延后强拆
 * 3) 若无增长或超时，则 destroy()
 *
 * 参数（可按需调节常量）：
 * - PROTECT_MS：保护观察窗口，总时长（默认 300ms）
 * - IDLE_STEP_MS：每次 idle 检查间隔（默认 50ms）
 */
const safeClose = (s: Socket) => {
  const PROTECT_MS = 450
  const IDLE_STEP_MS = 50
  try {
    if (s.destroyed) return
    s.end() // 发送 FIN

    let lastRead = s.bytesRead
    const start = Date.now()

    const tick = () => {
      if (s.destroyed) return

      // 条件1：下行字节仍在增长
      const downstreamGrew = s.bytesRead > lastRead
      if (downstreamGrew) lastRead = s.bytesRead
      // 条件2：本端写缓冲仍未刷空（还有待发字节）
      const hasPendingWrite = (typeof s.writableLength === 'number') && s.writableLength > 0

      // 任一条件成立且仍在保护窗内 → 延后强拆
      if ((downstreamGrew || hasPendingWrite) && (Date.now() - start) < PROTECT_MS) {
        setTimeout(tick, IDLE_STEP_MS)
        return
      }
      // 未见增长、未挂写，或保护窗结束 → 强拆
      try { s.destroy() } catch {}
      
    }

    // 首次安排检查：短间隔快速感知是否仍有下行
    setTimeout(tick, IDLE_STEP_MS)
  } catch {}
}

/* =====================
   Helpers
===================== */
function isIPv4(h: string): boolean {
  const p = h.split('.')
  return p.length === 4 && p.every(x => /^\d+$/.test(x) && +x >= 0 && +x <= 255)
}
function isIPv6(h: string): boolean { return h.includes(':') }
function isIPAddress(h?: string): boolean { return !!h && (isIPv4(h) || isIPv6(h)) }

function isTLSClientHello(buf: Buffer): boolean {
  return !!buf && buf.length >= 5 && buf[0] === 0x16 && buf[1] === 0x03
}
function waitFirstAppData(client: Socket, info: string, timeoutMs = 15_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const onData = (b: Buffer) => { cleanup(); resolve(b) }
    const onErr = (e: any) => { cleanup(); reject(e) }
    const onTimeout = () => { cleanup(); reject(new Error(`${info} waitFirstAppData timeout ***********************`)) }
    const cleanup = () => {
      client.off('data', onData)
      client.off('error', onErr)
      if (timer) clearTimeout(timer)
    }
    client.once('data', onData)
    const timer = setTimeout(onTimeout, timeoutMs)
  })
}

/**
 * Micro prime with adaptive backoff:
 * 逐档尝试 5/10/20/40ms，任一档拿到首包立即返回；都没拿到则返回 null
 */
async function microWaitPrime(client: Socket, info: string): Promise<Buffer | null> {
  const slots = [5, 10, 20, 40]
  for (const ms of slots) {
    const first = await waitFirstAppData(client,info, ms)
    if (first && first.length) return first
  }
  // 一次性被动兜底：再等 120ms 捕获延迟到达的 ClientHello/首包
  const passive = await waitFirstAppData(client,info, 120)
  if (passive && passive.length) return passive
  return null
}

function connectWithTimeout(host: string, port: number, timeoutMs: number): Promise<Socket> {
    const info = `${host}:${port}`
  return new Promise((resolve, reject) => {
    const s = new Socket()
    let settled = false
    const doneOk = () => { if (!settled) { settled = true; s.on('error', () => {}); cleanup(); resolve(s) } }
    const doneErr = (err: any) => { if (!settled) { settled = true; cleanup(); try { s.destroy() } catch {}; reject(err) } }
    const onTimeout = () => doneErr(new Error(`${info} connect timeout`))
    const cleanup = () => { s.off('connect', doneOk); s.off('error', doneErr); s.off('timeout', onTimeout) }
    s.setNoDelay(true)
    s.setTimeout(timeoutMs, onTimeout)
    s.once('connect', doneOk)
    s.once('error', doneErr)
    s.connect(port, host)
  })
}

type filterRule = {
    DOMAIN: string[]
    IP: string[]
}


/* =====================
   Core
===================== */
export class ProxyServer {
  private server: Server
  private ruleMatcher
  private pacPath = '/pac'
  private pacProxy?: string   // 可选：外部显式指定返回的代理串（否则用本地端口推断）

    private tryHandlePacOnSamePort(socket: Socket, firstChunk: Buffer): boolean {
        // 尝试解析首行
        const head = firstChunk.toString('ascii')
        // 仅匹配 GET/HEAD 快速路径；不足一行就放行给原逻辑处理
        if (!(head.startsWith('GET ') || head.startsWith('HEAD '))) return false
        const lineEnd = head.indexOf('\r\n')
        if (lineEnd < 0) return false
        const firstLine = head.slice(0, lineEnd) // 例: "GET /pac?proxy=... HTTP/1.1"
        const m = firstLine.match(/^(GET|HEAD)\s(\S)\sHTTP\/1\.[01]$/i)
        if (!m) return false
        const method = m[1].toUpperCase()
        const path = m[2]

        const { pathname, query } = parseUrl(path, true)
        if (pathname !== this.pacPath) return false

        // 计算返回代理串：优先 query.proxy 其后 this.pacProxy，最后使用本机监听端口
        const port = (socket.address() as any)?.port
        const proxyStr =
        (port ? `SOCKS5 127.0.0.1:${port}; SOCKS 127.0.0.1:${port}; PROXY 127.0.0.1:${port}; DIRECT` : 'DIRECT')

        const pacText = this.ruleMatcher.pac(proxyStr)
        const body = Buffer.from(pacText, 'utf8')
        const header =
            'HTTP/1.1 200 OK\r\n' +
            'Content-Type: application/x-ns-proxy-autoconfig; charset=utf-8\r\n' +
            `Content-Length: ${body.length}\r\n` +
            'Connection: close\r\n' +
            '\r\n'

        socket.write(header)
        if (method === 'GET') socket.write(body)
        socket.end()
        return true
    }

  constructor(private port: number, private layerMinus?: LayerMinus) {
    this.server = createServer(socket => this.handleClientConnection(socket))
    this.ruleMatcher = createRuleMatcher({ DOMAIN: [], IP: [] })
    
  }

  start() {
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`🟢 Proxy server running at 0.0.0.0:${this.port}`)
    })
  }


  // ---- Connection entry ----
  private handleClientConnection = (client: Socket) => {

    
    // Early guard: avoid unhandled 'error' on client socket
    client.on('error', (e: any) => {
      try { logger('[client] error: ' + (e?.message ?? String(e))) } catch {}
      try { if (!client.destroyed) client.destroy() } catch {}
    })

    client.once('data', (first: Buffer) => {

      try {
        //      PAC
        if (this.tryHandlePacOnSamePort(client, first)) {
            return // 已响应并关闭
        }

        if (first[0] === 0x05) return this.handleSocks5(client, first)
        if (first[0] === 0x04) return this.handleSocks4(client, first)

        const s = first.toString('utf8', 0, Math.min(16, first.length)).toUpperCase()
        if (
          s.startsWith('GET') || s.startsWith('POST') || s.startsWith('PUT') ||
          s.startsWith('DELETE') || s.startsWith('HEAD') || s.startsWith('OPTIONS') ||
          s.startsWith('CONNECT') || s.startsWith('PATCH')
        ) {
          return this.handleHttp(client, first)
        }

        // fallback: 非代理协议，直接关闭
        logger(`[Proxy] Non-proxy first packet; closing. len=${first.length}`)
        try { client.destroy() } catch {}
      } catch (e) {
        logger('[Proxy] entry error: ' + String(e))
        try { client.destroy() } catch {}
      }
    })

    client.setTimeout?.(120_000, () => { if (!client.destroyed) client.destroy() })
  }

  /* -------------- SOCKS5 -------------- */
  private handleSocks5 = (client: Socket, _first: Buffer) => {
    const info = 'socks v5'
    // 握手：NO AUTH
    client.write(Buffer.from([0x05, 0x00]))
    client.once('data', async (reqBuf: Buffer) => {
      try {
        if (reqBuf.length < 4) return client.destroy()
        const cmd = reqBuf[1], atyp = reqBuf[3]
        let offset = 4, host = ''
        if (atyp === 0x01) { host = `${reqBuf[4]}.${reqBuf[5]}.${reqBuf[6]}.${reqBuf[7]}`; offset = 8 }
        else if (atyp === 0x03) { const n=reqBuf[4]; host = reqBuf.slice(5,5+n).toString('utf8'); offset=5+n }
        else if (atyp === 0x04) { const ip=reqBuf.slice(4,20); host = ip.toString('hex').match(/.{1,4}/g)!.join(':'); offset=20 }
        else return client.destroy()
        const port = reqBuf.readUInt16BE(offset)
        if (cmd !== 0x01) {
          client.write(Buffer.from([0x05,0x07,0x00,0x01,0,0,0,0,0,0])); return client.destroy()
        }
        // 回复成功，建立隧道语义
        client.write(Buffer.from([0x05,0x00,0x00,0x01,0,0,0,0,0,0]))

        const extra = reqBuf.slice(offset+2)
        
        const firstApp = extra.length ? extra : await microWaitPrime(client, `${info} ${host}:${port}`)
        return this.proxyConnection(client, host, port, firstApp, info)
        
      } catch (e) { logger('[SOCKS5] error: '+String(e)); client.destroy() }
    })
  }

  

/* -------------- SOCKS4 / 4a -------------- */
  private handleSocks4 = (client: Socket, first: Buffer) => {
    const info = 'socks v4'

    const parseReq = (buf: Buffer) => {
      const cmd = buf[1], dstPort = buf.readUInt16BE(2)
      const A=buf[4],B=buf[5],C=buf[6],D=buf[7]
      const is4a = (A===0 && B===0 && C===0 && D!==0)
      let host = `${A}.${B}.${C}.${D}`
      let offset = 8
      const uidEnd = buf.indexOf(0x00, offset); if (uidEnd===-1) return { error: true } as any
      offset = uidEnd + 1
      if (is4a) {
        const dEnd = buf.indexOf(0x00, offset); if (dEnd===-1) return { error: true } as any
        host = buf.slice(offset, dEnd).toString('utf8')
        offset = dEnd + 1
      }
      const extra = buf.length>offset ? buf.slice(offset) : Buffer.alloc(0)
      return { cmd, dstPort, host, is4a, extra }
    }
    const reply = (ok: boolean) => Buffer.from([0x00, ok?0x5A:0x5B, 0,0, 0,0,0,0])

    const proceed = async (req: ReturnType<typeof parseReq>) => {
      if ((req as any).error) { try{client.end()}catch{}; return }
      if (req.cmd !== 0x01) { client.write(reply(false)); return client.end() }

      try {
        // ✅ 立即回 0x5A，让客户端开始发送应用层首包（TLS ClientHello 等）
        client.write(reply(true))

          const initial = req.extra.length ? req.extra : await microWaitPrime(client, `${info} ${req.host}:${req.dstPort}`)
          return this.proxyConnection(client, req.host, req.dstPort, initial.length?initial:null, info)
        
      } catch (e) {
        try { client.end() } catch {}
        return
      }
    }

    const ready = (buf: Buffer) => proceed(parseReq(buf))

    if (first.length>=8 && first.indexOf(0x00,8)!==-1) { ready(first); return }
    let acc = Buffer.from(first)
    const onData = (b: Buffer) => {
      acc = Buffer.concat([acc,b])
      if (acc.length>=8 && acc.indexOf(0x00,8)!==-1) { client.removeListener('data', onData); ready(acc) }
    }
    client.on('data', onData)
    // Protect assembly stage from ECONNRESET while waiting for 0x00 terminator
    const onAsmError = (e: any) => {
      try { logger('[SOCKS4] assembly error: ' + (e?.message ?? String(e))) } catch {}
      try { client.removeListener('data', onData) } catch {}
      try { client.removeListener('error', onAsmError) } catch {}
      try { client.destroy() } catch {}
    };
    client.once('error', onAsmError)
  }

  /* -------------- HTTP/HTTPS -------------- */
  public rule: filterRule|null = null

  private handleHttp = async (client: Socket, first: Buffer) => {

    let info = ''
    
      const raw = first.toString('utf8')
      const lines = raw.split(/\r\n/)
      const requestLine = lines[0] || ''
      const [method, target, version] = requestLine.split(' ')




            // ---------- PAC（同端口）：优先截获 GET/HEAD /pac ----------
      
        const mth = (method || '').toUpperCase()


        if (mth === 'GET' || mth === 'HEAD') {
            let path = target || '/'
            // 兼容 absolute-form: GET http://host:port/pac?... HTTP/1.1
            if (/^https?:\/\//i.test(path)) {
                try {
                const u = new URL(path)
                path = (u.pathname || '/') + (u.search || '')
                } catch {}
            }

            if (path === '/pac' || path.startsWith('/pac?')) {
                const proxyStr = `SOCKS5 127.0.0.1:${this.port}; SOCKS 127.0.0.1:${this.port}; PROXY 127.0.0.1:${this.port}; DIRECT`
                const pacText = this.ruleMatcher.pac(proxyStr)
                const body = Buffer.from(pacText, 'utf8')
                const header =
                    'HTTP/1.1 200 OK\r\n' +
                    'Content-Type: application/x-ns-proxy-autoconfig; charset=utf-8\r\n' +
                    `Content-Length: ${body.length}\r\n` +
                    'Connection: close\r\n' +
                    '\r\n'
                client.write(header)
                if (mth === 'GET') client.write(body)
                try { client.end() } catch {}
                return
            }
        }
      

      // CONNECT: 建立隧道；路由在 proxyConnection 內統一處理



      if ((method||'').toUpperCase() === 'CONNECT') {
            const [host, portStr] = (target||'').split(':')
            const port = portStr ? parseInt(portStr,10) : 443

            client.write('HTTP/1.1 200 Connection established\r\n\r\n')

            info = `[https] proxy ${host}:${port}`
            const firstApp = await microWaitPrime(client, ``)
            return this.proxyConnection(client, host, port, firstApp, info)
      }

      try{

     // 非 CONNECT：absolute-form 優先，若請求行包含非標準端口，則以請求行端口為準
      // 1) 先解析請求行 URL 以捕獲非標準端口
      let urlHost: string | undefined
      let urlPort: number | undefined
      let scheme: string | undefined
      if (target && /^https?:\/\//i.test(target)) {
        try {
          const u = new URL(target)
          urlHost = u.hostname
          scheme = u.protocol // 'http:' | 'https:'
          urlPort = u.port ? Number(u.port) : undefined
        } catch {}
      }

      // 2) 解析 Host 頭；若 Host 沒有端口而 request-line 含端口，則以 request-line 的端口為準
      let headerHost: string | undefined
      let headerPort: number | undefined

      for (let i=1;i<lines.length;i++) {
        const line = lines[i]; if (!line) break
        const idx = line.indexOf(':'); if (idx<0) continue
        const k = line.slice(0, idx).trim().toLowerCase()
        const v = line.slice(idx+1).trim()
        if (k==='host') {
          if (v.includes(':')) { const [h,p] = v.split(':'); headerHost=h; headerPort=parseInt(p,10) }
          else { headerHost = v }
          break
        }
      }


      // 3) 決定最終 host/port
      let host: string | undefined = headerHost || urlHost
      let port: number | undefined = (urlPort != null ? urlPort : headerPort)

      info = `[HTTP] ${host}:${port}`
      if (port == null) port = (scheme === 'https:') ? 443 : 80

      if (!host) { logger('[HTTP] no host, close'); client.destroy(); return }

      // 4) 將 absolute-form 改寫為 origin-form（/path?query）
      let relativePath = target || '/'
      if (/^https?:\/\//i.test(relativePath)) {
        try { const u = new URL(relativePath); relativePath = (u.pathname || '/') + (u.search||'') } catch { relativePath = '/' }
      } else if (!relativePath.startsWith('/')) { relativePath = '/' }

      // 5) 重寫頭：刪除 hop-by-hop；Host 在非 80/443 時補 :port；Proxy-Connection 映射為 Connection
      const hopByHop = new Set(['proxy-connection','connection','keep-alive','te','trailer','transfer-encoding','upgrade','proxy-authenticate','proxy-authorization'])
      const outHeaders: string[] = []
      let hasHost = false
      let proxyConnVal: string | null = null


      for (let i=1;i<lines.length;i++) {
        const line = lines[i]; if (line==='') break
        const idx = line.indexOf(':'); if (idx<=0) continue
        const kRaw = line.slice(0,idx).trim(); const vRaw = line.slice(idx+1).trim()
        const k = kRaw.toLowerCase()
        if (k==='host') { hasHost=true; outHeaders.push(`Host: ${host}${(port!==80 && port!==443)?`:${port}`:''}`); continue }
        if (k==='proxy-connection') { proxyConnVal = vRaw; continue }
        if (hopByHop.has(k)) continue
        outHeaders.push(`${kRaw}: ${vRaw}`)
      }
      if (!hasHost) outHeaders.unshift(`Host: ${host}${(port!==80 && port!==443)?`:${port}`:''}`)
      if (proxyConnVal && !outHeaders.some(h => /^Connection:/i.test(h))) outHeaders.push(`Connection: ${proxyConnVal}`)

      const bodyIndex = raw.indexOf('\r\n\r\n')
      const body = bodyIndex>=0 ? raw.slice(bodyIndex+4) : ''
      const rebuilt = `${method} ${relativePath} ${version}\r\n${outHeaders.join('\r\n')}\r\n\r\n${body}`
      const initialData = Buffer.from(rebuilt, 'utf8')

      return this.proxyConnection(client, host, port, initialData, info)
    } catch (ex) {
        logger(`[HTTP] ${info} parse error: `+String(ex)); client.destroy()
    }
      
    
  }

  /* -------------- Upstream dialing -------------- */
  private async proxyConnection(client: Socket, host: string, port: number, initialData: Buffer|null, protocol: string) {
    if (!host || !port) { try{client.destroy()}catch{}; return }
    const connectInof = await this.shouldUseLayerMinus(host, port, initialData, this.layerMinus )

    if (connectInof) {
       

         try {
            logger(`[proxyConnection ${protocol}] shouldUseLayerMinus -> ${host}:${port} `)
            const remote = await connectWithTimeout(connectInof.entryNode, 80, 3000)
            this.bindAndPipe(client, remote, protocol, Buffer.from(connectInof.initialData))
            logger(`[proxyConnection] ${protocol}] shouldUseLayerMinus -> ${host}:${port}  established`)
        } catch (e) {
            logger(`[proxyConnection] ${protocol}] shouldUseLayerMinus failed *****************: ${String(e)}`)
        }
        return
    }

    // Step 1: DIRECT first
    try {
      logger(`[proxyConnection ${protocol}] DIRECT -> ${host}:${port} `)
      const remote = await connectWithTimeout(host, port, 1500)
      this.bindAndPipe(client, remote, protocol, initialData)
      logger(`[proxyConnection] ${protocol}] DIRECT -> ${host}:${port}  established`)
      return
    } catch (e) {
      logger(`[proxyConnection] ${protocol}] DIRECT failed *****************: ${String(e)}`)
    }


  }

  private bindAndPipe(client: Socket, remote: Socket, info: string, initialData: Buffer|null) {
    const cleanup = () => {
      safeClose(remote)
      safeClose(client)
    }

    const uploadCount = new BandwidthCount(`[${info}] ==> UPLOAD`)
    const downloadCount = new BandwidthCount(`[${info}] <== DOWNLOAD`)


    remote.on('error', (e) => { logger('[upstream] remote error: '+String(e)); cleanup() })
    client.on('error', (e) => { logger('[upstream] client error: '+String(e)); cleanup() })
    remote.on('close', cleanup)
    client.on('close', cleanup)
    remote.setTimeout?.(120_000, cleanup)
    client.setTimeout?.(300_000, cleanup)
    remote.setNoDelay(true)
    client.setNoDelay(true)
    // Write initial data (e.g., TLS ClientHello or HTTP request) to remote, never to client


    client.pipe(uploadCount).pipe(remote)
    remote.pipe(downloadCount).pipe(client)
    if (initialData && initialData.length) {
      try { uploadCount.write(initialData) } catch (e) { logger('[upstream] initial write error: '+String(e)); cleanup(); return }
    }
  }

  // Policy hook: which routes require LayerMinus TLS-first behavior?
  private async shouldUseLayerMinus(host: string, port: number, initialData: Buffer|null, layerMinus: LayerMinus|undefined): Promise<makeConnectResult|null> {
    // You can replace with your own policy. For now: prefer LayerMinus for 443 on domains.

    if (layerMinus === undefined || !this.ruleMatcher?.match) {
        logger(`shouldUseLayerMinus layerMinus === undefined `)
        return null
    }

    const byPass = this.ruleMatcher.match(host)
    if (byPass) {
        return null
    }

    return await layerMinus.makeConnect(host, port, initialData)
  }

  public ruleGet = (data: filterRule) => {
    this.rule = data
    this.ruleMatcher = createRuleMatcher(data)
  }

  public end = () => new Promise(executor => {
    if (this.server) {
        this.server.close(err => {
            clearTimeout(timeout)
            executor(true)
        })

        const timeout = setTimeout(() => {
            executor(true)
        }, 10_000)
    }

  })
}


// --- Global safety net (optional) ---
process.on('uncaughtException', (e) => {
  try { logger('[process] uncaughtException: ' + (e?.stack || e)) } catch {}
})
process.on('unhandledRejection', (e: any) => {
  try { logger('[process] unhandledRejection: ' + (e?.stack || e)) } catch {}
})




/**
 * 			test 
 * 			curl -v -x http://127.0.0.1:3002 "https://www.google.com"
 *          curl -v -x http://127.0.0.1:3002 "https://www.speedtest.net"
 *          curl -v -x http://127.0.0.1:3002 "https://www.bbc.com"
 *          curl -v -x http://127.0.0.1:3002 "http://example.com"
//          curl -v -x socks4a://localhost:3002 "https://www.google.com"
//          curl -v -x socks4://localhost:3002 "https://www.google.com"
//          curl -v -x socks5h://localhost:3002 "https://www.google.com"

 * 			curl -v -x http://127.0.0.1:3003 "https://www.google.com"
			curl -v -x http://127.0.0.1:3003 "http://www.google.com"
//          curl -v -x socks4a://localhost:3002 "https://www.google.com"
//          curl -v -x socks4://localhost:3002 "https://www.google.com"
//          curl -v -x socks5h://localhost:3002 "https://www.google.com"
 * 			
 */

const test = () => {
	const entryNodes: nodes_info[] = [{
		"region": "NW.DE",
		"country": "DE",
		"ip_addr": "217.160.189.159",
		"armoredPublicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZq2V5xYJKwYBBAHaRw8BAQdAhqIi6sQx/wqogD+T0Yftwsx7iBhd4Iyh\nlRCFnJKBODHNKjB4Y2JCQjEzNzE5NzNENTdlNmJENDVhQzBkZmVGRDQ5M2I1\nOUY5RDc2QsKMBBAWCgA+BYJmrZXnBAsJBwgJkArZXaLou3oNAxUICgQWAAIB\nAhkBApsDAh4BFiEExfcG2i3ma6s72VROCtldoui7eg0AAHFgAQCrT8y1Y69H\noXTHfdLuEk+XUDpq4CAvj7KkHxbPNQU+PQD/SdBbRUcvSkzzoU4tLcXxVI0Q\nST8za1hvo3RdWCglxAPOOARmrZXnEgorBgEEAZdVAQUBAQdAcLPhpj4WdcZN\nu7pP/LLYYjzg0JhyYvVpDwUoXa9WmkoDAQgHwngEGBYKACoFgmatlecJkArZ\nXaLou3oNApsMFiEExfcG2i3ma6s72VROCtldoui7eg0AADvRAQDrgO8K+hza\ntH4LTpGZ7OscC7M2ZtUV0zXshHlEnxS5NgD/ZCAHabk0Y47bANGG7KrcqsHY\n3pmfYRPFcvckAoPiagc=\n=VhCf\n-----END PGP PUBLIC KEY BLOCK-----\n",
		"last_online": false,
		"nftNumber": 100,
		"domain": "9977E9A45187DD80.conet.network"
	},
    // {
    //     "region": "MD.ES",
    //     "country": "ES",
    //     "ip_addr": "82.165.208.58",
    //     "armoredPublicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZo9u8xYJKwYBBAHaRw8BAQdAhkOA9BSN0JHlwv6DteiKYiHq/fkJeeKq\npJH2GV02RDvNKjB4ZTJFN0E2OEUzRDFlNTBGMEFmMTVkNzEzRjkwZjQ5OTJD\nRDE5RGZjOMKMBBAWCgA+BYJmj27zBAsJBwgJkK3nyMY0cs4UAxUICgQWAAIB\nAhkBApsDAh4BFiEEgBIRfR6KNXDnIkoyrefIxjRyzhQAAPWNAPsFKlIV58gy\n8aWkFOSVaQWmruBgqDxPAi9klhc/QAFj8gD+P5zTkZa199PonfrB4ezn2Mac\nPQQaRLRtWTIBHn0WvAXOOARmj27zEgorBgEEAZdVAQUBAQdAvRYB8A9xiU76\nOi6LOOLaHvOGvJHCa8zWAkx9m0kPFi4DAQgHwngEGBYKACoFgmaPbvMJkK3n\nyMY0cs4UApsMFiEEgBIRfR6KNXDnIkoyrefIxjRyzhQAAFxmAQDgT7yXX8Zl\nYLzxKbEeZY+Rx1bdNLxPPRJmjcFFcbL2UQD6AxYNoome/I1FKplyFQsGjJGq\nWO5g9bt+Cjir2/yzIgk=\n=GfRj\n-----END PGP PUBLIC KEY BLOCK-----\n",
    //     "last_online": false,
    //     "nftNumber": 101,
    //     "domain": "B4CB0A41352E9BDF.conet.network"
    // }
    ]
	const egressNodes: nodes_info[] = [{
		"region": "MD.ES",
		"country": "ES",
		"ip_addr": "93.93.112.187",
		"armoredPublicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZo9ITBYJKwYBBAHaRw8BAQdAtFGkXMLHSAJ3jMZAVmfMvtFF74PkpYR9\nT50s9Ndr6HnNKjB4NmJGM0FhNzI2MWUyMUJlNUZjNzgxQWMwOUY5NDc1YzhB\nMzRBZkVlYcKMBBAWCgA+BYJmj0hMBAsJBwgJkOe/gynD16TlAxUICgQWAAIB\nAhkBApsDAh4BFiEEpJqLA2EpKEPDlaCI57+DKcPXpOUAALCdAQCIFyD/LlbY\nRGWzyaS++BBNIslOoktpHxzcgS+sD7dJggEAxGvDZQiu42l7VlStvlN4J9Jr\nGWJy8opWUlghMFcZHgrOOARmj0hMEgorBgEEAZdVAQUBAQdAqtevF55R1RHW\nh3L8novWfriyXuVZJo/vwUTylQwdCggDAQgHwngEGBYKACoFgmaPSEwJkOe/\ngynD16TlApsMFiEEpJqLA2EpKEPDlaCI57+DKcPXpOUAAHHFAQCbOklWpmRw\niorLHhB99zbaNfsn9/F2uJwRs9U0/mBAhQEAg0VOc4nDfb9MD0tHTP6crD62\nFaYFiQ7vNSBo3DuXlw0=\n=XXSu\n-----END PGP PUBLIC KEY BLOCK-----\n",
		"last_online": false,
		"nftNumber": 101,
		"domain": "B4CB0A41352E9BDF.conet.network"
	}]
	const privateKey = ''
	const layerMinus = new LayerMinus (entryNodes, egressNodes, privateKey)
	const server = new ProxyServer(3002, layerMinus)
    server.start()
}

