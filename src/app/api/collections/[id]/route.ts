import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { getCollection, updateCollection, deleteCollection, listCollectionItems } from "@/lib/repo/collections";

const UpdateSchema = z.object({ name: z.string().min(1).max(80).optional(), description: z.string().max(500).optional() });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const collection = await getCollection(id, user.id);
    if (!collection) return NextResponse.json({ error: "专题不存在" }, { status: 404 });
    const items = await listCollectionItems(id);
    return NextResponse.json({ collection, items });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const patch = UpdateSchema.parse(await req.json());
    await updateCollection(id, user.id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await deleteCollection(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
