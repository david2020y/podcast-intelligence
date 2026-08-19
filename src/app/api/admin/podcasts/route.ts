import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { listShowsForAdmin } from "@/lib/repo/shows";

export async function GET() {
  try {
    await requireAdmin();
    const shows = await listShowsForAdmin();
    return NextResponse.json({ shows });
  } catch (err) {
    return apiError(err);
  }
}
