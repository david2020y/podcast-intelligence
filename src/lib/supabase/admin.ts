import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Row shapes are mapped by hand in src/lib/repo/* (see src/lib/supabase/types.ts for the
// reference schema), so the client is intentionally left untyped here rather than fighting
// supabase-js's generic Database constraint for a schema this small.
let client: SupabaseClient | null = null;

/**
 * Service-role client for server-only, trusted operations (RSS sync, transcription,
 * AI analysis) that must bypass RLS. Never import this from client components.
 */
export function getSupabaseAdmin() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 未配置：缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  }
  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
