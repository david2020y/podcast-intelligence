import type { TranscriptSegmentSchema } from "@/lib/validation/analysis";
import type { z } from "zod";

const API_BASE = "https://api.assemblyai.com/v2";

type SegmentInput = z.infer<typeof TranscriptSegmentSchema>;

export class AssemblyAiError extends Error {}

interface SubmitJobParams {
  apiKey: string;
  audioUrl: string;
  webhookUrl: string;
  webhookAuthHeaderName: string;
  webhookAuthHeaderValue: string;
}

export async function submitAssemblyAiJob(params: SubmitJobParams): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/transcript`, {
    method: "POST",
    headers: {
      authorization: params.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: params.audioUrl,
      webhook_url: params.webhookUrl,
      webhook_auth_header_name: params.webhookAuthHeaderName,
      webhook_auth_header_value: params.webhookAuthHeaderValue,
      speaker_labels: true,
      language_detection: true,
      punctuate: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AssemblyAiError(`AssemblyAI 提交转录任务失败：HTTP ${res.status} ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id };
}

interface AssemblyAiUtterance {
  text: string;
  start: number; // milliseconds
  end: number; // milliseconds
  speaker: string | null;
}

interface AssemblyAiWord {
  text: string;
  start: number;
  end: number;
  speaker?: string | null;
}

export interface AssemblyAiTranscript {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  error?: string | null;
  text: string | null;
  language_code?: string | null;
  audio_duration?: number | null;
  utterances?: AssemblyAiUtterance[] | null;
  words?: AssemblyAiWord[] | null;
}

export async function fetchAssemblyAiTranscript(apiKey: string, transcriptId: string): Promise<AssemblyAiTranscript> {
  const res = await fetch(`${API_BASE}/transcript/${transcriptId}`, {
    headers: { authorization: apiKey },
  });
  if (!res.ok) {
    throw new AssemblyAiError(`AssemblyAI 获取转录结果失败：HTTP ${res.status}`);
  }
  return (await res.json()) as AssemblyAiTranscript;
}

/**
 * Prefers speaker-turn utterances (natural conversational segments, with speaker labels folded
 * into the text like our other transcript sources) and falls back to bucketing raw words into
 * ~15s windows for the rare case utterances come back empty (e.g. speaker_labels didn't apply).
 */
export function mapAssemblyAiToSegments(transcript: AssemblyAiTranscript): SegmentInput[] {
  const msToSec = (ms: number) => Math.round((ms / 1000) * 100) / 100;

  if (transcript.utterances && transcript.utterances.length > 0) {
    return transcript.utterances.map((u, i) => ({
      index: i,
      startSeconds: msToSec(u.start),
      endSeconds: msToSec(u.end),
      text: u.speaker ? `发言人 ${u.speaker}：${u.text}` : u.text,
    }));
  }

  if (transcript.words && transcript.words.length > 0) {
    const WINDOW_MS = 15_000;
    const segments: SegmentInput[] = [];
    let bucket: AssemblyAiWord[] = [];
    let bucketStart = transcript.words[0].start;

    const flush = () => {
      if (bucket.length === 0) return;
      segments.push({
        index: segments.length,
        startSeconds: msToSec(bucketStart),
        endSeconds: msToSec(bucket[bucket.length - 1].end),
        text: bucket.map((w) => w.text).join(" "),
      });
      bucket = [];
    };

    for (const word of transcript.words) {
      if (bucket.length > 0 && word.start - bucketStart > WINDOW_MS) {
        flush();
        bucketStart = word.start;
      }
      bucket.push(word);
    }
    flush();
    return segments;
  }

  return transcript.text ? [{ index: 0, startSeconds: 0, endSeconds: transcript.audio_duration ?? 0, text: transcript.text }] : [];
}
