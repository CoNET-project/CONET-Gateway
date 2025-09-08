/**
 * dnsAdapter.ts
 * DNS-over-HTTPS resolver providing a Node.js `dns`-like surface: resolve4, resolve6, lookup.
 * - 多 IP 直连 DoH（Google / Cloudflare / OpenDNS），自动 failover
 * - 本地正缓存 5 分钟，负缓存 30 秒
 * - 并发去重（singleflight）
 * - Sticky 选址（对多 A/AAAA：在缓存期内固定选同一 IP，并放在结果数组首位）
 */

import * as https from 'https';

/** ===== 配置 / 环境变量 ===== */
const DEFAULT_TIMEOUT_MS = Number(process.env.DOH_TIMEOUT_MS ?? 3000);
const STICKY_MODE: 'hash' | 'none' = (process.env.DOH_STICKY as any) === 'none' ? 'none' : 'hash';
const STICKY_SALT = String(process.env.DOH_STICKY_SALT ?? '');

/** ===== DoH 端点（直连 IP + SNI + Host）===== */
type DohEndpoint = {
  ip: string;             // 连接用 IP
  host: string;           // TLS SNI + Host 头
  jsonPathFor: (name: string, rrtype: 'A' | 'AAAA') => string;
  headers?: Record<string, string>;
};

const DOH_ENDPOINTS: DohEndpoint[] = [
  // Google
  { ip: '8.8.8.8', host: 'dns.google', jsonPathFor: (n, t) => `/resolve?name=${encodeURIComponent(n)}&type=${t}` },
  { ip: '8.8.4.4', host: 'dns.google', jsonPathFor: (n, t) => `/resolve?name=${encodeURIComponent(n)}&type=${t}` },

  // Cloudflare
  { ip: '1.1.1.1', host: 'cloudflare-dns.com', jsonPathFor: (n, t) => `/dns-query?name=${encodeURIComponent(n)}&type=${t}` },
  { ip: '1.0.0.1', host: 'cloudflare-dns.com', jsonPathFor: (n, t) => `/dns-query?name=${encodeURIComponent(n)}&type=${t}` },

  // OpenDNS / Cisco
  { ip: '208.67.222.222', host: 'doh.opendns.com', jsonPathFor: (n, t) => `/dns-query?name=${encodeURIComponent(n)}&type=${t}` },
  { ip: '208.67.220.220', host: 'doh.opendns.com', jsonPathFor: (n, t) => `/dns-query?name=${encodeURIComponent(n)}&type=${t}` },
];

/** ===== 类型定义 ===== */
type DnsJsonAnswer = { name: string; type: number; TTL?: number; data: string };
type DnsJsonResponse = { Status: number; Answer?: DnsJsonAnswer[] };

export type LookupEntry = { address: string; family: 4 | 6 };

/** ===== 缓存与控制 ===== */
const POS_TTL_MS = 300_000; // 正缓存：5 分钟
const NEG_TTL_MS = 30_000;  // 负缓存：30 秒

type PosCacheRecord = {
  expiresAt: number;
  v4?: string[];          // 已按 Sticky 选址，把选中地址置于首位
  v6?: string[];
  chosenV4?: string;      // 为了直观调试，可记录本期选中项
  chosenV6?: string;
};
const posCache = new Map<string, PosCacheRecord>(); // key: `${name}::A` 或 `${name}::AAAA`

type NegCacheRecord = { expiresAt: number };
const negCache = new Map<string, NegCacheRecord>(); // key: `${name}::A` 或 `${name}::AAAA`

// 并发去重（同域同 RR 正在解析时复用同一 Promise）
const inflight = new Map<string, Promise<string[]>>();

/** ===== 小工具：哈希与 Sticky 选址 ===== */
function hash32(s: string): number {
  // 简单高效的 32-bit 哈希（FNV 或 BKDR 的轻量变体）
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function pickSticky(addresses: string[], key: string): { chosen: string, ordered: string[] } {
  if (addresses.length <= 1 || STICKY_MODE === 'none') {
    return { chosen: addresses[0] ?? '', ordered: addresses.slice() };
  }
  const idx = hash32(STICKY_SALT + '|' + key) % addresses.length;
  const chosen = addresses[idx];
  if (!chosen) return { chosen: addresses[0], ordered: addresses.slice() };

  // 将 chosen 放在首位，保持其余相对顺序
  const rest = addresses.filter(a => a !== chosen);
  return { chosen, ordered: [chosen, ...rest] };
}

/** ===== DoH 拉取（多端点 failover）===== */
function dohFetchJson(name: string, rrtype: 'A' | 'AAAA', timeoutMs = DEFAULT_TIMEOUT_MS): Promise<DnsJsonResponse> {
  const eps = [...DOH_ENDPOINTS];
  return new Promise((resolve, reject) => {
    let idx = 0;
    const tryNext = () => {
      if (idx >= eps.length) return reject(new Error('All DoH endpoints failed'));
      const ep = eps[idx++];
      const path = ep.jsonPathFor(name, rrtype);
      const headers = { ...(ep.headers || {}), host: ep.host, accept: 'application/dns-json' };

      const req = https.request(
        { method: 'GET', host: ep.ip, servername: ep.host, path, headers, timeout: timeoutMs },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data) as DnsJsonResponse;
              if (parsed.Status !== 0) return tryNext();
              resolve(parsed);
            } catch {
              tryNext();
            }
          });
        }
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', () => tryNext());
      req.end();
    };
    tryNext();
  });
}

/** ===== 通用解析（含 正/负缓存、并发去重、Sticky）===== */
async function resolveGeneric(name: string, rr: 'A' | 'AAAA'): Promise<string[]> {
  const key = `${name}::${rr}`;
  const now = Date.now();

  // 1) 正缓存命中
  const pos = posCache.get(key);
  if (pos && pos.expiresAt > now) {
    return rr === 'A' ? (pos.v4 ?? []) : (pos.v6 ?? []);
  }

  // 2) 负缓存命中
  const neg = negCache.get(key);
  if (neg && neg.expiresAt > now) {
    const err: any = new Error('ENOTFOUND');
    err.code = 'ENOTFOUND';
    throw err;
  }

  // 3) 并发去重
  if (inflight.has(key)) return inflight.get(key)!;

  const task = (async () => {
    try {
      const json = await dohFetchJson(name, rr);
      const answers = (json.Answer ?? []).filter(a => (rr === 'A' ? a.type === 1 : a.type === 28));
      const rawAddrs = answers.map(a => a.data).filter(Boolean);

      if (rawAddrs.length === 0) {
        negCache.set(key, { expiresAt: now + NEG_TTL_MS });
        const err: any = new Error('ENOTFOUND');
        err.code = 'ENOTFOUND';
        throw err;
      }

      // Sticky 选址（将选中地址放到首位）
      const { chosen, ordered } = pickSticky(rawAddrs, key);

      // 写正缓存（固定 5 分钟）
      const record: PosCacheRecord = {
        expiresAt: now + POS_TTL_MS,
        ...(rr === 'A' ? { v4: ordered, chosenV4: chosen } : { v6: ordered, chosenV6: chosen }),
      };

      // 合并同域另一族（便于 getCacheStats 大致查看）
      const existing = posCache.get(key) || { expiresAt: now + POS_TTL_MS };
      const merged: PosCacheRecord = { ...existing, ...record, expiresAt: now + POS_TTL_MS };
      posCache.set(key, merged);

      return ordered;
    } catch (e) {
      // 网络/超时/DoH 非 0 状态 → 负缓存
      negCache.set(key, { expiresAt: Date.now() + NEG_TTL_MS });
      throw e;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

/** ===== 对外 API ===== */
export async function resolve4(name: string): Promise<string[]> {
  return resolveGeneric(name, 'A');
}

export async function resolve6(name: string): Promise<string[]> {
  return resolveGeneric(name, 'AAAA');
}

export async function lookup(
  name: string,
  opts: { family?: 0 | 4 | 6, all?: boolean } = {}
): Promise<LookupEntry | LookupEntry[]> {
  const fam = opts.family ?? 4;
  const all = opts.all === true;

  const get4 = async () => (await resolve4(name)).map(a => ({ address: a, family: 4 as const }));
  const get6 = async () => (await resolve6(name)).map(a => ({ address: a, family: 6 as const }));

  if (all) {
    if (fam === 4) return await get4();
    if (fam === 6) return await get6();
    // fam === 0 → v4 + v6 合并
    return [...await get4().catch(() => []), ...await get6().catch(() => [])];
  } else {
    // 非 all：返回首个（已按 Sticky 排序，首个即固定地址）
    if (fam === 6) { const r6 = await get6(); if (r6.length) return r6[0]; }
    const r4 = await get4().catch(() => []); if (r4.length) return r4[0];
    const r6b = await get6().catch(() => []); if (r6b.length) return r6b[0];
    const err: any = new Error('ENOTFOUND');
    err.code = 'ENOTFOUND';
    throw err;
  }
}

/** ===== 工具 ===== */
export function getCacheStats() {
  return {
    posSize: posCache.size,
    negSize: negCache.size,
    inflight: inflight.size,
    stickyMode: STICKY_MODE,
  };
}

export function clearCache() {
  posCache.clear();
  negCache.clear();
}
