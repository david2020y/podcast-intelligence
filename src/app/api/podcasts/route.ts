import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { listShows } from "@/lib/repo/shows";
import { AddPodcastSchema } from "@/lib/validation/analysis";
import { addPodcastFromRss, addPodcastFromEpisodeUrl, addPodcastManual } from "@/lib/rss/sync";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const shows = await listShows(user.id);
    return NextResponse.json({ shows });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = AddPodcastSchema.parse(await req.json());

    const show = body.rssUrl
      ? await addPodcastFromRss(body.rssUrl, user.id)
      : body.episodeUrl
        ? await addPodcastFromEpisodeUrl(body.episodeUrl, user.id)
        : await addPodcastManual(body.manual!, user.id);

    return NextResponse.json({ show }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
