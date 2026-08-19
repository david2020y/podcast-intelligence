import { describe, expect, it } from "vitest";
import { createShow } from "@/lib/repo/shows";
import { upsertEpisodeFromFeed, listEpisodesByShow } from "@/lib/repo/episodes";
import { toggleFavorite } from "@/lib/repo/favorites";
import type { ParsedFeedEpisode } from "@/lib/rss/parser";

const feedEpisode: ParsedFeedEpisode = {
  guid: "unit-test-guid-1",
  title: "单元测试单集",
  description: "描述",
  publishedAt: "2024-05-01T00:00:00.000Z",
  durationSeconds: 1200,
  audioUrl: "https://example.com/a.mp3",
  episodeUrl: "https://example.com/e1",
  coverUrl: null,
  guests: [],
};

describe("episode sync idempotency (mock repo)", () => {
  it("does not create a duplicate episode when the same guid is synced twice", async () => {
    const show = await createShow({ title: "单元测试播客", sourcePlatform: "rss", rssUrl: "https://example.com/unit-test-feed.xml" });

    const first = await upsertEpisodeFromFeed(show.id, feedEpisode);
    expect(first.created).toBe(true);

    const second = await upsertEpisodeFromFeed(show.id, { ...feedEpisode, title: "标题已更新" });
    expect(second.created).toBe(false);
    expect(second.episode.id).toBe(first.episode.id);

    const episodes = await listEpisodesByShow(show.id);
    expect(episodes.filter((e) => e.guid === feedEpisode.guid)).toHaveLength(1);
    expect(episodes.find((e) => e.guid === feedEpisode.guid)?.title).toBe("标题已更新");
  });

  it("never overwrites processing state when metadata is refreshed", async () => {
    const show = await createShow({ title: "单元测试播客 2", sourcePlatform: "rss", rssUrl: "https://example.com/unit-test-feed-2.xml" });
    const { episode } = await upsertEpisodeFromFeed(show.id, { ...feedEpisode, guid: "unit-test-guid-2" });
    expect(episode.processingStatus).toBe("pending");

    await upsertEpisodeFromFeed(show.id, { ...feedEpisode, guid: "unit-test-guid-2", title: "再次同步" });
    const episodes = await listEpisodesByShow(show.id);
    const refreshed = episodes.find((e) => e.guid === "unit-test-guid-2");
    expect(refreshed?.processingStatus).toBe("pending");
  });
});

describe("favorites toggle (mock repo)", () => {
  it("flips favorite state on repeated calls", async () => {
    const show = await createShow({ title: "收藏测试播客", sourcePlatform: "rss" });
    const { episode } = await upsertEpisodeFromFeed(show.id, { ...feedEpisode, guid: "unit-test-fav-1" });

    const first = await toggleFavorite("test-user", episode.id);
    expect(first).toBe(true);
    const second = await toggleFavorite("test-user", episode.id);
    expect(second).toBe(false);
  });
});
