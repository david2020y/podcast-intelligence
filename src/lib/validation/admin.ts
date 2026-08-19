import { z } from "zod";

export const UpdateMarketplaceListingSchema = z
  .object({
    inMarketplace: z.boolean().optional(),
    marketplaceCategory: z.string().trim().max(50).nullable().optional(),
  })
  .refine((v) => v.inMarketplace !== undefined || v.marketplaceCategory !== undefined, {
    message: "至少需要提供一个要修改的字段",
  });
