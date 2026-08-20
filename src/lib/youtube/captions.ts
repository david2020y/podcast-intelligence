import { fetchSafe } from "@/lib/rss/fetchSafe";
import type { TranscriptSegmentInput } from "@/lib/validation/analysis";

export class YoutubeCaptionsError extends Error {}

interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
}

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") === "youtu.be") return u.pathname.slice(1) || null;
    const v = u.searchParams.get("v");
    if (v) return v;
    const shortsMatch = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    return shortsMatch ? shortsMatch[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extracts the caption track list embedded in a YouTube watch page's ytInitialPlayerResponse
 * blob. This is unofficial/undocumented (the same technique used by common open-source YouTube
 * transcript tools, not a public API) — if YouTube changes this structure, it degrades to "no
 * captions found" (empty array) rather than throwing.
 */
export function parseCaptionTracksFromWatchHtml(html: string): CaptionTrack[] {
  const marker = '"captions":';
  const idx = html.indexOf(marker);
  if (idx === -1) return [];
  const after = html.slice(idx + marker.length);
  const endIdx = after.indexOf(',"videoDetails');
  const jsonSlice = endIdx === -1 ? after : after.slice(0, endIdx);
  try {
    const parsed = JSON.parse(jsonSlice) as {
      playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
    };
    return parsed.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  } catch {
    return [];
  }
}

/** Prefers a Chinese or English track (manual or auto-generated, doesn't matter — we take
 * whatever's available since quality isn't ours to control here), falling back to whichever
 * track YouTube listed first. */
export function pickCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (tracks.length === 0) return null;
  const byLang = (prefix: string) => tracks.find((t) => t.languageCode?.startsWith(prefix));
  return byLang("zh") ?? byLang("en") ?? tracks[0];
}

function decodeCaptionText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function parseCaptionTimedText(xml: string): TranscriptSegmentInput[] {
  const segments: TranscriptSegmentInput[] = [];
  const re = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(xml)) !== null) {
    const start = Number(match[1]);
    const dur = Number(match[2]);
    const text = decodeCaptionText(match[3]);
    if (!text) continue;
    segments.push({ index: index++, startSeconds: start, endSeconds: start + dur, text });
  }
  return segments;
}

export async function fetchYoutubeCaptions(
  videoId: string
): Promise<{ fullText: string; segments: TranscriptSegmentInput[]; language: string | null }> {
  const watchRes = await fetchSafe(`https://www.youtube.com/watch?v=${videoId}`);
  if (!watchRes.ok) throw new YoutubeCaptionsError(`无法访问该 YouTube 视频页面：HTTP ${watchRes.status}`);
  const html = await watchRes.text();
  const track = pickCaptionTrack(parseCaptionTracksFromWatchHtml(html));
  if (!track) throw new YoutubeCaptionsError("该 YouTube 视频没有可用字幕，无法转录");

  const captionsRes = await fetchSafe(track.baseUrl);
  if (!captionsRes.ok) throw new YoutubeCaptionsError(`获取字幕失败：HTTP ${captionsRes.status}`);
  const xml = await captionsRes.text();
  const segments = parseCaptionTimedText(xml);
  if (segments.length === 0) throw new YoutubeCaptionsError("该 YouTube 视频的字幕内容为空");

  return { fullText: segments.map((s) => s.text).join(" "), segments, language: track.languageCode ?? null };
}
