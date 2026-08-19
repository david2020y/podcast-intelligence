import { getAppMode, DEMO_USER_ID } from "@/lib/config";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/** Resolves the acting user for the current request: real session, or the demo user in Mock Mode. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const mode = getAppMode();
  if (mode.mockMode) {
    return { id: DEMO_USER_ID, email: "demo@podcast-intelligence.local" };
  }
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  return user;
}

export class AuthRequiredError extends Error {
  constructor() {
    super("需要登录后才能执行此操作");
    this.name = "AuthRequiredError";
  }
}
