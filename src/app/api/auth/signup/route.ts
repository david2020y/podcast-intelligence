import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/respond";
import { SignupSchema } from "@/lib/validation/auth";
import { phoneToSyntheticEmail } from "@/lib/auth/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAppMode, SIGNUP_INVITE_CODE } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const { mockMode } = getAppMode();
    if (mockMode) {
      return NextResponse.json({ error: "Mock Mode 下无需注册，刷新页面即可直接体验演示数据" }, { status: 400 });
    }

    const { phone, password, inviteCode } = SignupSchema.parse(await req.json());

    if (SIGNUP_INVITE_CODE && inviteCode !== SIGNUP_INVITE_CODE) {
      return NextResponse.json({ error: "邀请码不正确" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.createUser({
      email: phoneToSyntheticEmail(phone),
      password,
      email_confirm: true,
      user_metadata: { phone },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already been registered")) {
        return NextResponse.json({ error: "该手机号已注册，请直接登录" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
