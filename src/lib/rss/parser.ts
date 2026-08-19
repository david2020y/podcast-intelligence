import Parser from "rss-parser";
import { fetchSafe, ExternalFetchError } from "@/lib/rss/fetchSafe";

export interface ParsedFeedEpisode {
  guid: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  audioUrl: string | null;
  episodeUrl: string | null;
  coverUrl: string | null;
  guests: string[];
}

export interface ParsedFeed {
  title: string;
  description: string | null;
  coverUrl: string | null;
  author: string | null;
  websiteUrl: string | null;
  language: string | null;
  category: string | null;
  episodes: ParsedFeedEpisode[];
}

type CustomItem = {
  itunes?: { duration?: string; author?: string; image?: string; episode?: string; season?: string };
  "podcast:person"?: unknown;
  contentSnippet?: string;
  content?: string;
  enclosure?: { url?: string; length?: string; type?: string };
};

type CustomFeed = {
  itunes?: { author?: string; image?: string; owner?: { name?: string } };
  language?: string;
  image?: { url?: string };
};

// rss-parser's .d.ts types `customFields.feed` as `Array<keyof T>` only, but the runtime
// (utils.copyFromXML) supports the same [xmlTag, mappedName] tuple form used for items —
// cast to bypass that overly narrow type.
const parser: Parser<CustomFeed, CustomItem> = new Parser({
  customFields: {
    feed: [["itunes:author", "itunes.author"], ["itunes:image", "itunes.image"], "language"],
    item: [
      ["itunes:duration", "itunes.duration"],
      ["itunes:author", "itunes.author"],
      ["itunes:image", "itunes.image"],
      ["itunes:episode", "itunes.episode"],
    ],
  } as unknown as Parser.CustomFields<CustomFeed, CustomItem>,
});

function parseDurationToSeconds(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

/**
 * Feed-level description (unlike rss-parser's per-item contentSnippet) is not HTML-stripped
 * upstream, and podcast owners routinely embed markup there — strip it for plain-text display.
 */
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractGuestsFromTitle(title: string): string[] {
  // Common convention: "EP42：标题 ft. 嘉宾A / 嘉宾B" or "(with 嘉宾)"
  const match = title.match(/(?:ft\.|feat\.|with)\s*([^)（]+)/i);
  if (!match) return [];
  return match[1]
    .split(/[,、/&]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function fetchAndParseFeed(rssUrl: string): Promise<ParsedFeed> {
  const res = await fetchSafe(rssUrl);
  if (!res.ok) {
    throw new ExternalFetchError(`获取 RSS 失败：HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseFeedXml(xml);
}

/** Pure XML -> ParsedFeed transform, split out from fetchAndParseFeed so it's unit-testable without network access. */
export async function parseFeedXml(xml: string): Promise<ParsedFeed> {
  const feed = await parser.parseString(xml);

  const episodes: ParsedFeedEpisode[] = (feed.items ?? []).map((item) => {
    const guid = item.guid || item.link || item.title || crypto.randomUUID();
    const description = item.contentSnippet || item.content || item.summary || null;
    return {
      guid: String(guid),
      title: item.title?.trim() || "未命名节目",
      description: description ? stripHtml(String(description)) || null : null,
      publishedAt: item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : null),
      durationSeconds: parseDurationToSeconds(item.itunes?.duration),
      audioUrl: item.enclosure?.url || null,
      episodeUrl: item.link || null,
      coverUrl: item.itunes?.image || null,
      guests: extractGuestsFromTitle(item.title || ""),
    };
  });

  return {
    title: feed.title?.trim() || "未命名播客",
    description: feed.description ? stripHtml(feed.description) || null : null,
    coverUrl: feed.image?.url || feed.itunes?.image || null,
    author: feed.itunes?.author || feed.itunes?.owner?.name || null,
    websiteUrl: feed.link || null,
    language: feed.language || null,
    category: (feed as unknown as { categories?: string[] }).categories?.[0] || null,
    episodes,
  };
}
