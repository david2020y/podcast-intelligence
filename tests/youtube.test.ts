import { describe, expect, it } from "vitest";
import { isYoutubeUrl, resolveYoutubeChannelFeedUrl } from "@/lib/youtube/channel";
import {
  extractYoutubeVideoId,
  parseCaptionTracksFromWatchHtml,
  parseCaptionTimedText,
  pickCaptionTrack,
} from "@/lib/youtube/captions";

describe("isYoutubeUrl", () => {
  it("accepts youtube.com and youtu.be, with or without www/m prefixes", () => {
    expect(isYoutubeUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(isYoutubeUrl("https://youtube.com/@somechannel")).toBe(true);
    expect(isYoutubeUrl("https://m.youtube.com/watch?v=abc123")).toBe(true);
    expect(isYoutubeUrl("https://youtu.be/abc123")).toBe(true);
  });

  it("rejects everything else, including malformed URLs", () => {
    expect(isYoutubeUrl("https://example.com/feed.xml")).toBe(false);
    expect(isYoutubeUrl("not a url")).toBe(false);
  });
});

describe("resolveYoutubeChannelFeedUrl", () => {
  it("builds the feed URL directly from a /channel/UC... path, without a network call", async () => {
    const url = await resolveYoutubeChannelFeedUrl("https://www.youtube.com/channel/UCabcdefghijklmnopqrstu");
    expect(url).toBe("https://www.youtube.com/feeds/videos.xml?channel_id=UCabcdefghijklmnopqrstu");
  });

  it("builds the feed URL directly from a channel_id query param", async () => {
    const url = await resolveYoutubeChannelFeedUrl("https://www.youtube.com/watch?v=x&channel_id=UCxyz");
    expect(url).toBe("https://www.youtube.com/feeds/videos.xml?channel_id=UCxyz");
  });

  it("passes an already-resolved feed URL straight through", async () => {
    const feedUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=UCabc";
    expect(await resolveYoutubeChannelFeedUrl(feedUrl)).toBe(feedUrl);
  });
});

describe("extractYoutubeVideoId", () => {
  it("reads v= from a standard watch URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("reads the path segment from a youtu.be short link", () => {
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("reads a /shorts/ URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for a URL with no identifiable video id", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/@somechannel")).toBeNull();
    expect(extractYoutubeVideoId("not a url")).toBeNull();
  });
});

describe("parseCaptionTracksFromWatchHtml", () => {
  it("extracts caption tracks embedded in the watch page's captions blob", () => {
    const html = `<script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"https://example.com/caps?a=1","languageCode":"en","kind":"asr"},{"baseUrl":"https://example.com/caps?a=2","languageCode":"zh-Hans"}]}},"videoDetails":{"videoId":"abc"}};</script>`;
    const tracks = parseCaptionTracksFromWatchHtml(html);
    expect(tracks).toHaveLength(2);
    expect(tracks[0].languageCode).toBe("en");
    expect(tracks[1].languageCode).toBe("zh-Hans");
  });

  it("returns an empty array when the page has no captions blob at all", () => {
    expect(parseCaptionTracksFromWatchHtml("<html>no player response here</html>")).toEqual([]);
  });

  it("returns an empty array rather than throwing on malformed embedded JSON", () => {
    const html = `"captions":{not valid json,"videoDetails":{}`;
    expect(parseCaptionTracksFromWatchHtml(html)).toEqual([]);
  });
});

describe("pickCaptionTrack", () => {
  it("prefers a Chinese track over English or others", () => {
    const tracks = [{ baseUrl: "a", languageCode: "en" }, { baseUrl: "b", languageCode: "zh-Hans" }, { baseUrl: "c", languageCode: "ja" }];
    expect(pickCaptionTrack(tracks)?.languageCode).toBe("zh-Hans");
  });

  it("falls back to English when there's no Chinese track", () => {
    const tracks = [{ baseUrl: "a", languageCode: "ja" }, { baseUrl: "b", languageCode: "en" }];
    expect(pickCaptionTrack(tracks)?.languageCode).toBe("en");
  });

  it("falls back to the first track when neither zh nor en is present", () => {
    const tracks = [{ baseUrl: "a", languageCode: "ja" }, { baseUrl: "b", languageCode: "fr" }];
    expect(pickCaptionTrack(tracks)?.languageCode).toBe("ja");
  });

  it("returns null for an empty list", () => {
    expect(pickCaptionTrack([])).toBeNull();
  });
});

describe("parseCaptionTimedText", () => {
  it("parses timed text entries into segments with decoded entities", () => {
    const xml = `<transcript><text start="0.5" dur="2.3">Hello &amp; welcome</text><text start="2.8" dur="1.5">Second line</text></transcript>`;
    const segments = parseCaptionTimedText(xml);
    expect(segments).toEqual([
      { index: 0, startSeconds: 0.5, endSeconds: 2.8, text: "Hello & welcome" },
      { index: 1, startSeconds: 2.8, endSeconds: 4.3, text: "Second line" },
    ]);
  });

  it("skips entries that end up empty after stripping tags/entities", () => {
    const xml = `<transcript><text start="0" dur="1"></text><text start="1" dur="1">real text</text></transcript>`;
    const segments = parseCaptionTimedText(xml);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("real text");
  });

  it("returns an empty array for XML with no text entries", () => {
    expect(parseCaptionTimedText("<transcript></transcript>")).toEqual([]);
  });
});
