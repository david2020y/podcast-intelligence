import { getAppMode } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore, newId, nowIso } from "@/lib/mock/store";
import type { EpisodeAnalysisRecord } from "@/lib/types";
import type { EpisodeAnalysis } from "@/lib/validation/analysis";

export async function getAnalysis(episodeId: string): Promise<EpisodeAnalysisRecord | null> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return mockStore.analyses[episodeId] ?? null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("episode_analyses")
    .select("*")
    .eq("episode_id", episodeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data);
}

function mapRow(data: Record<string, unknown>): EpisodeAnalysisRecord {
  return {
    id: data.id as string,
    episodeId: data.episode_id as string,
    oneLiner: data.one_liner as string,
    summary: data.summary as string,
    topicMap: (data.topic_map as EpisodeAnalysisRecord["topicMap"]) ?? null,
    keyPoints: data.key_points as string[],
    keyData: data.key_data as string[],
    guestConclusions: data.guest_conclusions as string[],
    people: data.people as string[],
    entities: data.entities as EpisodeAnalysisRecord["entities"],
    tags: data.tags as string[],
    keyQuotes: data.key_quotes as EpisodeAnalysisRecord["keyQuotes"],
    openQuestions: data.open_questions as string[],
    model: (data.model as string) ?? "unknown",
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function saveAnalysis(episodeId: string, analysis: EpisodeAnalysis, model: string): Promise<EpisodeAnalysisRecord> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const record: EpisodeAnalysisRecord = {
      id: mockStore.analyses[episodeId]?.id ?? newId(),
      episodeId,
      ...analysis,
      model,
      createdAt: mockStore.analyses[episodeId]?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    mockStore.analyses[episodeId] = record;
    await syncTagsMock(episodeId, analysis.tags);
    return record;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("episode_analyses")
    .upsert(
      {
        episode_id: episodeId,
        one_liner: analysis.oneLiner,
        summary: analysis.summary,
        topic_map: analysis.topicMap,
        key_points: analysis.keyPoints,
        key_data: analysis.keyData,
        guest_conclusions: analysis.guestConclusions,
        people: analysis.people,
        entities: analysis.entities,
        tags: analysis.tags,
        key_quotes: analysis.keyQuotes,
        open_questions: analysis.openQuestions,
        model,
      },
      { onConflict: "episode_id" }
    )
    .select("*")
    .single();
  if (error) throw error;

  await syncTagsReal(episodeId, analysis.tags);
  return mapRow(data);
}

async function syncTagsMock(episodeId: string, tags: string[]): Promise<void> {
  const ep = mockStore.episodes.find((e) => e.id === episodeId);
  if (ep) ep.tags = tags;
}

async function syncTagsReal(episodeId: string, tags: string[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("episode_tags").delete().eq("episode_id", episodeId);
  for (const name of tags) {
    const { data: tag, error } = await supabase
      .from("tags")
      .upsert({ name }, { onConflict: "name" })
      .select("id")
      .single();
    if (error) continue;
    await supabase.from("episode_tags").insert({ episode_id: episodeId, tag_id: tag.id });
  }
}
