import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { listUsersForAdmin } from "@/lib/repo/users";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listUsersForAdmin();
    return NextResponse.json({ users });
  } catch (err) {
    return apiError(err);
  }
}
