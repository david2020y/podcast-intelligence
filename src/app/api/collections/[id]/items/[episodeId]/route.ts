import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { getCollection, removeItemFromCollection } from "@/lib/repo/collections";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; episodeId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id, episodeId } = await params;
    const collection = await getCollection(id, user.id);
    if (!collection) return NextResponse.json({ error: "专题不存在" }, { status: 404 });
    await removeItemFromCollection(id, episodeId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
