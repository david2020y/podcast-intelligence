import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { BulkImportPodcastsSchema } from "@/lib/validation/admin";
import { bulkImportShowsForAdmin } from "@/lib/rss/sync";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { urls, category } = BulkImportPodcastsSchema.parse(await req.json());
    const results = await bulkImportShowsForAdmin(urls, category?.trim() || null, admin.id);
    return NextResponse.json({ results });
  } catch (err) {
    return apiError(err);
  }
}
