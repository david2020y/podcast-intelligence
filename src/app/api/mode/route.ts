import { NextResponse } from "next/server";
import { getAppMode, getAiModel, getTranscriptionModel, getAppBaseUrl, ASSEMBLYAI_WEBHOOK_SECRET, CRON_SECRET } from "@/lib/config";

export async function GET() {
  const mode = getAppMode();
  const transcriptionModel =
    mode.transcriptionProvider === "groq" || mode.transcriptionProvider === "openai"
      ? getTranscriptionModel(mode.transcriptionProvider)
      : null;

  return NextResponse.json({
    ...mode,
    aiModel: mode.aiProvider ? getAiModel(mode.aiProvider) : null,
    transcriptionModel,
    cronConfigured: !!CRON_SECRET,
    webhookConfigured: !!getAppBaseUrl() && !!ASSEMBLYAI_WEBHOOK_SECRET,
    supabaseUrl: mode.hasSupabase ? maskUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) : null,
  });
}

function maskUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}
