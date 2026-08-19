"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { isValidChinesePhone, phoneToSyntheticEmail } from "@/lib/auth/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

function friendlyAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("Invalid login credentials")) return "手机号或密码不正确";
  return message || "操作失败，请重试";
}

export default function LoginPage() {
  function goNext() {
    const next = new URLSearchParams(window.location.search).get("next") || "/";
    window.location.href = next;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>播客情报库</CardTitle>
          <CardDescription>手机号 + 密码登录</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="signup">注册</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <LoginForm onSuccess={goNext} />
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <SignupForm onSuccess={goNext} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidChinesePhone(phone)) {
      toast.error("请输入正确的手机号");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToSyntheticEmail(phone),
        password,
      });
      if (error) throw error;
      onSuccess();
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-phone">手机号</Label>
        <Input
          id="login-phone"
          type="tel"
          inputMode="numeric"
          placeholder="13800001111"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value.trim())}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">密码</Label>
        <Input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "登录中…" : "登录"}
      </Button>
    </form>
  );
}

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidChinesePhone(phone)) {
      toast.error("请输入正确的手机号");
      return;
    }
    if (password.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, inviteCode: inviteCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "注册失败");

      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToSyntheticEmail(phone),
        password,
      });
      if (error) throw error;
      toast.success("注册成功");
      onSuccess();
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-phone">手机号</Label>
        <Input
          id="signup-phone"
          type="tel"
          inputMode="numeric"
          placeholder="13800001111"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value.trim())}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">密码</Label>
        <Input id="signup-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-confirm">确认密码</Label>
        <Input
          id="signup-confirm"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-invite">邀请码（如有）</Label>
        <Input id="signup-invite" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "注册中…" : "注册"}
      </Button>
    </form>
  );
}
