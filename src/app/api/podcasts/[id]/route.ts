import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { getShowById } from "@/lib/repo/shows";
import { listEpisodesByShow } from "@/lib/repo/episodes";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const show = await getShowById(id, user.id);
    if (!show) return NextResponse.json({ error: "播客不存在" }, { status: 404 });
    const episodes = await listEpisodesByShow(id);
    return NextResponse.json({ show, episodes });
  } catch (err) {
    return apiError(err);
  }
}
