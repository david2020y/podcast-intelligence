import type { TopicMap } from "@/lib/validation/analysis";

const MAX_NODE_CHARS = 60;

/**
 * Mermaid mindmap node text can't contain its own delimiter characters, and very long labels
 * make the diagram unreadable — truncate rather than let Mermaid choke on malformed syntax.
 */
function sanitizeNodeText(text: string): string {
  const cleaned = text
    .replace(/[\r\n]+/g, " ")
    .replace(/[()[\]{}]/g, "")
    .replace(/"/g, "'")
    .trim();
  const truncated = cleaned.length > MAX_NODE_CHARS ? `${cleaned.slice(0, MAX_NODE_CHARS)}…` : cleaned;
  return truncated || "（无内容）";
}

/** Builds Mermaid `mindmap` diagram source from a TopicMap. Two levels deep: branch -> point. */
export function buildMindmapSource(topicMap: TopicMap): string {
  const lines = ["mindmap", `  root((${sanitizeNodeText(topicMap.centralTopic)}))`];

  for (const branch of topicMap.branches) {
    lines.push(`    ${sanitizeNodeText(branch.title)}`);
    for (const point of branch.points) {
      lines.push(`      ${sanitizeNodeText(point.text)}`);
    }
  }

  return lines.join("\n");
}

/**
 * markmap (the in-app interactive mind map) parses a Markdown outline, not the Mermaid syntax
 * above — separate builder because the escaping rules differ (CommonMark special characters,
 * not Mermaid's). Headings become collapsible branch nodes; markmap folds anything past the
 * configured initial depth, which is what actually fixes a dense topic map being unreadable
 * (Mermaid's mindmap has no fold/collapse — it always renders every node at once).
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/([\\`*_{}[\]()#+!|])/g, "\\$1")
    .trim();
}

export function buildMarkmapOutline(topicMap: TopicMap): string {
  const lines = [`# ${escapeMarkdown(topicMap.centralTopic) || "（无内容）"}`];
  for (const branch of topicMap.branches) {
    lines.push(`## ${escapeMarkdown(branch.title) || "（无内容）"}`);
    for (const point of branch.points) {
      lines.push(`- ${escapeMarkdown(point.text) || "（无内容）"}`);
    }
  }
  return lines.join("\n");
}
