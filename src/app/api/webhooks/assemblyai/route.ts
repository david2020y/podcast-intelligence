import { NextRequest, NextResponse } from "next/server";
import { ASSEMBLYAI_WEBHOOK_HEADER_NAME, ASSEMBLYAI_WEBHOOK_SECRET } from "@/lib/config";
import { fetchAssemblyAiTranscript, mapAssemblyAiToSegments } from "@/lib/transcription/assemblyai";
import * as episodesRepo from "@/lib/repo/episodes";
import * as transcriptsRepo from "@/lib/repo/transcripts";
import * as jobsRepo from "@/lib/repo/jobs";

/**
 * AssemblyAI POSTs here when a submitted transcription job finishes (or errors). Authenticated
 * by a shared-secret header we set on job submission — this endpoint is public (no Supabase
 * session), so that header is the only thing standing between it and a forged completion event.
 */
export async function POST(req: NextRequest) {
  const providedSecret = req.headers.get(ASSEMBLYAI_WEBHOOK_HEADER_NAME);
  if (!ASSEMBLYAI_WEBHOOK_SECRET || providedSecret !== ASSEMBLYAI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const episodeId = req.nextUrl.searchParams.get("episodeId");
  if (!episodeId) {
    return NextResponse.json({ error: "缺少 episodeId" }, { status: 400 });
  }

  let payload: { transcript_id?: string; status?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const transcriptId = payload.transcript_id;
  if (!transcriptId) {
    return NextResponse.json({ error: "缺少 transcript_id" }, { status: 400 });
  }

  const job = await jobsRepo.getLatestProcessingJob(episodeId, "transcribe");

  try {
    if (payload.status === "error") {
      const transcript = await fetchAssemblyAiTranscript(process.env.ASSEMBLYAI_API_KEY!, transcriptId);
      const message = transcript.error || "AssemblyAI 转录失败";
      await episodesRepo.updateEpisodeStatus(episodeId, { transcriptStatus: "failed" });
      if (job) await jobsRepo.finishProcessingJob(job.id, { status: "failed", errorMessage: message });
      return NextResponse.json({ ok: true });
    }

    if (payload.status !== "completed") {
      // "queued" / "processing" pings shouldn't normally hit a webhook, but ack them harmlessly.
      return NextResponse.json({ ok: true });
    }

    const transcript = await fetchAssemblyAiTranscript(process.env.ASSEMBLYAI_API_KEY!, transcriptId);
    const segments = mapAssemblyAiToSegments(transcript);

    await transcriptsRepo.saveTranscript(
      episodeId,
      transcript.text ?? "",
      transcript.language_code ?? null,
      "assemblyai",
      segments
    );
    await episodesRepo.updateEpisodeStatus(episodeId, { transcriptStatus: "completed" });
    if (job) await jobsRepo.finishProcessingJob(job.id, { status: "completed" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "处理 AssemblyAI 回调失败";
    await episodesRepo.updateEpisodeStatus(episodeId, { transcriptStatus: "failed" });
    if (job) await jobsRepo.finishProcessingJob(job.id, { status: "failed", errorMessage: message });
    // Still 200: we've recorded the failure ourselves, no need for AssemblyAI to retry.
    return NextResponse.json({ ok: false, error: message });
  }
}
