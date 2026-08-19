import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { listCollections, createCollection } from "@/lib/repo/collections";
import { CreateCollectionSchema } from "@/lib/validation/analysis";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const collections = await listCollections(user.id);
    return NextResponse.json({ collections });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = CreateCollectionSchema.parse(await req.json());
    const collection = await createCollection(user.id, body.name, body.description);
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
