import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { getCollection, addItemToCollection } from "@/lib/repo/collections";

const BodySchema = z.object({ episodeId: z.string().min(1), note: z.string().max(2000).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const collection = await getCollection(id, user.id);
    if (!collection) return NextResponse.json({ error: "专题不存在" }, { status: 404 });
    const body = BodySchema.parse(await req.json());
    const item = await addItemToCollection(id, body.episodeId, body.note);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
