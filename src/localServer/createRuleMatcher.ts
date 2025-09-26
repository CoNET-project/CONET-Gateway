// createRuleMatcher.ts

/* 固定 bypass 域名（根域与任意层级子域名都直连） */
export const BYPASS_DOMAINS = [
  "localhost",
  ".localhost",
  ".local",
  ".localdomain",
  ".home.arpa",
  "host.docker.internal",
  "gateway.docker.internal",
] as const;

/* 固定 bypass IPv4 段（直连） */
export const BYPASS_IP_CIDRS = [
  "127.0.0.0/8",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "169.254.0.0/16",
  "100.64.0.0/10",
  "224.0.0.0/4",
  "0.0.0.0/8",
  "255.255.255.255/32",
] as const;

export type FilterRule = {
  DOMAIN: string[];
  IP: string[];
};

type CidrTuple = { base: number; maskBits: number };

/** 统一为“以 . 开头的后缀”并去重：["example.com",".foo"] -> [".example.com",".foo"] */
function normalizeSuffixesUnique(list: string[] | undefined): string[] {
  const arr = (list ?? [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (s.startsWith(".") ? s : "." + s));
  return Array.from(new Set(arr));
}

/** "a.b.c.d" -> uint32（0..2^32-1）；非法返回 null */
function ipv4ToInt(ipStr: string): number | null {
  const m = ipStr.match(
    /^(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)$/
  );
  if (!m) return null;
  const a = Number(m[1]),
    b = Number(m[2]),
    c = Number(m[3]),
    d = Number(m[4]);
  return (((a << 24) >>> 0) + (b << 16) + (c << 8) + d) >>> 0;
}

function intToIpv4(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join(
    "."
  );
}

/** 掩码位数 -> 掩码位图（uint32） */
function maskToBits(maskBits: number): number {
  return maskBits === 0 ? 0 : (~((1 << (32 - maskBits)) - 1)) >>> 0;
}

/** 掩码位数 -> 点分掩码 */
function maskBitsToDottedMask(bits: number): string {
  if (bits <= 0) return "0.0.0.0";
  if (bits >= 32) return "255.255.255.255";
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return [
    (mask >>> 24) & 0xff,
    (mask >>> 16) & 0xff,
    (mask >>> 8) & 0xff,
    mask & 0xff,
  ].join(".");
}

/** 解析 "x.y.z.w/n" 或 "x.y.z.w" 为 { base, maskBits }（base 已按掩码归一化）；非法返回 null */
function toCidrTuple(s: string): CidrTuple | null {
  const parts = s.split("/");
  if (parts.length === 1) {
    const ip = ipv4ToInt(parts[0].trim());
    if (ip === null) return null;
    return { base: ip, maskBits: 32 };
  }
  if (parts.length === 2) {
    const ip = ipv4ToInt(parts[0].trim());
    const mask = Number(parts[1]);
    if (ip === null || !Number.isInteger(mask) || mask < 0 || mask > 32) return null;
    const base = (ip & maskToBits(mask)) >>> 0; // 归一化网络地址
    return { base, maskBits: mask };
  }
  return null;
}

/** ip 是否落在 base/mask 中 */
function inCidr(ip: number, base: number, maskBits: number): boolean {
  const mask = maskToBits(maskBits);
  return (ip & mask) === (base & mask);
}

/** host 是否匹配 ".example.com"（含根域名相等） */
function domainMatches(hostLower: string, suffixDotLower: string): boolean {
  const plain = suffixDotLower.slice(1);
  return hostLower === plain || hostLower.endsWith(suffixDotLower);
}

export function createRuleMatcher(rules: FilterRule) {
  /* 原始规则副本（便于导出/调试） */
  const rawRules: FilterRule = {
    DOMAIN: [...(rules?.DOMAIN ?? [])],
    IP: [...(rules?.IP ?? [])],
  };

  /* 编译用户域名/网段 */
  const domainSuffixes = normalizeSuffixesUnique(rawRules.DOMAIN);

  const ipCidrs: CidrTuple[] = (rawRules.IP ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .map(toCidrTuple)
    .filter((x): x is CidrTuple => !!x);

  /* 编译固定 bypass */
  const bypassDomainSuffixes = normalizeSuffixesUnique([...BYPASS_DOMAINS]);
  const bypassIpCidrs: CidrTuple[] = [...BYPASS_IP_CIDRS]
    .map(toCidrTuple)
    .filter((x): x is CidrTuple => !!x);

  function match(host: string): boolean {
    const h = host.trim();
    const ip = ipv4ToInt(h);

    // 0) 固定 bypass 优先：命中则“排除在代理之外”
    if (ip !== null) {
      for (const { base, maskBits } of bypassIpCidrs) {
        if (inCidr(ip, base, maskBits)) return false;
      }
    } else {
      const lh = h.toLowerCase();
      for (const suf of bypassDomainSuffixes) {
        if (domainMatches(lh, suf)) return false;
      }
    }

    // 1) 用户 IP 规则
    if (ip !== null) {
      for (const { base, maskBits } of ipCidrs) {
        if (inCidr(ip, base, maskBits)) return true;
      }
      return false;
    }

    // 2) 用户 DOMAIN 规则
    const lh = h.toLowerCase();
    for (const suf of domainSuffixes) {
      if (domainMatches(lh, suf)) return true;
    }
    return false;
  }

  /**
   * 生成 PAC 文本（bypass → DIRECT, 用户规则 → proxy, 默认 DIRECT）
   * @param proxy 例："PROXY 127.0.0.1:1080; DIRECT"
   * @param opts.embedMeta 是否在 PAC 顶部注释中嵌入 raw/compiled 元数据
   */
  function pac(
    proxy = "SOCKS5 127.0.0.1:3002; SOCKS 127.0.0.1:3002; PROXY 127.0.0.1:3002; DIRECT",
    opts?: { embedMeta?: boolean }
  ): string {

    
    // 直连（bypass）域名条件
    const bypassDomainChecks = bypassDomainSuffixes.map((suf) => {
      const plain = suf.slice(1);
      return `(host === "${plain}" || dnsDomainIs(host, "${suf}"))`;
    });

    // 直连（bypass）IP 条件（网络地址 + 掩码）
    const bypassIpChecks = bypassIpCidrs.map((c) => {
      const net = intToIpv4(c.base & maskToBits(c.maskBits));
      const mask = maskBitsToDottedMask(c.maskBits);
      return `isInNet(host, "${net}", "${mask}")`;
    });

    // 用户域名条件
    const userDomainChecks = domainSuffixes.map((suf) => {
      const plain = suf.slice(1);
      return `(host === "${plain}" || dnsDomainIs(host, "${suf}"))`;
    });

    // 用户 IP 条件（去掉与 bypass 完全相同的条目以免重复）
    const bypassSet = new Set(
      bypassIpCidrs.map(
        (c) => `${intToIpv4(c.base & maskToBits(c.maskBits))}/${c.maskBits}`
      )
    );
    const userIpChecks = ipCidrs
      .filter(
        (c) =>
          !bypassSet.has(
            `${intToIpv4(c.base & maskToBits(c.maskBits))}/${c.maskBits}`
          )
      )
      .map((c) => {
        const net = intToIpv4(c.base & maskToBits(c.maskBits));
        const mask = maskBitsToDottedMask(c.maskBits);
        return `isInNet(host, "${net}", "${mask}")`;
      });

    const meta =
      opts?.embedMeta
        ? `/* createRuleMatcher meta
generatedAt: ${new Date().toISOString()}
rawRules: ${JSON.stringify(rawRules)}
compiled: ${JSON.stringify({
  domainSuffixes,
  ipCidrs: ipCidrs.map((c) => ({
    network: intToIpv4(c.base & maskToBits(c.maskBits)),
    maskBits: c.maskBits,
  })),
  bypassDomainSuffixes,
  bypassIpCidrs: BYPASS_IP_CIDRS,
})}
*/\n`
        : "";

    const pac = `${meta}function FindProxyForURL(url, host) {
  if (!host) return "DIRECT";
  // 仅聚焦 IPv4；IPv6 字面量直接直连
  if (host.indexOf(":") !== -1) return "DIRECT";
  // 标准化域名大小写
  host = host.toLowerCase();

  // 固定 bypass：先直连
  ${bypassDomainChecks.length ? `if (${bypassDomainChecks.join(" ||\n      ")}) return "DIRECT";` : ""}
  ${bypassIpChecks.length ? `if (${bypassIpChecks.join(" ||\n      ")}) return "DIRECT";` : ""}

  // 用户规则：命中则直连；其余全部走代理
  ${userDomainChecks.length ? `if (${userDomainChecks.join(" ||\n      ")}) return "DIRECT";` : ""}
  ${userIpChecks.length ? `if (${userIpChecks.join(" ||\n      ")}) return "DIRECT";` : ""}

  return "${proxy}";
}
`;
    return pac;
  }

  /** 导出原始规则（浅拷贝） */
  function exportRules(): FilterRule {
    return { DOMAIN: [...rawRules.DOMAIN], IP: [...rawRules.IP] };
  }

  /** 导出编译视图，便于核对或日志打印 */
  function compiled() {
    return {
      DOMAIN_SUFFIXES: [...domainSuffixes],
      IP_CIDRS: ipCidrs.map((c) => ({
        network: intToIpv4(c.base & maskToBits(c.maskBits)),
        maskBits: c.maskBits,
      })),
      BYPASS_DOMAINS: [...bypassDomainSuffixes],
      BYPASS_IP_CIDRS: [...BYPASS_IP_CIDRS],
    };
  }

  /** 便捷调试 dump（美化 JSON） */
  function dump(): string {
    return JSON.stringify({ rules: exportRules(), compiled: compiled() }, null, 2);
  }

  return { match, pac, rules, compiled, dump };
}

/* -------------------------------------------
使用示例：

const matcher = createRuleMatcher({
  DOMAIN: ["example.com", ".internal.corp"],
  IP: ["8.8.8.8", "203.0.113.0/24"],
});

// 运行时匹配
matcher.match("api.example.com");   // true
matcher.match("localhost");         // false（bypass）
matcher.match("192.168.1.10");      // false（bypass）
matcher.match("8.8.8.8");           // true

// 生成 PAC（可供 /pac 路由返回）
const pacText = matcher.pac("PROXY 127.0.0.1:1080; DIRECT", { embedMeta: true });

------------------------------------------- */
