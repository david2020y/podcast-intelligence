import { describe, expect, it } from "vitest";
import { Transformer } from "markmap-lib";
import { buildMindmapSource, buildMarkmapOutline } from "@/lib/export/mindmap";
import type { TopicMap } from "@/lib/validation/analysis";

describe("buildMindmapSource", () => {
  it("builds a root -> branch -> point mermaid mindmap with three indentation levels", () => {
    const topicMap: TopicMap = {
      centralTopic: "中心话题",
      branches: [
        { title: "分支A", summary: "概述A", points: [{ text: "要点A1", timestampSeconds: 0 }, { text: "要点A2", timestampSeconds: 30 }] },
        { title: "分支B", summary: "概述B", points: [{ text: "要点B1", timestampSeconds: null }] },
      ],
    };
    const source = buildMindmapSource(topicMap);
    const lines = source.split("\n");
    expect(lines[0]).toBe("mindmap");
    expect(lines[1]).toBe("  root((中心话题))");
    expect(lines).toContain("    分支A");
    expect(lines).toContain("      要点A1");
    expect(lines).toContain("      要点A2");
    expect(lines).toContain("    分支B");
    expect(lines).toContain("      要点B1");
  });

  it("strips characters that break mermaid mindmap node syntax", () => {
    const topicMap: TopicMap = {
      centralTopic: "含有(括号)和[方括号]的标题",
      branches: [{ title: "分支", summary: "s", points: [{ text: '包含"引号"和{花括号}', timestampSeconds: null }] }],
    };
    const source = buildMindmapSource(topicMap);
    const lines = source.split("\n");
    // The root line intentionally keeps its own `((...))` shape syntax — only the sanitized
    // inner text should be free of characters that would otherwise break node parsing.
    expect(lines[1]).toBe("  root((含有括号和方括号的标题))");
    const pointLine = lines.find((l) => l.includes("引号"))!;
    expect(pointLine).not.toMatch(/[()[\]{}]/);
    expect(pointLine).toContain("包含'引号'和花括号");
  });

  it("truncates very long node text instead of producing an unreadable diagram", () => {
    const longText = "很长的内容".repeat(30);
    const topicMap: TopicMap = {
      centralTopic: "中心",
      branches: [{ title: "分支", summary: "s", points: [{ text: longText, timestampSeconds: null }] }],
    };
    const source = buildMindmapSource(topicMap);
    const pointLine = source.split("\n").find((l) => l.includes("很长的内容"))!;
    expect(pointLine.length).toBeLessThan(longText.length);
    expect(pointLine).toContain("…");
  });

  it("falls back to a placeholder when text sanitizes to empty", () => {
    const topicMap: TopicMap = {
      centralTopic: "中心",
      branches: [{ title: "分支", summary: "s", points: [{ text: "()[]{}", timestampSeconds: null }] }],
    };
    const source = buildMindmapSource(topicMap);
    expect(source).toContain("（无内容）");
  });
});

describe("buildMarkmapOutline", () => {
  it("builds a markdown outline with the central topic as H1, branches as H2, points as bullets", () => {
    const topicMap: TopicMap = {
      centralTopic: "中心话题",
      branches: [
        { title: "分支A", summary: "概述A", points: [{ text: "要点A1", timestampSeconds: 0 }] },
        { title: "分支B", summary: "概述B", points: [{ text: "要点B1", timestampSeconds: null }] },
      ],
    };
    const outline = buildMarkmapOutline(topicMap);
    expect(outline).toBe("# 中心话题\n## 分支A\n- 要点A1\n## 分支B\n- 要点B1");
  });

  it("escapes CommonMark special characters so they render as literal text, not markdown syntax", () => {
    const topicMap: TopicMap = {
      centralTopic: "中心",
      branches: [{ title: "分支", summary: "s", points: [{ text: "50% * _斜体_ [链接](url) `代码`", timestampSeconds: null }] }],
    };
    const outline = buildMarkmapOutline(topicMap);
    // Feed it through the real markmap parser: this must produce plain text nodes, not
    // emphasis/link/code nodes, proving the escaping actually defeats markdown-it's parser.
    const { root } = new Transformer().transform(outline);
    const pointNode = root.children[0].children[0];
    expect(pointNode.content).not.toContain("<em>");
    expect(pointNode.content).not.toContain("<a ");
    expect(pointNode.content).not.toContain("<code>");
  });

  it("produces a parseable outline that markmap turns into a 3-level tree (root -> branch -> point)", () => {
    const topicMap: TopicMap = {
      centralTopic: "根节点",
      branches: [{ title: "分支节点", summary: "s", points: [{ text: "叶子节点", timestampSeconds: null }] }],
    };
    const { root } = new Transformer().transform(buildMarkmapOutline(topicMap));
    expect(root.children).toHaveLength(1);
    expect(root.children[0].children).toHaveLength(1);
  });
});
