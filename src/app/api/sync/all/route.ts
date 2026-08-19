import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { syncAllShows } from "@/lib/rss/sync";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const result = await syncAllShows(user.id);
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
