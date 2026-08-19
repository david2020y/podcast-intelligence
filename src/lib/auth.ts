import { getAppMode, isAdminPhone, DEMO_USER_ID } from "@/lib/config";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
  phone: string | null;
}

/** Resolves the acting user for the current request: real session, or the demo user in Mock Mode. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const mode = getAppMode();
  if (mode.mockMode) {
    return { id: DEMO_USER_ID, email: "demo@podcast-intelligence.local", phone: null };
  }
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    phone: (data.user.user_metadata?.phone as string | undefined) ?? null,
  };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  return user;
}

/** True if the current user may access /admin/* and its APIs. In Mock Mode there's no real
 * login (the whole app already runs as a single implicit demo user), so admin access is left
 * open there too, matching every other page's behavior in that mode. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { mockMode } = getAppMode();
  if (mockMode) return true;
  const user = await getCurrentUser();
  return isAdminPhone(user?.phone ?? null);
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireCurrentUser();
  const { mockMode } = getAppMode();
  if (!mockMode && !isAdminPhone(user.phone)) {
    throw new AdminRequiredError();
  }
  return user;
}

export class AuthRequiredError extends Error {
  constructor() {
    super("需要登录后才能执行此操作");
    this.name = "AuthRequiredError";
  }
}

export class AdminRequiredError extends Error {
  constructor() {
    super("没有权限访问后台管理");
    this.name = "AdminRequiredError";
  }
}
