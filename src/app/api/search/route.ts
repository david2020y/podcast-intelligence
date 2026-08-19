import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { SearchQuerySchema } from "@/lib/validation/analysis";
import { searchEpisodes } from "@/lib/repo/search";

export async function GET(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const filters = SearchQuerySchema.parse(params);
    const results = await searchEpisodes(user.id, filters);
    return NextResponse.json({ results });
  } catch (err) {
    return apiError(err);
  }
}
