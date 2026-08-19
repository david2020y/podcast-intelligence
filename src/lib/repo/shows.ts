import { getAppMode } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore, newId, nowIso, findShow } from "@/lib/mock/store";
import type { PodcastShow, SourcePlatform, SubscriptionStatus } from "@/lib/types";

export interface CreateShowInput {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  author?: string | null;
  rssUrl?: string | null;
  websiteUrl?: string | null;
  category?: string | null;
  language?: string | null;
  sourcePlatform: SourcePlatform;
  addedByUserId?: string | null;
}

function mapRow(row: Record<string, unknown>): PodcastShow {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    coverUrl: (row.cover_url as string) ?? null,
    author: (row.author as string) ?? null,
    rssUrl: (row.rss_url as string) ?? null,
    websiteUrl: (row.website_url as string) ?? null,
    category: (row.category as string) ?? null,
    language: (row.language as string) ?? null,
    sourcePlatform: row.source_platform as SourcePlatform,
    lastSyncedAt: (row.last_synced_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    addedByUserId: (row.added_by_user_id as string) ?? null,
    inMarketplace: (row.in_marketplace as boolean) ?? false,
    marketplaceCategory: (row.marketplace_category as string) ?? null,
  };
}

/** Raw catalog fetch decorated with the current user's subscription status. Internal — callers
 * should use listMyShows / listMarketplaceShows, which apply the actual visibility rules. */
async function listShows(userId: string): Promise<PodcastShow[]> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return mockStore.shows.map((s) => ({
      ...s,
      episodeCount: mockStore.episodes.filter((e) => e.showId === s.id).length,
    }));
  }

  const supabase = getSupabaseAdmin();
  const { data: shows, error } = await supabase
    .from("podcast_shows")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const { data: subs } = await supabase.from("subscriptions").select("show_id, status").eq("user_id", userId);
  const subMap = new Map((subs ?? []).map((s) => [s.show_id, s.status as SubscriptionStatus]));

  const { data: counts } = await supabase.from("podcast_episodes").select("show_id");
  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    countMap.set(row.show_id, (countMap.get(row.show_id) ?? 0) + 1);
  }

  return (shows ?? []).map((row) => ({
    ...mapRow(row),
    subscriptionStatus: subMap.get(row.id) ?? null,
    episodeCount: countMap.get(row.id) ?? 0,
  }));
}

/** "我的播客" — shows the user has subscribed to (whether added by them or from the marketplace). */
export async function listMyShows(userId: string): Promise<PodcastShow[]> {
  const shows = await listShows(userId);
  return shows.filter((s) => s.subscriptionStatus === "active" || s.subscriptionStatus === "paused");
}

/** "播客市场" — the admin-curated, categorized shows visible to every user. */
export async function listMarketplaceShows(userId: string): Promise<PodcastShow[]> {
  const shows = await listShows(userId);
  return shows.filter((s) => s.inMarketplace);
}

export async function getShowById(id: string, userId?: string): Promise<PodcastShow | null> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const show = findShow(id);
    if (!show) return null;
    return { ...show, episodeCount: mockStore.episodes.filter((e) => e.showId === id).length };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("podcast_shows").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  let subscriptionStatus: SubscriptionStatus | null = null;
  if (userId) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("show_id", id)
      .eq("user_id", userId)
      .maybeSingle();
    subscriptionStatus = (sub?.status as SubscriptionStatus) ?? null;
  }

  const { count } = await supabase
    .from("podcast_episodes")
    .select("id", { count: "exact", head: true })
    .eq("show_id", id);

  return { ...mapRow(data), subscriptionStatus, episodeCount: count ?? 0 };
}

export async function getShowByRssUrl(rssUrl: string): Promise<PodcastShow | null> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return mockStore.shows.find((s) => s.rssUrl === rssUrl) ?? null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("podcast_shows").select("*").eq("rss_url", rssUrl).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function createShow(input: CreateShowInput): Promise<PodcastShow> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const show: PodcastShow = {
      id: newId(),
      title: input.title,
      description: input.description ?? null,
      coverUrl: input.coverUrl ?? null,
      author: input.author ?? null,
      rssUrl: input.rssUrl ?? null,
      websiteUrl: input.websiteUrl ?? null,
      category: input.category ?? null,
      language: input.language ?? null,
      sourcePlatform: input.sourcePlatform,
      lastSyncedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      episodeCount: 0,
      addedByUserId: input.addedByUserId ?? null,
      inMarketplace: false,
      marketplaceCategory: null,
    };
    mockStore.shows.unshift(show);
    return show;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("podcast_shows")
    .insert({
      title: input.title,
      description: input.description ?? null,
      cover_url: input.coverUrl ?? null,
      author: input.author ?? null,
      rss_url: input.rssUrl ?? null,
      website_url: input.websiteUrl ?? null,
      category: input.category ?? null,
      language: input.language ?? null,
      source_platform: input.sourcePlatform,
      added_by_user_id: input.addedByUserId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateShowSyncMeta(
  id: string,
  patch: Partial<Pick<PodcastShow, "title" | "description" | "coverUrl" | "author" | "websiteUrl" | "category" | "language">> & {
    lastSyncedAt?: string;
  }
): Promise<void> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const show = findShow(id);
    if (!show) return;
    Object.assign(show, patch, { updatedAt: nowIso() });
    return;
  }
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.coverUrl !== undefined) update.cover_url = patch.coverUrl;
  if (patch.author !== undefined) update.author = patch.author;
  if (patch.websiteUrl !== undefined) update.website_url = patch.websiteUrl;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.language !== undefined) update.language = patch.language;
  if (patch.lastSyncedAt !== undefined) update.last_synced_at = patch.lastSyncedAt;
  const { error } = await supabase.from("podcast_shows").update(update).eq("id", id);
  if (error) throw error;
}

export async function setSubscription(userId: string, showId: string, status: SubscriptionStatus): Promise<void> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const show = findShow(showId);
    if (show) show.subscriptionStatus = status;
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("subscriptions")
    .upsert({ user_id: userId, show_id: showId, status }, { onConflict: "user_id,show_id" });
  if (error) throw error;
}
