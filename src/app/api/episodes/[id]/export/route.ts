import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { getEpisodeById } from "@/lib/repo/episodes";
import { getAnalysis } from "@/lib/repo/analyses";
import { buildEpisodeMarkdown, slugifyFilename } from "@/lib/export/markdown";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const episode = await getEpisodeById(id, user.id);
    if (!episode) return NextResponse.json({ error: "单集不存在" }, { status: 404 });
    const analysis = await getAnalysis(id);

    const markdown = buildEpisodeMarkdown(episode, episode.show ?? null, analysis, []);
    const filename = `${slugifyFilename(episode.title)}.md`;

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
