import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { syncShow } from "@/lib/rss/sync";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCurrentUser();
    const { id } = await params;
    const job = await syncShow(id);
    return NextResponse.json({ job });
  } catch (err) {
    return apiError(err);
  }
}
