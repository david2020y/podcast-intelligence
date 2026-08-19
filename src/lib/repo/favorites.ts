import { getAppMode } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock/store";

export async function toggleFavorite(userId: string, episodeId: string): Promise<boolean> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const isFav = mockStore.favorites.has(episodeId);
    if (isFav) mockStore.favorites.delete(episodeId);
    else mockStore.favorites.add(episodeId);
    return !isFav;
  }
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("favorites")
    .select("episode_id")
    .eq("user_id", userId)
    .eq("episode_id", episodeId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("user_id", userId).eq("episode_id", episodeId);
    return false;
  }
  await supabase.from("favorites").insert({ user_id: userId, episode_id: episodeId });
  return true;
}
