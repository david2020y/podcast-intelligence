import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api/respond";
import { getDashboardStats } from "@/lib/repo/dashboard";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const stats = await getDashboardStats(user.id);
    return NextResponse.json({ stats });
  } catch (err) {
    return apiError(err);
  }
}
