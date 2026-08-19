import { describe, expect, it } from "vitest";
import { buildEpisodeMarkdown, slugifyFilename } from "@/lib/export/markdown";
import type { PodcastEpisode, EpisodeAnalysisRecord } from "@/lib/types";

const episode: PodcastEpisode = {
  id: "ep-1",
  showId: "show-1",
  guid: "guid-1",
  title: "EP01：测试单集",
  description: "单集简介",
  publishedAt: "2024-01-01T00:00:00.000Z",
  durationSeconds: 3723,
  audioUrl: "https://example.com/audio.mp3",
  episodeUrl: "https://example.com/ep1",
  coverUrl: null,
  guests: ["张三"],
  processingStatus: "completed",
  transcriptStatus: "completed",
  analysisStatus: "completed",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  show: { id: "show-1", title: "测试播客", coverUrl: null, author: "主持人", sourcePlatform: "rss" },
};

const analysis: EpisodeAnalysisRecord = {
  id: "analysis-1",
  episodeId: "ep-1",
  model: "claude-sonnet-4-5",
  oneLiner: "一句话总结",
  summary: "摘要正文",
  topicMap: {
    centralTopic: "测试节目中心议题",
    branches: [
      {
        title: "分支一",
        summary: "分支一概述",
        points: [{ text: "分支一要点", timestampSeconds: 30 }],
      },
      {
        title: "分支二",
        summary: "分支二概述",
        points: [{ text: "分支二要点", timestampSeconds: null }],
      },
    ],
  },
  keyPoints: ["观点一", "观点二"],
  keyData: ["数据一"],
  guestConclusions: ["结论一"],
  people: ["张三"],
  entities: { companies: ["公司A"], products: ["产品A"], assets: ["BTC"] },
  tags: ["标签一"],
  keyQuotes: [{ quote: "原文摘录", timestampSeconds: 65, speaker: "张三" }],
  openQuestions: ["待研究问题一"],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("buildEpisodeMarkdown", () => {
  it("includes episode metadata and analysis sections", () => {
    const md = buildEpisodeMarkdown(episode, episode.show ?? null, analysis);
    expect(md).toContain("# EP01：测试单集");
    expect(md).toContain("测试播客");
    expect(md).toContain("张三");
    expect(md).toContain("一句话总结");
    expect(md).toContain("摘要正文");
    expect(md).toContain("- 观点一");
    expect(md).toContain("公司A");
    expect(md).toContain("BTC");
    expect(md).toContain("原文摘录");
    expect(md).toContain("[1:05]"); // 65 seconds -> 1:05
    expect(md).toContain("https://example.com/ep1");
    expect(md).toContain("## 内容框架");
    expect(md).toContain("```mermaid");
    expect(md).toContain("mindmap");
    expect(md).toContain("### 分支一");
    expect(md).toContain("分支一要点");
    expect(md).toContain("[0:30]");
  });

  it("handles a missing analysis gracefully instead of throwing", () => {
    const md = buildEpisodeMarkdown(episode, episode.show ?? null, null);
    expect(md).toContain("尚未完成 AI 分析");
  });

  it("includes user notes when provided", () => {
    const md = buildEpisodeMarkdown(episode, episode.show ?? null, analysis, ["我的备注一"]);
    expect(md).toContain("我的备注一");
  });
});

describe("slugifyFilename", () => {
  it("strips filesystem-unsafe characters", () => {
    expect(slugifyFilename('EP01: "测试"/单集?')).not.toMatch(/[\\/:*?"<>|]/);
  });

  it("falls back to a default name for empty input", () => {
    expect(slugifyFilename("   ")).toBe("episode");
  });
});
