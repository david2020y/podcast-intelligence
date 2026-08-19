import { getAppMode } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore, attachEpisodeExtras } from "@/lib/mock/store";
import type { DashboardStats } from "@/lib/types";
import { listMyShows } from "@/lib/repo/shows";
import { listRecentEpisodes, countEpisodesByStatus } from "@/lib/repo/episodes";

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const { mockMode } = getAppMode();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  if (mockMode) {
    const shows = await listMyShows(userId);
    const episodes = mockStore.episodes;
    const newThisWeek = episodes.filter((e) => e.createdAt >= weekAgo).length;
    const pendingTranscription = episodes.filter((e) => e.transcriptStatus === "pending").length;
    const completedAnalyses = episodes.filter((e) => e.analysisStatus === "completed").length;
    const recentAnalyses = episodes
      .filter((e) => e.analysisStatus === "completed")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)
      .map(attachEpisodeExtras);
    const recentlyUpdatedShows = shows.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

    return {
      subscribedShowCount: shows.filter((s) => s.subscriptionStatus === "active").length,
      totalEpisodeCount: episodes.length,
      newEpisodesThisWeek: newThisWeek,
      pendingTranscriptionCount: pendingTranscription,
      completedAnalysisCount: completedAnalyses,
      recentlyUpdatedShows,
      recentAnalyses,
    };
  }

  const supabase = getSupabaseAdmin();
  const shows = await listMyShows(userId);
  const subscribedShowCount = shows.filter((s) => s.subscriptionStatus === "active").length;

  const { count: totalEpisodeCount } = await supabase
    .from("podcast_episodes")
    .select("id", { count: "exact", head: true });

  const { count: newEpisodesThisWeek } = await supabase
    .from("podcast_episodes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekAgo);

  const pendingTranscriptionCount = await countEpisodesByStatus("transcript_status", "pending");
  const completedAnalysisCount = await countEpisodesByStatus("analysis_status", "completed");

  const recentAnalyses = (await listRecentEpisodes(50, userId)).filter((e) => e.analysisStatus === "completed").slice(0, 5);
  const recentlyUpdatedShows = shows.slice(0, 5);

  return {
    subscribedShowCount,
    totalEpisodeCount: totalEpisodeCount ?? 0,
    newEpisodesThisWeek: newEpisodesThisWeek ?? 0,
    pendingTranscriptionCount,
    completedAnalysisCount,
    recentlyUpdatedShows,
    recentAnalyses,
  };
}
