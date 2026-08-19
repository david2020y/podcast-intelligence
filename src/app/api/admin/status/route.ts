import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/auth";

// Not gated by requireAdmin: this only tells the client whether to show the "后台管理" nav
// link, never anything sensitive. The page and the write APIs behind it still check
// independently — this can't be used to grant access, only to decide what to render.
export async function GET() {
  const isAdmin = await isCurrentUserAdmin();
  return NextResponse.json({ isAdmin });
}
