import { fetchSafe } from "@/lib/rss/fetchSafe";

export class YoutubeChannelResolutionError extends Error {}

export function isYoutubeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\.|^m\./, "");
    return host === "youtube.com" || host === "youtu.be";
  } catch {
    return false;
  }
}

/**
 * Resolves any YouTube channel/handle/video URL to that channel's videos.xml Atom feed —
 * YouTube's own, official per-channel RSS feed (no API key needed, and the resulting URL then
 * flows through the exact same RSS pipeline as any other podcast). A bare channel URL
 * (/channel/UC...) or a channel_id query param resolves without a network call; /@handle,
 * /c/name, /user/name, and video URLs need one page fetch to read the canonical channel id out
 * of the page (YouTube doesn't expose a lookup endpoint for this without an API key).
 */
export async function resolveYoutubeChannelFeedUrl(url: string): Promise<string> {
  const u = new URL(url);

  if (u.pathname === "/feeds/videos.xml" && u.searchParams.get("channel_id")) return url;

  const channelIdParam = u.searchParams.get("channel_id");
  if (channelIdParam) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdParam}`;

  const channelPathMatch = u.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelPathMatch) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelPathMatch[1]}`;

  const res = await fetchSafe(url);
  if (!res.ok) throw new YoutubeChannelResolutionError(`无法访问该 YouTube 链接：HTTP ${res.status}`);
  const html = await res.text();
  // Order matters: a channel page embeds many other channels' ids too (recommended-channels
  // widget, etc.), so a loose `"channelId":"UC..."` scan can match the wrong one. The canonical
  // link tag and videoDetails.externalId both name the page's own channel specifically —
  // prefer those, and only fall back to the loose scan if neither is present.
  const match =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})">/) ||
    html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/) ||
    html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
  if (!match) {
    throw new YoutubeChannelResolutionError(
      "未能识别该 YouTube 链接对应的频道，请直接提供频道链接（如 youtube.com/channel/UC... 或 youtube.com/@handle）"
    );
  }
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${match[1]}`;
}
