import { assertSafeUrl } from "@/lib/rss/ssrf";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 25 * 1024 * 1024; // 25MB safety cap for feeds/audio HEAD checks

/** A remote fetch failed for reasons outside our control (timeout, unreachable, too large). Not a server bug. */
export class ExternalFetchError extends Error {}

/**
 * Fetches a URL while re-validating every hop (including redirects) against the
 * SSRF guard, so an attacker-controlled feed can't redirect us into the internal network.
 */
export async function fetchSafe(rawUrl: string, init?: RequestInit): Promise<Response> {
  let currentUrl = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const safeUrl = await assertSafeUrl(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(safeUrl.toString(), {
        ...init,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "PodcastIntelligenceBot/1.0 (+https://podcast-intelligence.local)",
          ...(init?.headers ?? {}),
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ExternalFetchError("请求超时（15秒），请稍后重试或改用 RSS 订阅地址");
      }
      throw new ExternalFetchError(err instanceof Error ? err.message : "网络请求失败");
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      throw new ExternalFetchError("响应体过大，已拒绝下载");
    }

    return res;
  }
  throw new ExternalFetchError("重定向次数过多");
}
