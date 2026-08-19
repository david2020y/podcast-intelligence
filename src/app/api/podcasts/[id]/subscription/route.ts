import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { setSubscription } from "@/lib/repo/shows";

const BodySchema = z.object({ status: z.enum(["active", "paused"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const { status } = BodySchema.parse(await req.json());
    await setSubscription(user.id, id, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
