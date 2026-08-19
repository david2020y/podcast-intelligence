import type { EpisodeAnalysis, TopicMap } from "@/lib/validation/analysis";

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";
export type SourcePlatform = "rss" | "apple_podcasts" | "spotify" | "xiaoyuzhou" | "youtube" | "manual";
export type SubscriptionStatus = "active" | "paused";
export type SyncJobStatus = "pending" | "running" | "completed" | "failed";
export type ProcessingJobType = "transcribe" | "analyze";

export interface PodcastShow {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  author: string | null;
  rssUrl: string | null;
  websiteUrl: string | null;
  category: string | null;
  language: string | null;
  sourcePlatform: SourcePlatform;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Who added this show, and whether an admin has published it into the shared marketplace —
  // a user's own RSS additions stay private to them until curated in. Null addedByUserId means
  // it predates this field (seeded/system catalog).
  addedByUserId: string | null;
  inMarketplace: boolean;
  marketplaceCategory: string | null;
  // joined / derived
  subscriptionStatus?: SubscriptionStatus | null;
  episodeCount?: number;
}

export interface PodcastEpisode {
  id: string;
  showId: string;
  guid: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  audioUrl: string | null;
  episodeUrl: string | null;
  coverUrl: string | null;
  guests: string[];
  processingStatus: ProcessingStatus;
  transcriptStatus: ProcessingStatus;
  analysisStatus: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
  // joined
  show?: Pick<PodcastShow, "id" | "title" | "coverUrl" | "author" | "sourcePlatform">;
  isFavorited?: boolean;
  tags?: string[];
}

export interface TranscriptSegment {
  id: string;
  transcriptId: string;
  segmentIndex: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface EpisodeTranscript {
  id: string;
  episodeId: string;
  fullText: string;
  language: string | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
  segments?: TranscriptSegment[];
}

export interface EpisodeAnalysisRecord extends Omit<EpisodeAnalysis, "topicMap"> {
  id: string;
  episodeId: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  // Nullable at the record level (not in the fresh-AI-output contract): analyses saved before
  // this field existed have no topic map on file until the episode is re-analyzed.
  topicMap: TopicMap | null;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  episodeId: string;
  note: string | null;
  createdAt: string;
  episode?: PodcastEpisode;
}

export interface SyncJob {
  id: string;
  showId: string | null;
  status: SyncJobStatus;
  startedAt: string;
  finishedAt: string | null;
  addedCount: number;
  updatedCount: number;
  failedCount: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  episodeId: string;
  jobType: ProcessingJobType;
  status: ProcessingStatus;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  subscribedShowCount: number;
  totalEpisodeCount: number;
  newEpisodesThisWeek: number;
  pendingTranscriptionCount: number;
  completedAnalysisCount: number;
  recentlyUpdatedShows: PodcastShow[];
  recentAnalyses: PodcastEpisode[];
}

export interface SearchResultItem {
  episode: PodcastEpisode;
  rank: number;
  matchedIn: string[];
  snippet?: string;
}

export interface AppMode {
  mockMode: boolean;
  hasSupabase: boolean;
  hasAnthropicKey: boolean;
  aiProvider: "anthropic" | "deepseek" | null;
  hasTranscriptionKey: boolean;
  transcriptionProvider: "assemblyai" | "groq" | "openai" | null;
}
