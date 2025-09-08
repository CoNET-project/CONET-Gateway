import * as net from 'net';
import * as dgram from 'dgram';
import { EventEmitter } from 'events';
import { promisify } from 'util'; // (may be unused after DoH switch)

import { resolve4 as dnsResolve4, resolve6 as dnsResolve6, lookup as dnsLookup } from './dnsAdapter';

// SOCKS v5 Constants
const SOCKS_VERSION = 0x05;
const NO_AUTH = 0x00;
const NO_ACCEPTABLE_METHODS = 0xFF;

// Address types
const ATYP = {
  IPv4: 0x01,
  DOMAIN: 0x03,
  IPv6: 0x04
};

// Commands
const CMD = {
  CONNECT: 0x01,
  BIND: 0x02,
  UDP_ASSOCIATE: 0x03
};

// Reply codes
const REPLY = {
  SUCCESS: 0x00,
  GENERAL_FAILURE: 0x01,
  CONNECTION_NOT_ALLOWED: 0x02,
  NETWORK_UNREACHABLE: 0x03,
  HOST_UNREACHABLE: 0x04,
  CONNECTION_REFUSED: 0x05,
  TTL_EXPIRED: 0x06,
  COMMAND_NOT_SUPPORTED: 0x07,
  ADDRESS_TYPE_NOT_SUPPORTED: 0x08
};

interface Socks5Options {
  port?: number;
  host?: string;
  enableDnsCache?: boolean;
  dnsCacheTtl?: number;
  dnsTimeout?: number;
  preferIPv4?: boolean;
}

interface DnsCacheEntry {
  addresses: string[];
  timestamp: number;
  ttl: number;
}

class Socks5Server extends EventEmitter {
  private server: net.Server;
  private port: number;
  private host: string;
  private dnsCache: Map<string, DnsCacheEntry>;
  private enableDnsCache: boolean;
  private dnsCacheTtl: number;
  private dnsTimeout: number;
  private preferIPv4: boolean;

  constructor(options: Socks5Options = {}) {
    super();
    this.port = options.port || 1080;
    this.host = options.host || '127.0.0.1';
    this.enableDnsCache = options.enableDnsCache !== false;
    this.dnsCacheTtl = options.dnsCacheTtl || 300000; // 5 minutes default
    this.dnsTimeout = options.dnsTimeout || 5000; // 5 seconds default
    this.preferIPv4 = options.preferIPv4 !== false;
    this.dnsCache = new Map();
    this.server = net.createServer();
    this.setupServer();
    
    // Clean up DNS cache periodically
    if (this.enableDnsCache) {
      setInterval(() => this.cleanupDnsCache(), 60000); // Clean every minute
    }
  }

  private setupServer(): void {
    this.server.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    this.server.on('error', (err) => {
      console.error('Server error:', err);
      this.emit('error', err);
    });

    this.server.on('listening', () => {
      console.log(`SOCKS5 proxy server listening on ${this.host}:${this.port}`);
      console.log(`DNS caching: ${this.enableDnsCache ? 'enabled' : 'disabled'}`);
      this.emit('listening');
    });
  }

  private cleanupDnsCache(): void {
    const now = Date.now();
    for (const [domain, entry] of this.dnsCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.dnsCache.delete(domain);
      }
    }
  }

  private async resolveDomain(domain: string): Promise<string> {
    // Check cache first
    if (this.enableDnsCache) {
      const cached = this.dnsCache.get(domain);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log(`DNS cache hit for ${domain}: ${cached.addresses[0]}`);
        // Return random address from cache for load balancing
        return cached.addresses[Math.floor(Math.random() * cached.addresses.length)];
      }
    }

    console.log(`Resolving DNS for ${domain}`);

    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('DNS timeout')), this.dnsTimeout);
      });

      // Try multiple resolution methods
      const resolvePromise = this.performDnsResolution(domain);
      
      const result = await Promise.race([resolvePromise, timeoutPromise]);
      
      // Cache the result
      if (this.enableDnsCache && result.addresses.length > 0) {
        this.dnsCache.set(domain, {
          addresses: result.addresses,
          timestamp: Date.now(),
          ttl: this.dnsCacheTtl
        });
      }

      return result.addresses[0];
    } catch (err) {
      console.error(`DNS resolution failed for ${domain}:`, err);
      throw err;
    }
  }

  private async performDnsResolution(domain: string): Promise<{ addresses: string[] }> {
    const addresses: string[] = [];

    try {
      // Try standard lookup first (uses system resolver)
      const result = await dnsLookup(domain, { 
        family: this.preferIPv4 ? 4 : 0,
        all: true 
      }) as { address: string; family: number }[];
      
      // When 'all' is true, result is always an array
      addresses.push(...result.map(r => r.address));
    } catch (lookupErr) {
      // If lookup fails, try direct DNS resolution
      try {
        if (this.preferIPv4) {
          const ipv4Addresses = await dnsResolve4(domain);
          addresses.push(...ipv4Addresses);
        } else {
          // Try both IPv4 and IPv6
          const [ipv4Result, ipv6Result] = await Promise.allSettled([
            dnsResolve4(domain),
            dnsResolve6(domain)
          ]);

          if (ipv4Result.status === 'fulfilled') {
            addresses.push(...ipv4Result.value);
          }
          if (ipv6Result.status === 'fulfilled') {
            addresses.push(...ipv6Result.value);
          }
        }
      } catch (resolveErr) {
        throw new Error(`Failed to resolve ${domain}: ${resolveErr}`);
      }
    }

    if (addresses.length === 0) {
      throw new Error(`No addresses found for ${domain}`);
    }

    return { addresses };
  }

  private handleConnection(socket: net.Socket): void {
    let stage = 'handshake';
    let isActive = true;
    
    socket.on('data', async (data) => {
      if (!isActive) return;
      
      try {
        if (stage === 'handshake') {
          this.handleHandshake(socket, data);
          stage = 'request';
        } else if (stage === 'request') {
          await this.handleRequest(socket, data);
          stage = 'established';
        }
      } catch (err: any) {
        if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') {
          console.error('Connection error:', err);
        }
        isActive = false;
        socket.destroy();
      }
    });

    socket.on('error', (err: any) => {
      isActive = false;
      if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') {
        console.error('Socket error:', err);
      }
      socket.destroy();
    });

    socket.on('close', () => {
      isActive = false;
    });
  }

  private handleHandshake(socket: net.Socket, data: Buffer): void {
    if (data[0] !== SOCKS_VERSION) {
      socket.end();
      return;
    }

    const nMethods = data[1];
    const methods = data.slice(2, 2 + nMethods);
    
    if (methods.includes(NO_AUTH)) {
      const response = Buffer.from([SOCKS_VERSION, NO_AUTH]);
      socket.write(response as Uint8Array);
    } else {
      const response = Buffer.from([SOCKS_VERSION, NO_ACCEPTABLE_METHODS]);
      socket.end(response as Uint8Array);
    }
  }

  private async handleRequest(socket: net.Socket, data: Buffer): Promise<void> {
    if (data[0] !== SOCKS_VERSION) {
      socket.end();
      return;
    }

    const cmd = data[1];
    const atyp = data[3];
    
    let targetHost: string;
    let targetPort: number;
    let offset = 4;
    let originalDomain: string | null = null;

    // Parse target address
    switch (atyp) {
      case ATYP.IPv4:
        targetHost = Array.from(data.slice(4, 8)).join('.');
        offset = 8;
        break;
      
      case ATYP.DOMAIN:
        const domainLen = data[4];
        originalDomain = data.slice(5, 5 + domainLen).toString();
        targetHost = originalDomain;
        offset = 5 + domainLen;
        break;
      
      case ATYP.IPv6:
        const ipv6Parts: string[] = [];
        for (let i = 4; i < 20; i += 2) {
          ipv6Parts.push(data.slice(i, i + 2).toString('hex'));
        }
        targetHost = ipv6Parts.join(':');
        offset = 20;
        break;
      
      default:
        this.sendReply(socket, REPLY.ADDRESS_TYPE_NOT_SUPPORTED);
        return;
    }

    targetPort = data.readUInt16BE(offset);

    console.log(`Request: CMD=${cmd}, Target=${targetHost}:${targetPort}, Type=${atyp === ATYP.DOMAIN ? 'DOMAIN' : 'IP'}`);

    // Handle different commands
    switch (cmd) {
      case CMD.CONNECT:
        // Resolve domain if necessary
        let resolvedHost = targetHost;
        if (atyp === ATYP.DOMAIN) {
          try {
            resolvedHost = await this.resolveDomain(targetHost);
            console.log(`Resolved ${targetHost} to ${resolvedHost}`);
          } catch (err) {
            console.error(`Failed to resolve ${targetHost}:`, err);
            this.sendReply(socket, REPLY.HOST_UNREACHABLE);
            socket.end();
            return;
          }
        }
        await this.handleConnect(socket, resolvedHost, targetPort, originalDomain);
        break;
      
      case CMD.BIND:
      case CMD.UDP_ASSOCIATE:
        this.sendReply(socket, REPLY.COMMAND_NOT_SUPPORTED);
        socket.end();
        break;
      
      default:
        this.sendReply(socket, REPLY.COMMAND_NOT_SUPPORTED);
        socket.end();
    }
  }

  private async handleConnect(
    clientSocket: net.Socket, 
    targetHost: string, 
    targetPort: number,
    originalDomain: string | null = null
  ): Promise<void> {
    const targetSocket = new net.Socket();
    let clientClosed = false;
    let targetClosed = false;
    
    const cleanup = () => {
      if (!clientClosed) {
        clientClosed = true;
        clientSocket.unpipe(targetSocket);
        clientSocket.destroy();
      }
      if (!targetClosed) {
        targetClosed = true;
        targetSocket.unpipe(clientSocket);
        targetSocket.destroy();
      }
    };
    
    targetSocket.connect(targetPort, targetHost, () => {
      const displayHost = originalDomain || targetHost;
      console.log(`Connected to ${displayHost}:${targetPort} (${targetHost}:${targetPort})`);
      
      if (clientSocket.destroyed || clientClosed) {
        targetSocket.destroy();
        return;
      }
      
      const localAddress = targetSocket.localAddress || '0.0.0.0';
      const localPort = targetSocket.localPort || 0;
      this.sendReply(clientSocket, REPLY.SUCCESS, localAddress, localPort);
      
      clientSocket.pipe(targetSocket, { end: false });
      targetSocket.pipe(clientSocket, { end: false });
    });

    targetSocket.on('error', (err: any) => {
      if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') {
        console.error(`Target connection error: ${err.message}`);
      }
      
      if (!targetSocket.connecting) {
        cleanup();
        return;
      }
      
      let replyCode = REPLY.GENERAL_FAILURE;
      if (err.code === 'ECONNREFUSED') {
        replyCode = REPLY.CONNECTION_REFUSED;
      } else if (err.code === 'EHOSTUNREACH') {
        replyCode = REPLY.HOST_UNREACHABLE;
      } else if (err.code === 'ENETUNREACH') {
        replyCode = REPLY.NETWORK_UNREACHABLE;
      } else if (err.code === 'ETIMEDOUT') {
        replyCode = REPLY.TTL_EXPIRED;
      }
      
      if (!clientClosed && !clientSocket.destroyed) {
        this.sendReply(clientSocket, replyCode);
      }
      cleanup();
    });

    targetSocket.on('close', () => {
      if (!targetClosed) {
        targetClosed = true;
        if (!clientClosed && !clientSocket.destroyed) {
          clientSocket.end();
        }
      }
    });

    targetSocket.on('end', () => {
      if (!clientClosed && !clientSocket.destroyed) {
        clientSocket.end();
      }
    });

    clientSocket.on('close', () => {
      if (!clientClosed) {
        clientClosed = true;
        if (!targetClosed && !targetSocket.destroyed) {
          targetSocket.end();
        }
      }
    });
    
    clientSocket.on('end', () => {
      if (!targetClosed && !targetSocket.destroyed) {
        targetSocket.end();
      }
    });
    
    clientSocket.on('error', (err: any) => {
      if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') {
        console.error(`Client socket error: ${err.message}`);
      }
      cleanup();
    });
  }

  private sendReply(socket: net.Socket, reply: number, bindAddr: string = '0.0.0.0', bindPort: number = 0): void {
    if (socket.destroyed || !socket.writable) {
      return;
    }
    
    const response = Buffer.allocUnsafe(10);
    response[0] = SOCKS_VERSION;
    response[1] = reply;
    response[2] = 0x00;
    response[3] = ATYP.IPv4;
    
    const addrParts = bindAddr.split('.').map(part => parseInt(part));
    response[4] = addrParts[0];
    response[5] = addrParts[1];
    response[6] = addrParts[2];
    response[7] = addrParts[3];
    
    response.writeUInt16BE(bindPort, 8);
    
    try {
      socket.write(response as Uint8Array);
    } catch (err) {
      // Ignore write errors on closed sockets
    }
  }

  public start(): void {
    this.server.listen(this.port, this.host);
  }

  public stop(): void {
    this.server.close();
    if (this.enableDnsCache) {
      this.dnsCache.clear();
    }
  }

  public getDnsCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.dnsCache.size,
      entries: Array.from(this.dnsCache.keys())
    };
  }

  public clearDnsCache(): void {
    this.dnsCache.clear();
    console.log('DNS cache cleared');
  }
}

// Usage example
// if (require.main === module) {
//   const server = new Socks5Server({
//     port: 1080,
//     host: '127.0.0.1',
//     enableDnsCache: true,
//     dnsCacheTtl: 300000, // 5 minutes
//     dnsTimeout: 5000, // 5 seconds
//     preferIPv4: true
//   });
  
//   server.on('listening', () => {
//     console.log('SOCKS5 proxy server with DNS support is running');
//     console.log('Configure your applications to use 127.0.0.1:1080 as SOCKS5 proxy');
//   });
  
//   server.on('error', (err) => {
//     console.error('Server error:', err);
//     process.exit(1);
//   });

//   // Graceful shutdown
//   process.on('SIGINT', () => {
//     console.log('\nShutting down SOCKS5 proxy server...');
//     server.stop();
//     process.exit(0);
//   });

//   process.on('SIGTERM', () => {
//     console.log('\nShutting down SOCKS5 proxy server...');
//     server.stop();
//     process.exit(0);
//   });

//   // Show cache stats periodically (optional)
//   setInterval(() => {
//     const stats = server.getDnsCacheStats();
//     if (stats.size > 0) {
//       console.log(`DNS Cache: ${stats.size} entries cached`);
//     }
//   }, 30000); // Every 30 seconds

//   server.start();
// }

export default Socks5Server;