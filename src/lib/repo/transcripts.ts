import { getAppMode } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore, newId, nowIso } from "@/lib/mock/store";
import type { EpisodeTranscript, TranscriptSegment } from "@/lib/types";
import type { TranscriptSegmentInput } from "@/lib/validation/analysis";

/** PostgREST caps a single response at 1000 rows, and silently — you just get a short array.
 * A whisper.cpp transcript of a normal-length episode runs well past that (the cloud providers
 * segment far more coarsely, which is why this never surfaced before), and a truncated read
 * means the tail of the episode silently disappears from analysis. So page explicitly. */
const SEGMENT_PAGE_SIZE = 1000;

/** Raw row shape; numeric columns come back as strings from PostgREST's `numeric` type. */
interface TranscriptSegmentRow {
  id: string;
  transcript_id: string;
  segment_index: number;
  start_seconds: number | string;
  end_seconds: number | string;
  text: string;
}

async function fetchAllSegments(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transcriptId: string
): Promise<TranscriptSegmentRow[]> {
  const all: TranscriptSegmentRow[] = [];
  for (let from = 0; ; from += SEGMENT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transcript_segments")
      .select("*")
      .eq("transcript_id", transcriptId)
      .order("segment_index", { ascending: true })
      .range(from, from + SEGMENT_PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...((data ?? []) as TranscriptSegmentRow[]));
    if (!data || data.length < SEGMENT_PAGE_SIZE) return all;
  }
}

export async function getTranscript(episodeId: string): Promise<EpisodeTranscript | null> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return mockStore.transcripts[episodeId] ?? null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("episode_transcripts")
    .select("*")
    .eq("episode_id", episodeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const segments = await fetchAllSegments(supabase, data.id);

  return {
    id: data.id,
    episodeId: data.episode_id,
    fullText: data.full_text,
    language: data.language,
    provider: data.provider,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    segments: (segments ?? []).map(
      (s): TranscriptSegment => ({
        id: s.id,
        transcriptId: s.transcript_id,
        segmentIndex: s.segment_index,
        startSeconds: Number(s.start_seconds),
        endSeconds: Number(s.end_seconds),
        text: s.text,
      })
    ),
  };
}

export async function saveTranscript(
  episodeId: string,
  fullText: string,
  language: string | null,
  provider: string,
  segments: TranscriptSegmentInput[]
): Promise<EpisodeTranscript> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const transcriptId = mockStore.transcripts[episodeId]?.id ?? newId();
    const transcript: EpisodeTranscript = {
      id: transcriptId,
      episodeId,
      fullText,
      language,
      provider,
      createdAt: mockStore.transcripts[episodeId]?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      segments: segments.map((s) => ({
        id: newId(),
        transcriptId,
        segmentIndex: s.index,
        startSeconds: s.startSeconds,
        endSeconds: s.endSeconds,
        text: s.text,
      })),
    };
    mockStore.transcripts[episodeId] = transcript;
    return transcript;
  }

  const supabase = getSupabaseAdmin();
  const { data: transcript, error } = await supabase
    .from("episode_transcripts")
    .upsert({ episode_id: episodeId, full_text: fullText, language, provider }, { onConflict: "episode_id" })
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("transcript_segments").delete().eq("transcript_id", transcript.id);
  // Insert in chunks: a local-whisper transcript can be several thousand segments, which is a
  // multi-megabyte single request otherwise.
  for (let i = 0; i < segments.length; i += SEGMENT_PAGE_SIZE) {
    const { error: insErr } = await supabase.from("transcript_segments").insert(
      segments.slice(i, i + SEGMENT_PAGE_SIZE).map((s) => ({
        transcript_id: transcript.id,
        segment_index: s.index,
        start_seconds: s.startSeconds,
        end_seconds: s.endSeconds,
        text: s.text,
      }))
    );
    if (insErr) throw insErr;
  }

  return {
    id: transcript.id,
    episodeId: transcript.episode_id,
    fullText: transcript.full_text,
    language: transcript.language,
    provider: transcript.provider,
    createdAt: transcript.created_at,
    updatedAt: transcript.updated_at,
  };
}
