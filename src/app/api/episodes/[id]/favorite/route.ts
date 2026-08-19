import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { toggleFavorite } from "@/lib/repo/favorites";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const isFavorited = await toggleFavorite(user.id, id);
    return NextResponse.json({ isFavorited });
  } catch (err) {
    return apiError(err);
  }
}
