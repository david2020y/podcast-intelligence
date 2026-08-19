import type { PodcastEpisode, EpisodeAnalysisRecord, PodcastShow, CollectionItem } from "@/lib/types";
import { buildMindmapSource } from "@/lib/export/mindmap";

function formatSeconds(sec: number | null): string {
  if (sec === null || Number.isNaN(sec)) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "未知";
  return new Date(iso).toISOString().slice(0, 10);
}

/** The analysis-only portion shared by the full episode export and the standalone "copy" button. */
export function buildAnalysisMarkdown(analysis: EpisodeAnalysisRecord | null): string {
  const lines: string[] = [];

  if (!analysis) {
    lines.push("_本集尚未完成 AI 分析。_");
    return lines.join("\n");
  }

  lines.push("## 一句话总结");
  lines.push("");
  lines.push(analysis.oneLiner);
  lines.push("");

  lines.push("## 摘要");
  lines.push("");
  lines.push(analysis.summary);
  lines.push("");

  if (analysis.topicMap) {
    lines.push("## 内容框架");
    lines.push("");
    lines.push("```mermaid");
    lines.push(buildMindmapSource(analysis.topicMap));
    lines.push("```");
    lines.push("");
    for (const branch of analysis.topicMap.branches) {
      lines.push(`### ${branch.title}`);
      lines.push("");
      lines.push(branch.summary);
      lines.push("");
      for (const point of branch.points) {
        const ts = point.timestampSeconds !== null ? ` \`[${formatSeconds(point.timestampSeconds)}]\`` : "";
        lines.push(`- ${point.text}${ts}`);
      }
      lines.push("");
    }
  }

  if (analysis.keyPoints.length > 0) {
    lines.push("## 核心观点");
    lines.push("");
    for (const p of analysis.keyPoints) lines.push(`- ${p}`);
    lines.push("");
  }

  if (analysis.keyData.length > 0) {
    lines.push("## 重要数据");
    lines.push("");
    for (const d of analysis.keyData) lines.push(`- ${d}`);
    lines.push("");
  }

  if (analysis.guestConclusions.length > 0) {
    lines.push("## 嘉宾结论");
    lines.push("");
    for (const c of analysis.guestConclusions) lines.push(`- ${c}`);
    lines.push("");
  }

  const { people, entities } = analysis;
  if (people.length > 0 || entities.companies.length > 0 || entities.products.length > 0 || entities.assets.length > 0) {
    lines.push("## 人物 / 公司 / 产品 / 资产");
    lines.push("");
    if (people.length > 0) lines.push(`- 人物：${people.join("、")}`);
    if (entities.companies.length > 0) lines.push(`- 公司：${entities.companies.join("、")}`);
    if (entities.products.length > 0) lines.push(`- 产品：${entities.products.join("、")}`);
    if (entities.assets.length > 0) lines.push(`- 资产：${entities.assets.join("、")}`);
    lines.push("");
  }

  if (analysis.keyQuotes.length > 0) {
    lines.push("## 关键原文");
    lines.push("");
    for (const q of analysis.keyQuotes) {
      const ts = q.timestampSeconds !== null ? ` \`[${formatSeconds(q.timestampSeconds)}]\`` : "";
      const speaker = q.speaker ? `**${q.speaker}**：` : "";
      lines.push(`> ${speaker}${q.quote}${ts}`);
      lines.push("");
    }
  }

  if (analysis.tags.length > 0) {
    lines.push("## 标签");
    lines.push("");
    lines.push(analysis.tags.map((t) => `\`${t}\``).join(" "));
    lines.push("");
  }

  if (analysis.openQuestions.length > 0) {
    lines.push("## 值得进一步研究的问题");
    lines.push("");
    for (const q of analysis.openQuestions) lines.push(`- ${q}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function buildEpisodeMarkdown(
  episode: PodcastEpisode,
  show: Pick<PodcastShow, "title" | "author"> | null,
  analysis: EpisodeAnalysisRecord | null,
  userNotes: string[] = []
): string {
  const lines: string[] = [];
  lines.push(`# ${episode.title}`);
  lines.push("");
  lines.push(`- 播客：${show?.title ?? episode.show?.title ?? "未知"}`);
  if (show?.author || episode.show?.author) lines.push(`- 主持人/作者：${show?.author ?? episode.show?.author}`);
  if (episode.guests.length > 0) lines.push(`- 嘉宾：${episode.guests.join("、")}`);
  lines.push(`- 发布时间：${formatDate(episode.publishedAt)}`);
  if (episode.durationSeconds) lines.push(`- 时长：${formatSeconds(episode.durationSeconds)}`);
  if (episode.episodeUrl) lines.push(`- 原始节目链接：${episode.episodeUrl}`);
  lines.push("");

  lines.push(buildAnalysisMarkdown(analysis));
  lines.push("");

  if (userNotes.length > 0) {
    lines.push("## 我的备注");
    lines.push("");
    for (const n of userNotes) lines.push(`- ${n}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(`_由播客情报库导出 · ${new Date().toISOString().slice(0, 10)}_`);

  return lines.join("\n");
}

export function slugifyFilename(title: string): string {
  return (
    title
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .slice(0, 80) || "episode"
  );
}

export function buildCollectionMarkdown(
  collectionName: string,
  items: Array<{ item: CollectionItem; episode: PodcastEpisode; analysis: EpisodeAnalysisRecord | null }>
): string {
  const lines: string[] = [`# 专题：${collectionName}`, ""];
  for (const { item, episode, analysis } of items) {
    lines.push(`## ${episode.title}`);
    lines.push("");
    if (analysis) lines.push(analysis.oneLiner);
    if (item.note) lines.push(`\n> 备注：${item.note}`);
    if (episode.episodeUrl) lines.push(`\n[原始节目链接](${episode.episodeUrl})`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}
