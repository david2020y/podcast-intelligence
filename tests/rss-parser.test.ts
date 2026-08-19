import { describe, expect, it } from "vitest";
import { parseFeedXml } from "@/lib/rss/parser";

const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>测试播客</title>
    <description>一个用于测试的播客，包含 &lt;em&gt;markup&lt;/em&gt; 的 &lt;b&gt;简介&lt;/b&gt;</description>
    <link>https://example.com</link>
    <language>zh-CN</language>
    <itunes:author>测试主持人</itunes:author>
    <itunes:image href="https://example.com/cover.jpg" />
    <item>
      <title>EP01：开篇 ft. 张三 / 李四</title>
      <description>第一期节目简介</description>
      <guid>ep-001</guid>
      <pubDate>Mon, 01 Jan 2024 08:00:00 GMT</pubDate>
      <itunes:duration>01:02:03</itunes:duration>
      <enclosure url="https://example.com/audio/ep1.mp3" type="audio/mpeg" length="123456" />
      <link>https://example.com/ep1</link>
    </item>
    <item>
      <title>EP02：第二期</title>
      <description>第二期节目简介</description>
      <guid>ep-002</guid>
      <pubDate>Mon, 08 Jan 2024 08:00:00 GMT</pubDate>
      <itunes:duration>1800</itunes:duration>
      <enclosure url="https://example.com/audio/ep2.mp3" type="audio/mpeg" length="123456" />
    </item>
  </channel>
</rss>`;

describe("parseFeedXml", () => {
  it("parses show-level metadata", async () => {
    const feed = await parseFeedXml(SAMPLE_FEED);
    expect(feed.title).toBe("测试播客");
    expect(feed.description).toBe("一个用于测试的播客，包含 markup 的 简介");
    expect(feed.author).toBe("测试主持人");
    expect(feed.language).toBe("zh-CN");
    expect(feed.episodes).toHaveLength(2);
  });

  it("parses episode fields including duration and guid", async () => {
    const feed = await parseFeedXml(SAMPLE_FEED);
    const ep1 = feed.episodes.find((e) => e.guid === "ep-001")!;
    expect(ep1.title).toContain("EP01");
    expect(ep1.durationSeconds).toBe(3723); // 01:02:03
    expect(ep1.audioUrl).toBe("https://example.com/audio/ep1.mp3");
  });

  it("parses a plain-seconds itunes:duration", async () => {
    const feed = await parseFeedXml(SAMPLE_FEED);
    const ep2 = feed.episodes.find((e) => e.guid === "ep-002")!;
    expect(ep2.durationSeconds).toBe(1800);
  });

  it("extracts guests from a 'ft.' title convention", async () => {
    const feed = await parseFeedXml(SAMPLE_FEED);
    const ep1 = feed.episodes.find((e) => e.guid === "ep-001")!;
    expect(ep1.guests).toEqual(["张三", "李四"]);
  });

  it("defaults to an empty guest list when there is no convention match", async () => {
    const feed = await parseFeedXml(SAMPLE_FEED);
    const ep2 = feed.episodes.find((e) => e.guid === "ep-002")!;
    expect(ep2.guests).toEqual([]);
  });
});
