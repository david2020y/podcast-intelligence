import { getAppMode } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore, attachEpisodeExtras } from "@/lib/mock/store";
import type { PodcastEpisode, SearchResultItem, SourcePlatform } from "@/lib/types";
import type { SearchQuerySchema } from "@/lib/validation/analysis";
import type { z } from "zod";

export type SearchFilters = z.infer<typeof SearchQuerySchema>;

interface SearchMatchRow {
  episode_id: string;
  rank: number;
  matched_in: string[];
}

function passesFilters(ep: PodcastEpisode, filters: SearchFilters): boolean {
  if (filters.showId && ep.showId !== filters.showId) return false;
  if (filters.guest && !ep.guests.some((g) => g.includes(filters.guest!))) return false;
  if (filters.tag && !(ep.tags ?? []).includes(filters.tag)) return false;
  if (filters.sourcePlatform && ep.show?.sourcePlatform !== filters.sourcePlatform) return false;
  if (filters.processingStatus && ep.processingStatus !== filters.processingStatus) return false;
  if (filters.favoritesOnly && !ep.isFavorited) return false;
  if (filters.dateFrom && ep.publishedAt && ep.publishedAt < filters.dateFrom) return false;
  if (filters.dateTo && ep.publishedAt && ep.publishedAt > filters.dateTo) return false;
  return true;
}

function makeSnippet(text: string, query: string, radius = 60): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export async function searchEpisodes(userId: string, filters: SearchFilters): Promise<SearchResultItem[]> {
  const { mockMode } = getAppMode();
  const query = filters.q?.trim() ?? "";

  if (mockMode) {
    const results: SearchResultItem[] = [];
    for (const epRaw of mockStore.episodes) {
      const ep = attachEpisodeExtras(epRaw);
      if (!passesFilters(ep, filters)) continue;

      if (!query) {
        results.push({ episode: ep, rank: 0, matchedIn: [] });
        continue;
      }

      const q = query.toLowerCase();
      const matchedIn: string[] = [];
      let snippet: string | undefined;
      const show = mockStore.shows.find((s) => s.id === ep.showId);
      const analysis = mockStore.analyses[ep.id];
      const transcript = mockStore.transcripts[ep.id];

      if (ep.title.toLowerCase().includes(q) || (ep.description ?? "").toLowerCase().includes(q)) {
        matchedIn.push("episode");
      }
      if (show && (show.title.toLowerCase().includes(q) || (show.author ?? "").toLowerCase().includes(q))) {
        matchedIn.push("show");
      }
      if (ep.guests.some((g) => g.toLowerCase().includes(q))) {
        matchedIn.push("guest");
      }
      if (
        analysis &&
        (analysis.oneLiner.toLowerCase().includes(q) ||
          analysis.summary.toLowerCase().includes(q) ||
          analysis.keyPoints.some((p) => p.toLowerCase().includes(q)) ||
          analysis.tags.some((t) => t.toLowerCase().includes(q)) ||
          analysis.people.some((p) => p.toLowerCase().includes(q)))
      ) {
        matchedIn.push("analysis");
        snippet = makeSnippet(analysis.summary, query);
      }
      if (transcript && transcript.fullText.toLowerCase().includes(q)) {
        matchedIn.push("transcript");
        snippet = snippet ?? makeSnippet(transcript.fullText, query);
      }

      if (matchedIn.length === 0) continue;
      results.push({ episode: ep, rank: matchedIn.length, matchedIn, snippet });
    }
    return results.sort((a, b) => b.rank - a.rank || (b.episode.publishedAt ?? "").localeCompare(a.episode.publishedAt ?? ""));
  }

  const supabase = getSupabaseAdmin();

  if (!query) {
    let q = supabase
      .from("podcast_episodes")
      .select("*, podcast_shows(id, title, cover_url, author, source_platform)")
      .order("published_at", { ascending: false })
      .limit(filters.limit);
    if (filters.showId) q = q.eq("show_id", filters.showId);
    if (filters.processingStatus) q = q.eq("processing_status", filters.processingStatus);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? [])
      .map((row) => rowToEpisode(row))
      .filter((ep) => passesFilters(ep, filters))
      .map((episode) => ({ episode, rank: 0, matchedIn: [] }));
  }

  const { data: rpcData, error } = await supabase.rpc("search_episodes", { p_query: query, p_limit: 200 });
  if (error) throw error;
  const matches = (rpcData ?? []) as SearchMatchRow[];
  const ids = matches.map((m) => m.episode_id);
  if (ids.length === 0) return [];

  const { data: episodes, error: epErr } = await supabase
    .from("podcast_episodes")
    .select("*, podcast_shows(id, title, cover_url, author, source_platform)")
    .in("id", ids);
  if (epErr) throw epErr;

  const rankMap = new Map<string, SearchMatchRow>(matches.map((m) => [m.episode_id, m]));
  const results: SearchResultItem[] = (episodes ?? [])
    .map((row) => rowToEpisode(row))
    .filter((ep) => passesFilters(ep, filters))
    .map((episode) => {
      const m = rankMap.get(episode.id);
      return { episode, rank: m?.rank ?? 0, matchedIn: m?.matched_in ?? [] };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, filters.limit);

  void userId;
  return results;
}

function rowToEpisode(row: Record<string, unknown>): PodcastEpisode {
  const show = row.podcast_shows as Record<string, unknown> | null;
  return {
    id: row.id as string,
    showId: row.show_id as string,
    guid: row.guid as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    publishedAt: (row.published_at as string) ?? null,
    durationSeconds: (row.duration_seconds as number) ?? null,
    audioUrl: (row.audio_url as string) ?? null,
    episodeUrl: (row.episode_url as string) ?? null,
    coverUrl: (row.cover_url as string) ?? null,
    guests: (row.guests as string[]) ?? [],
    processingStatus: row.processing_status as PodcastEpisode["processingStatus"],
    transcriptStatus: row.transcript_status as PodcastEpisode["transcriptStatus"],
    analysisStatus: row.analysis_status as PodcastEpisode["analysisStatus"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    show: show
      ? {
          id: show.id as string,
          title: show.title as string,
          coverUrl: (show.cover_url as string) ?? null,
          author: (show.author as string) ?? null,
          sourcePlatform: show.source_platform as SourcePlatform,
        }
      : undefined,
  };
}
