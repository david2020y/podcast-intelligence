import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { transcribeEpisode } from "@/lib/transcription/transcribe";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCurrentUser();
    const { id } = await params;
    const outcome = await transcribeEpisode(id);
    if (outcome.status === "completed") {
      return NextResponse.json({ status: "completed", transcript: outcome.transcript });
    }
    return NextResponse.json({ status: "processing" });
  } catch (err) {
    return apiError(err);
  }
}
