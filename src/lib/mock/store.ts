import { randomUUID } from "crypto";
import {
  MOCK_SHOWS,
  MOCK_EPISODES,
  MOCK_TRANSCRIPTS,
  MOCK_ANALYSES,
  MOCK_COLLECTIONS,
  MOCK_COLLECTION_ITEMS,
} from "@/lib/mock/data";
import type {
  PodcastShow,
  PodcastEpisode,
  EpisodeTranscript,
  EpisodeAnalysisRecord,
  Collection,
  CollectionItem,
  SyncJob,
  ProcessingJob,
} from "@/lib/types";

/**
 * Process-local mutable store backing Mock Mode. Resets on server restart —
 * that's fine, it exists to make the app fully click-through-able without
 * external services, not to persist real data.
 */
interface MockState {
  shows: PodcastShow[];
  episodes: PodcastEpisode[];
  transcripts: Record<string, EpisodeTranscript>; // by episodeId
  analyses: Record<string, EpisodeAnalysisRecord>; // by episodeId
  collections: Collection[];
  collectionItems: CollectionItem[];
  favorites: Set<string>; // episodeId
  syncJobs: SyncJob[];
  processingJobs: ProcessingJob[];
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function initState(): MockState {
  const favorites = new Set<string>();
  for (const ep of MOCK_EPISODES) if (ep.isFavorited) favorites.add(ep.id);
  return {
    shows: clone(MOCK_SHOWS),
    episodes: clone(MOCK_EPISODES),
    transcripts: clone(MOCK_TRANSCRIPTS),
    analyses: clone(MOCK_ANALYSES),
    collections: clone(MOCK_COLLECTIONS),
    collectionItems: clone(MOCK_COLLECTION_ITEMS),
    favorites,
    syncJobs: [],
    processingJobs: [],
  };
}

// Survive Next.js dev server HMR by stashing the singleton on globalThis.
const g = globalThis as unknown as { __mockStore?: MockState };
export const mockStore: MockState = g.__mockStore ?? (g.__mockStore = initState());

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function findShow(id: string): PodcastShow | undefined {
  return mockStore.shows.find((s) => s.id === id);
}

export function findEpisode(id: string): PodcastEpisode | undefined {
  return mockStore.episodes.find((e) => e.id === id);
}

export function attachEpisodeExtras(ep: PodcastEpisode): PodcastEpisode {
  const show = findShow(ep.showId);
  return {
    ...ep,
    show: show
      ? { id: show.id, title: show.title, coverUrl: show.coverUrl, author: show.author, sourcePlatform: show.sourcePlatform }
      : undefined,
    isFavorited: mockStore.favorites.has(ep.id),
  };
}
