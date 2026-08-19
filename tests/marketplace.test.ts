import { describe, expect, it } from "vitest";
import { createShow, listMyShows, listMarketplaceShows, setSubscription } from "@/lib/repo/shows";

describe("marketplace visibility (mock repo)", () => {
  // Mock Mode has a single implicit demo user (subscription status lives directly on the show
  // record, not in a per-user join table), so cross-user isolation is only meaningfully
  // enforced — and tested — in the real Supabase-backed listShows() query (`.eq("user_id", ...)`
  // against the subscriptions table). This test covers what Mock Mode can actually represent:
  // an unpublished show stays out of the marketplace even once its adder is subscribed to it.
  it("a newly added show shows up in the adder's own list but not in the marketplace until published", async () => {
    const show = await createShow({ title: "私有测试播客", sourcePlatform: "rss", addedByUserId: "owner-user" });
    await setSubscription("owner-user", show.id, "active");

    const ownerShows = await listMyShows("owner-user");
    expect(ownerShows.some((s) => s.id === show.id)).toBe(true);

    const marketplace = await listMarketplaceShows("owner-user");
    expect(marketplace.some((s) => s.id === show.id)).toBe(false);
  });

  it("a show flagged in_marketplace shows up for any user, even without a subscription", async () => {
    const show = await createShow({ title: "市场测试播客", sourcePlatform: "rss" });
    // Admin curation is a separate follow-up (no repo function for it yet) — simulate the
    // flag flip directly on the returned (same-reference) mock record.
    show.inMarketplace = true;
    show.marketplaceCategory = "科技";

    const marketplace = await listMarketplaceShows("some-user");
    expect(marketplace.some((s) => s.id === show.id && s.marketplaceCategory === "科技")).toBe(true);

    const myShows = await listMyShows("some-user");
    expect(myShows.some((s) => s.id === show.id)).toBe(false);
  });
});
