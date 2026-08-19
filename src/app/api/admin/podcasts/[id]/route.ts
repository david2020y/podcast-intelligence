import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { UpdateMarketplaceListingSchema } from "@/lib/validation/admin";
import { updateMarketplaceListing } from "@/lib/repo/shows";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = UpdateMarketplaceListingSchema.parse(await req.json());
    await updateMarketplaceListing(id, {
      inMarketplace: body.inMarketplace,
      marketplaceCategory: body.marketplaceCategory !== undefined ? (body.marketplaceCategory || null) : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
