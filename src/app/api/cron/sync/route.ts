import { NextRequest, NextResponse } from "next/server";
import { CRON_SECRET, DEMO_USER_ID } from "@/lib/config";
import { apiError } from "@/lib/api/respond";
import { syncAllShows } from "@/lib/rss/sync";

/**
 * Cron-safe sync endpoint for Vercel Cron (or any scheduler). Protected by CRON_SECRET:
 * pass it as `Authorization: Bearer <secret>` (Vercel Cron's default) or `?secret=<secret>`.
 */
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  try {
    if (!CRON_SECRET) {
      return NextResponse.json({ error: "服务端未配置 CRON_SECRET，已拒绝访问" }, { status: 500 });
    }
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    const provided = authHeader?.replace(/^Bearer\s+/i, "") ?? querySecret;
    if (provided !== CRON_SECRET) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const result = await syncAllShows(DEMO_USER_ID);
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
