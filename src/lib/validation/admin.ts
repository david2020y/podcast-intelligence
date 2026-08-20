import { z } from "zod";

export const UpdateMarketplaceListingSchema = z
  .object({
    inMarketplace: z.boolean().optional(),
    marketplaceCategory: z.string().trim().max(50).nullable().optional(),
  })
  .refine((v) => v.inMarketplace !== undefined || v.marketplaceCategory !== undefined, {
    message: "至少需要提供一个要修改的字段",
  });

export const BulkImportPodcastsSchema = z.object({
  urls: z.array(z.string().min(1)).min(1, "至少需要一个链接").max(50, "一次最多导入 50 条"),
  category: z.string().trim().max(50).optional(),
});
