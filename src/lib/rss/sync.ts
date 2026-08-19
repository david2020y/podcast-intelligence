import { fetchAndParseFeed } from "@/lib/rss/parser";
import { fetchSafe } from "@/lib/rss/fetchSafe";
import * as showsRepo from "@/lib/repo/shows";
import * as episodesRepo from "@/lib/repo/episodes";
import * as jobsRepo from "@/lib/repo/jobs";
import type { PodcastShow, SyncJob } from "@/lib/types";

export class FeedDiscoveryError extends Error {}

/** Syncs one show's feed: idempotent upsert of episodes by (showId, guid). Never fails the whole job on a single bad episode. */
export async function syncShow(showId: string): Promise<SyncJob> {
  const job = await jobsRepo.createSyncJob(showId);
  let added = 0;
  let updated = 0;
  let failed = 0;
  let errorMessage: string | null = null;

  try {
    const show = await showsRepo.getShowById(showId);
    if (!show) throw new Error("播客不存在");
    if (!show.rssUrl) throw new Error("该播客没有关联的 RSS 地址，无法自动同步");

    const feed = await fetchAndParseFeed(show.rssUrl);

    await showsRepo.updateShowSyncMeta(showId, {
      title: feed.title,
      description: feed.description,
      coverUrl: feed.coverUrl ?? show.coverUrl,
      author: feed.author ?? show.author,
      websiteUrl: feed.websiteUrl ?? show.websiteUrl,
      category: feed.category ?? show.category,
      language: feed.language ?? show.language,
      lastSyncedAt: new Date().toISOString(),
    });

    for (const item of feed.episodes) {
      try {
        const { created } = await episodesRepo.upsertEpisodeFromFeed(showId, item);
        if (created) added++;
        else updated++;
      } catch {
        failed++;
      }
    }

    await jobsRepo.finishSyncJob(job.id, { status: "completed", addedCount: added, updatedCount: updated, failedCount: failed });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "同步失败";
    await jobsRepo.finishSyncJob(job.id, {
      status: "failed",
      addedCount: added,
      updatedCount: updated,
      failedCount: failed,
      errorMessage,
    });
    throw err;
  }

  return { ...job, status: "completed", addedCount: added, updatedCount: updated, failedCount: failed };
}

/** Syncs every show in the catalog; individual show failures don't abort the batch. */
export async function syncAllShows(userId: string): Promise<{ results: Array<{ showId: string; ok: boolean; error?: string }> }> {
  const shows = await showsRepo.listMyShows(userId);
  const results: Array<{ showId: string; ok: boolean; error?: string }> = [];
  for (const show of shows) {
    try {
      await syncShow(show.id);
      results.push({ showId: show.id, ok: true });
    } catch (err) {
      results.push({ showId: show.id, ok: false, error: err instanceof Error ? err.message : "同步失败" });
    }
  }
  return { results };
}

export async function addPodcastFromRss(rssUrl: string, userId: string): Promise<PodcastShow> {
  const existing = await showsRepo.getShowByRssUrl(rssUrl);
  if (existing) {
    await showsRepo.setSubscription(userId, existing.id, "active");
    await syncShow(existing.id);
    const refreshed = await showsRepo.getShowById(existing.id, userId);
    return refreshed!;
  }

  const feed = await fetchAndParseFeed(rssUrl);
  const show = await showsRepo.createShow({
    title: feed.title,
    description: feed.description,
    coverUrl: feed.coverUrl,
    author: feed.author,
    rssUrl,
    websiteUrl: feed.websiteUrl,
    category: feed.category,
    language: feed.language,
    sourcePlatform: "rss",
    addedByUserId: userId,
  });
  await showsRepo.setSubscription(userId, show.id, "active");
  await syncShow(show.id);
  const refreshed = await showsRepo.getShowById(show.id, userId);
  return refreshed!;
}

const FEED_LINK_RE = /<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]*>/gi;
const HREF_RE = /href=["']([^"']+)["']/i;

/** Best-effort RSS auto-discovery from an episode/show page's <link rel="alternate" type="application/rss+xml">. */
export async function discoverFeedUrl(pageUrl: string): Promise<string> {
  const res = await fetchSafe(pageUrl);
  if (!res.ok) throw new FeedDiscoveryError(`无法访问该链接：HTTP ${res.status}`);
  const html = await res.text();
  const matches = html.match(FEED_LINK_RE);
  if (!matches || matches.length === 0) {
    throw new FeedDiscoveryError(
      "未能从该链接自动发现 RSS 地址。请直接提供播客的 RSS 订阅地址（Apple Podcasts / Spotify / 小宇宙 / YouTube 的自动识别将在后续版本支持）。"
    );
  }
  const hrefMatch = matches[0].match(HREF_RE);
  if (!hrefMatch) throw new FeedDiscoveryError("解析 RSS 链接失败");
  return new URL(hrefMatch[1], pageUrl).toString();
}

export async function addPodcastFromEpisodeUrl(episodeUrl: string, userId: string): Promise<PodcastShow> {
  const rssUrl = await discoverFeedUrl(episodeUrl);
  return addPodcastFromRss(rssUrl, userId);
}

export async function addPodcastManual(
  input: {
    title: string;
    author?: string;
    description?: string;
    websiteUrl?: string;
    category?: string;
    language?: string;
    coverUrl?: string;
  },
  userId: string
): Promise<PodcastShow> {
  const show = await showsRepo.createShow({
    title: input.title,
    author: input.author ?? null,
    description: input.description ?? null,
    websiteUrl: input.websiteUrl ?? null,
    category: input.category ?? null,
    language: input.language ?? null,
    coverUrl: input.coverUrl ?? null,
    rssUrl: null,
    sourcePlatform: "manual",
    addedByUserId: userId,
  });
  await showsRepo.setSubscription(userId, show.id, "active");
  return show;
}
