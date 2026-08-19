import { getAppMode } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore, newId, nowIso, findEpisode, attachEpisodeExtras, findShow } from "@/lib/mock/store";
import type { ParsedFeedEpisode } from "@/lib/rss/parser";
import type { PodcastEpisode, ProcessingStatus, SourcePlatform } from "@/lib/types";

function mapShowRef(show: Record<string, unknown> | null | undefined): PodcastEpisode["show"] {
  if (!show) return undefined;
  return {
    id: show.id as string,
    title: show.title as string,
    coverUrl: (show.cover_url as string) ?? null,
    author: (show.author as string) ?? null,
    sourcePlatform: show.source_platform as SourcePlatform,
  };
}

function mapRow(row: Record<string, unknown>): PodcastEpisode {
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
    processingStatus: row.processing_status as ProcessingStatus,
    transcriptStatus: row.transcript_status as ProcessingStatus,
    analysisStatus: row.analysis_status as ProcessingStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listEpisodesByShow(showId: string): Promise<PodcastEpisode[]> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return mockStore.episodes
      .filter((e) => e.showId === showId)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .map(attachEpisodeExtras);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("podcast_episodes")
    .select("*, podcast_shows(id, title, cover_url, author, source_platform)")
    .eq("show_id", showId)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const ep = mapRow(row);
    ep.show = mapShowRef((row as unknown as { podcast_shows: Record<string, unknown> }).podcast_shows);
    return ep;
  });
}

export async function getEpisodeById(id: string, userId?: string): Promise<PodcastEpisode | null> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const ep = findEpisode(id);
    if (!ep) return null;
    return attachEpisodeExtras(ep);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("podcast_episodes")
    .select("*, podcast_shows(id, title, cover_url, author, source_platform)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const ep = mapRow(data);
  ep.show = mapShowRef((data as unknown as { podcast_shows: Record<string, unknown> }).podcast_shows);
  if (userId) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("episode_id")
      .eq("episode_id", id)
      .eq("user_id", userId)
      .maybeSingle();
    ep.isFavorited = !!fav;
  }
  const { data: tagRows } = await supabase
    .from("episode_tags")
    .select("tags(name)")
    .eq("episode_id", id);
  ep.tags = (tagRows ?? []).map((r) => (r as unknown as { tags: { name: string } }).tags?.name).filter(Boolean);
  return ep;
}

/** Idempotently inserts an episode by (showId, guid); returns the row and whether it was newly created. */
export async function upsertEpisodeFromFeed(
  showId: string,
  parsed: ParsedFeedEpisode
): Promise<{ episode: PodcastEpisode; created: boolean }> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const existing = mockStore.episodes.find((e) => e.showId === showId && e.guid === parsed.guid);
    if (existing) {
      // Refresh mutable metadata only; never touch processing state.
      existing.title = parsed.title;
      existing.description = parsed.description;
      existing.publishedAt = parsed.publishedAt;
      existing.durationSeconds = parsed.durationSeconds;
      existing.audioUrl = parsed.audioUrl ?? existing.audioUrl;
      existing.episodeUrl = parsed.episodeUrl ?? existing.episodeUrl;
      existing.coverUrl = parsed.coverUrl ?? existing.coverUrl;
      existing.updatedAt = nowIso();
      return { episode: attachEpisodeExtras(existing), created: false };
    }
    const episode: PodcastEpisode = {
      id: newId(),
      showId,
      guid: parsed.guid,
      title: parsed.title,
      description: parsed.description,
      publishedAt: parsed.publishedAt,
      durationSeconds: parsed.durationSeconds,
      audioUrl: parsed.audioUrl,
      episodeUrl: parsed.episodeUrl,
      coverUrl: parsed.coverUrl,
      guests: parsed.guests,
      processingStatus: "pending",
      transcriptStatus: "pending",
      analysisStatus: "pending",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    mockStore.episodes.unshift(episode);
    return { episode: attachEpisodeExtras(episode), created: true };
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("podcast_episodes")
    .select("id")
    .eq("show_id", showId)
    .eq("guid", parsed.guid)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("podcast_episodes")
      .update({
        title: parsed.title,
        description: parsed.description,
        published_at: parsed.publishedAt,
        duration_seconds: parsed.durationSeconds,
        audio_url: parsed.audioUrl,
        episode_url: parsed.episodeUrl,
        cover_url: parsed.coverUrl,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return { episode: mapRow(data), created: false };
  }

  const { data, error } = await supabase
    .from("podcast_episodes")
    .insert({
      show_id: showId,
      guid: parsed.guid,
      title: parsed.title,
      description: parsed.description,
      published_at: parsed.publishedAt,
      duration_seconds: parsed.durationSeconds,
      audio_url: parsed.audioUrl,
      episode_url: parsed.episodeUrl,
      cover_url: parsed.coverUrl,
      guests: parsed.guests,
    })
    .select("*")
    .single();
  // Unique constraint race: another concurrent sync inserted it first — treat as update.
  if (error && (error as { code?: string }).code === "23505") {
    return upsertEpisodeFromFeed(showId, parsed);
  }
  if (error) throw error;
  return { episode: mapRow(data), created: true };
}

export async function updateEpisodeStatus(
  id: string,
  patch: Partial<Pick<PodcastEpisode, "processingStatus" | "transcriptStatus" | "analysisStatus">>
): Promise<void> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const ep = findEpisode(id);
    if (!ep) return;
    Object.assign(ep, patch, { updatedAt: nowIso() });
    return;
  }
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (patch.processingStatus) update.processing_status = patch.processingStatus;
  if (patch.transcriptStatus) update.transcript_status = patch.transcriptStatus;
  if (patch.analysisStatus) update.analysis_status = patch.analysisStatus;
  const { error } = await supabase.from("podcast_episodes").update(update).eq("id", id);
  if (error) throw error;
}

export async function listRecentEpisodes(limit = 10, userId?: string): Promise<PodcastEpisode[]> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return mockStore.episodes
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map(attachEpisodeExtras);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("podcast_episodes")
    .select("*, podcast_shows(id, title, cover_url, author, source_platform)")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  void userId;
  return (data ?? []).map((row) => {
    const ep = mapRow(row);
    ep.show = mapShowRef((row as unknown as { podcast_shows: Record<string, unknown> }).podcast_shows);
    return ep;
  });
}

export async function countEpisodesByStatus(
  field: "processing_status" | "transcript_status" | "analysis_status",
  value: ProcessingStatus
): Promise<number> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const key = field === "processing_status" ? "processingStatus" : field === "transcript_status" ? "transcriptStatus" : "analysisStatus";
    return mockStore.episodes.filter((e) => e[key as keyof PodcastEpisode] === value).length;
  }
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("podcast_episodes")
    .select("id", { count: "exact", head: true })
    .eq(field, value);
  if (error) throw error;
  return count ?? 0;
}

export function resolveShowForEpisode(episode: PodcastEpisode) {
  return findShow(episode.showId);
}
