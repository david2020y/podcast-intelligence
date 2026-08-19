import { z } from "zod";

/**
 * Structured output contract for Claude episode analysis.
 * The model must ground every field in the transcript text — nothing invented.
 * Anything it cannot verify should be omitted rather than guessed.
 */
export const KeyQuoteSchema = z.object({
  quote: z.string().min(1),
  timestampSeconds: z.number().nonnegative().nullable(),
  speaker: z.string().nullable().optional(),
});

export const EntitiesSchema = z.object({
  companies: z.array(z.string()).default([]),
  products: z.array(z.string()).default([]),
  assets: z.array(z.string()).default([]),
});

/**
 * Topic point: one specific discussion point under a branch, grounded to a transcript segment
 * where possible. Distinct from `keyPoints` (a flat highlight-reel) — this is meant to cover
 * the conversation's actual structure and detail, not just the top few takeaways.
 */
export const TopicPointSchema = z.object({
  text: z.string().min(1),
  timestampSeconds: z.number().nonnegative().nullable(),
});

export const TopicBranchSchema = z.object({
  title: z.string().min(1, "分支标题不能为空"),
  summary: z.string().min(1, "分支概述不能为空"),
  points: z.array(TopicPointSchema).min(1).max(10),
});

export const TopicMapSchema = z.object({
  centralTopic: z.string().min(1, "中心主题不能为空"),
  branches: z.array(TopicBranchSchema).min(2, "至少需要 2 个话题分支").max(24),
});

export const EpisodeAnalysisSchema = z.object({
  oneLiner: z.string().min(1, "一句话总结不能为空"),
  summary: z.string().min(1, "3分钟摘要不能为空"),
  topicMap: TopicMapSchema,
  keyPoints: z.array(z.string()).min(1).max(15),
  keyData: z.array(z.string()).default([]),
  guestConclusions: z.array(z.string()).default([]),
  people: z.array(z.string()).default([]),
  entities: EntitiesSchema.default({ companies: [], products: [], assets: [] }),
  tags: z.array(z.string()).min(1).max(12),
  keyQuotes: z.array(KeyQuoteSchema).default([]),
  openQuestions: z.array(z.string()).default([]),
});

export type EpisodeAnalysis = z.infer<typeof EpisodeAnalysisSchema>;
export type KeyQuote = z.infer<typeof KeyQuoteSchema>;
export type Entities = z.infer<typeof EntitiesSchema>;
export type TopicPoint = z.infer<typeof TopicPointSchema>;
export type TopicBranch = z.infer<typeof TopicBranchSchema>;
export type TopicMap = z.infer<typeof TopicMapSchema>;

export const TranscriptSegmentSchema = z.object({
  index: z.number().int().nonnegative(),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().nonnegative(),
  text: z.string(),
});
export type TranscriptSegmentInput = z.infer<typeof TranscriptSegmentSchema>;

export const AddPodcastSchema = z.object({
  rssUrl: z.string().url().optional(),
  episodeUrl: z.string().url().optional(),
  manual: z
    .object({
      title: z.string().min(1),
      author: z.string().optional(),
      description: z.string().optional(),
      websiteUrl: z.string().url().optional(),
      category: z.string().optional(),
      language: z.string().optional(),
      coverUrl: z.string().url().optional(),
    })
    .optional(),
}).refine((v) => v.rssUrl || v.episodeUrl || v.manual, {
  message: "必须提供 RSS 地址、单集链接或手动信息之一",
});

export const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().max(200).optional().default(""),
  showId: z.string().uuid().optional(),
  guest: z.string().optional(),
  tag: z.string().optional(),
  sourcePlatform: z.string().optional(),
  processingStatus: z.string().optional(),
  favoritesOnly: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});
