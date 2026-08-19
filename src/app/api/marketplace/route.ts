import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { listMarketplaceShows } from "@/lib/repo/shows";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const shows = await listMarketplaceShows(user.id);
    return NextResponse.json({ shows });
  } catch (err) {
    return apiError(err);
  }
}
