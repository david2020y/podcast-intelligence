import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthRequiredError } from "@/lib/auth";
import { UnsafeUrlError } from "@/lib/rss/ssrf";
import { ExternalFetchError } from "@/lib/rss/fetchSafe";
import { FeedDiscoveryError } from "@/lib/rss/sync";
import { TranscriptionError } from "@/lib/transcription/transcribe";
import { AnalysisError } from "@/lib/ai/analyze";

export function apiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "请求参数不合法", details: err.flatten() }, { status: 400 });
  }
  if (err instanceof AuthRequiredError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof UnsafeUrlError || err instanceof FeedDiscoveryError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof ExternalFetchError) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
  if (err instanceof TranscriptionError || err instanceof AnalysisError) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
  const message = err instanceof Error ? err.message : "服务器内部错误";
  console.error(err);
  return NextResponse.json({ error: message }, { status: 500 });
}
