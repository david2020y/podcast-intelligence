import { z } from "zod";
import { isValidChinesePhone } from "@/lib/auth/phone";

export const SignupSchema = z.object({
  phone: z.string().refine(isValidChinesePhone, "请输入正确的手机号"),
  password: z.string().min(6, "密码至少 6 位"),
  inviteCode: z.string().trim().optional(),
});
