import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { getEpisodeById } from "@/lib/repo/episodes";
import { getTranscript } from "@/lib/repo/transcripts";
import { getAnalysis } from "@/lib/repo/analyses";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const episode = await getEpisodeById(id, user.id);
    if (!episode) return NextResponse.json({ error: "单集不存在" }, { status: 404 });
    const [transcript, analysis] = await Promise.all([getTranscript(id), getAnalysis(id)]);
    return NextResponse.json({ episode, transcript, analysis });
  } catch (err) {
    return apiError(err);
  }
}
