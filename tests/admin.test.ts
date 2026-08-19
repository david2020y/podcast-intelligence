import { describe, expect, it, afterEach } from "vitest";
import { isAdminPhone } from "@/lib/config";
import { createShow, listShowsForAdmin, updateMarketplaceListing } from "@/lib/repo/shows";
import { UpdateMarketplaceListingSchema } from "@/lib/validation/admin";

describe("isAdminPhone", () => {
  const original = process.env.ADMIN_PHONES;
  afterEach(() => {
    process.env.ADMIN_PHONES = original;
  });

  it("accepts a phone listed in ADMIN_PHONES", () => {
    process.env.ADMIN_PHONES = "13800001111, 13900002222";
    expect(isAdminPhone("13800001111")).toBe(true);
    expect(isAdminPhone("13900002222")).toBe(true);
  });

  it("rejects a phone not in the list, null, and an unset env var", () => {
    process.env.ADMIN_PHONES = "13800001111";
    expect(isAdminPhone("13900002222")).toBe(false);
    expect(isAdminPhone(null)).toBe(false);
    delete process.env.ADMIN_PHONES;
    expect(isAdminPhone("13800001111")).toBe(false);
  });
});

describe("admin show listing + listing updates (mock repo)", () => {
  it("listShowsForAdmin surfaces every show regardless of marketplace status", async () => {
    const show = await createShow({ title: "待审核播客", sourcePlatform: "rss", addedByUserId: "some-user" });

    const all = await listShowsForAdmin();
    const found = all.find((s) => s.id === show.id);
    expect(found).toBeDefined();
    expect(found!.inMarketplace).toBe(false);
    expect(found!.addedByUserId).toBe("some-user");
  });

  it("updateMarketplaceListing flips in_marketplace and sets a free-text category", async () => {
    const show = await createShow({ title: "分类测试播客", sourcePlatform: "rss" });

    await updateMarketplaceListing(show.id, { inMarketplace: true, marketplaceCategory: "新分类" });

    const all = await listShowsForAdmin();
    const found = all.find((s) => s.id === show.id);
    expect(found!.inMarketplace).toBe(true);
    expect(found!.marketplaceCategory).toBe("新分类");
  });

  it("updateMarketplaceListing can clear a category back to null", async () => {
    const show = await createShow({ title: "清空分类测试", sourcePlatform: "rss" });
    await updateMarketplaceListing(show.id, { marketplaceCategory: "临时分类" });

    await updateMarketplaceListing(show.id, { marketplaceCategory: null });

    const all = await listShowsForAdmin();
    const found = all.find((s) => s.id === show.id);
    expect(found!.marketplaceCategory).toBeNull();
  });
});

describe("UpdateMarketplaceListingSchema", () => {
  it("requires at least one field", () => {
    expect(UpdateMarketplaceListingSchema.safeParse({}).success).toBe(false);
  });

  it("accepts inMarketplace alone", () => {
    expect(UpdateMarketplaceListingSchema.safeParse({ inMarketplace: true }).success).toBe(true);
  });

  it("accepts marketplaceCategory alone, including null", () => {
    expect(UpdateMarketplaceListingSchema.safeParse({ marketplaceCategory: "科技" }).success).toBe(true);
    expect(UpdateMarketplaceListingSchema.safeParse({ marketplaceCategory: null }).success).toBe(true);
  });
});
