import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { analyzeEpisode } from "@/lib/ai/analyze";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCurrentUser();
    const { id } = await params;
    const analysis = await analyzeEpisode(id);
    return NextResponse.json({ analysis });
  } catch (err) {
    return apiError(err);
  }
}
