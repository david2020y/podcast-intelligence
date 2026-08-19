import { getAppMode, DEMO_USER_ID } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore, nowIso } from "@/lib/mock/store";

export interface AdminUser {
  id: string;
  phone: string | null;
  createdAt: string;
  addedShowCount: number;
  subscriptionCount: number;
}

/** Read-only roster for the admin backend — who's registered, and how much they've used the
 * app (shows they've added, podcasts they've subscribed to). No write operations here by
 * design: account changes (password resets, bans) go through Supabase directly for now. */
export async function listUsersForAdmin(): Promise<AdminUser[]> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return [
      {
        id: DEMO_USER_ID,
        phone: null,
        createdAt: nowIso(),
        addedShowCount: mockStore.shows.length,
        subscriptionCount: mockStore.shows.length,
      },
    ];
  }

  const supabase = getSupabaseAdmin();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, phone, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: shows, error: showsError } = await supabase
    .from("podcast_shows")
    .select("added_by_user_id")
    .not("added_by_user_id", "is", null);
  if (showsError) throw showsError;
  const addedShowCountByUserId = new Map<string, number>();
  for (const row of shows ?? []) {
    const userId = row.added_by_user_id as string;
    addedShowCountByUserId.set(userId, (addedShowCountByUserId.get(userId) ?? 0) + 1);
  }

  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "paused"]);
  if (subsError) throw subsError;
  const subscriptionCountByUserId = new Map<string, number>();
  for (const row of subs ?? []) {
    const userId = row.user_id as string;
    subscriptionCountByUserId.set(userId, (subscriptionCountByUserId.get(userId) ?? 0) + 1);
  }

  return (profiles ?? []).map((row) => ({
    id: row.id as string,
    phone: (row.phone as string) ?? null,
    createdAt: row.created_at as string,
    addedShowCount: addedShowCountByUserId.get(row.id as string) ?? 0,
    subscriptionCount: subscriptionCountByUserId.get(row.id as string) ?? 0,
  }));
}
