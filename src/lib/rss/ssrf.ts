import { promises as dns } from "dns";
import net from "net";

/**
 * Blocks fetches to loopback / private / link-local / metadata-service addresses.
 * We resolve the hostname ourselves (rather than trusting the URL string) so a
 * DNS record pointing at an internal IP can't be used to bypass the hostname check.
 */
export class UnsafeUrlError extends Error {}

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1", "metadata.google.internal"]);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const inRange = (base: string, bits: number) => {
    const baseInt = ipv4ToInt(base);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (baseInt & mask);
  };
  return (
    inRange("10.0.0.0", 8) ||
    inRange("172.16.0.0", 12) ||
    inRange("192.168.0.0", 16) ||
    inRange("127.0.0.0", 8) ||
    inRange("169.254.0.0", 16) || // link-local, incl. cloud metadata endpoint 169.254.169.254
    inRange("0.0.0.0", 8)
  );
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fe80:") || // link-local
    lower.startsWith("fc") ||
    lower.startsWith("fd") // unique local
  );
}

export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("URL 格式不合法");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("仅支持 http/https 协议");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError("不允许访问该地址");
  }

  // If the hostname is already a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (net.isIP(hostname) === 4 ? isPrivateIpv4(hostname) : isPrivateIpv6(hostname)) {
      throw new UnsafeUrlError("不允许访问内网地址");
    }
    return url;
  }

  let addresses: string[];
  try {
    const results = await dns.lookup(hostname, { all: true });
    addresses = results.map((r) => r.address);
  } catch {
    throw new UnsafeUrlError("无法解析该域名");
  }

  for (const addr of addresses) {
    const family = net.isIP(addr);
    if (family === 4 && isPrivateIpv4(addr)) {
      throw new UnsafeUrlError("不允许访问内网地址");
    }
    if (family === 6 && isPrivateIpv6(addr)) {
      throw new UnsafeUrlError("不允许访问内网地址");
    }
  }

  return url;
}
