import { describe, expect, it } from "vitest";
import { EpisodeAnalysisSchema, AddPodcastSchema, SearchQuerySchema } from "@/lib/validation/analysis";

describe("EpisodeAnalysisSchema", () => {
  const base = {
    oneLiner: "一句话总结",
    summary: "摘要内容",
    topicMap: {
      centralTopic: "中心话题",
      branches: [
        { title: "分支一", summary: "概述一", points: [{ text: "要点一", timestampSeconds: null }] },
        { title: "分支二", summary: "概述二", points: [{ text: "要点二", timestampSeconds: 12 }] },
      ],
    },
    keyPoints: ["观点一"],
    tags: ["标签一"],
  };

  it("accepts a minimal valid payload and fills defaults", () => {
    const result = EpisodeAnalysisSchema.parse(base);
    expect(result.keyData).toEqual([]);
    expect(result.entities).toEqual({ companies: [], products: [], assets: [] });
    expect(result.keyQuotes).toEqual([]);
  });

  it("rejects a payload missing required fields", () => {
    const result = EpisodeAnalysisSchema.safeParse({ oneLiner: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects a topicMap with fewer than 2 branches", () => {
    const result = EpisodeAnalysisSchema.safeParse({
      ...base,
      topicMap: { centralTopic: "中心", branches: [{ title: "只有一个", summary: "s", points: [{ text: "x", timestampSeconds: null }] }] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a topicMap branch with no points", () => {
    const result = EpisodeAnalysisSchema.safeParse({
      ...base,
      topicMap: {
        centralTopic: "中心",
        branches: [
          { title: "分支一", summary: "s", points: [] },
          { title: "分支二", summary: "s", points: [{ text: "x", timestampSeconds: null }] },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty keyPoints (must extract at least one)", () => {
    const result = EpisodeAnalysisSchema.safeParse({ ...base, keyPoints: [] });
    expect(result.success).toBe(false);
  });

  it("allows null timestampSeconds on key quotes (must not fabricate a time)", () => {
    const result = EpisodeAnalysisSchema.safeParse({
      ...base,
      keyQuotes: [{ quote: "原文", timestampSeconds: null }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a fabricated non-numeric timestamp", () => {
    const result = EpisodeAnalysisSchema.safeParse({
      ...base,
      keyQuotes: [{ quote: "原文", timestampSeconds: "大概5分钟" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("AddPodcastSchema", () => {
  it("requires at least one of rssUrl / episodeUrl / manual", () => {
    expect(AddPodcastSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a valid rssUrl", () => {
    expect(AddPodcastSchema.safeParse({ rssUrl: "https://example.com/feed.xml" }).success).toBe(true);
  });

  it("rejects an invalid rssUrl", () => {
    expect(AddPodcastSchema.safeParse({ rssUrl: "not-a-url" }).success).toBe(false);
  });

  it("accepts manual info", () => {
    expect(AddPodcastSchema.safeParse({ manual: { title: "手动播客" } }).success).toBe(true);
  });
});

describe("SearchQuerySchema", () => {
  it("applies defaults for an empty query", () => {
    const result = SearchQuerySchema.parse({});
    expect(result.q).toBe("");
    expect(result.limit).toBe(30);
  });

  it("coerces favoritesOnly from a query string", () => {
    const result = SearchQuerySchema.parse({ favoritesOnly: "true" });
    expect(result.favoritesOnly).toBe(true);
  });
});
