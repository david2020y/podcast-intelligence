"use client";

import useSWR from "swr";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetcher } from "@/lib/fetcher";

type AiProviderId = "lmstudio" | "anthropic" | "deepseek";
type TranscriptionProviderId = "local-whisper" | "assemblyai" | "groq" | "openai";

interface ModeInfo {
  mockMode: boolean;
  hasSupabase: boolean;
  hasAnthropicKey: boolean;
  aiProvider: AiProviderId | null;
  aiModel: string | null;
  hasTranscriptionKey: boolean;
  transcriptionProvider: TranscriptionProviderId | null;
  transcriptionModel: string | null;
  cronConfigured: boolean;
  webhookConfigured: boolean;
  supabaseUrl: string | null;
  localAi: boolean;
  localWhisper: boolean;
}

const TRANSCRIPTION_PROVIDER_LABEL: Record<TranscriptionProviderId, string> = {
  "local-whisper": "本地 whisper.cpp",
  assemblyai: "AssemblyAI",
  groq: "Groq",
  openai: "OpenAI",
};

const AI_PROVIDER_LABEL: Record<AiProviderId, string> = {
  lmstudio: "本地 LM Studio",
  anthropic: "Anthropic Claude",
  deepseek: "DeepSeek",
};

export default function SettingsPage() {
  const { data, isLoading } = useSWR<ModeInfo>("/api/mode", fetcher);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看运行模式与服务连接状态。密钥仅通过服务器环境变量读取，此处不会显示完整密钥。</p>
      </div>

      {isLoading && <Skeleton className="h-96 w-full" />}

      {data && (
        <>
          {data.mockMode && (
            <Alert>
              <Info className="size-4" />
              <AlertTitle>当前处于 Mock Mode</AlertTitle>
              <AlertDescription>
                未检测到 Supabase 配置，系统正在使用内置演示数据。配置好环境变量并重启服务后会自动切换为真实数据。
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">运行模式</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Mock Mode" value={data.mockMode ? "已启用（演示数据）" : "已关闭（使用真实数据）"} ok={!data.mockMode} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">数据存储</CardTitle>
              <CardDescription>Supabase（PostgreSQL + Auth + RLS + Storage）</CardDescription>
            </CardHeader>
            <CardContent>
              <Row label="连接状态" value={data.hasSupabase ? "已连接" : "未配置"} ok={data.hasSupabase} />
              {data.supabaseUrl && <Row label="项目地址" value={data.supabaseUrl} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI 分析</CardTitle>
              <CardDescription>本地 LM Studio 优先；未配置或调用失败时自动回退到 Claude / DeepSeek</CardDescription>
            </CardHeader>
            <CardContent>
              <Row
                label="当前后端"
                value={data.aiProvider ? `${AI_PROVIDER_LABEL[data.aiProvider]}` : "未配置（使用 Mock 分析）"}
                ok={!!data.aiProvider}
              />
              <Row label="本地推理" value={data.localAi ? "已启用（LM Studio）" : "未启用（此进程不在模型所在机器上）"} ok={data.localAi} />
              {data.aiModel && <Row label="模型" value={data.aiModel} />}
              <Row label="默认分析语言" value="中文（zh-CN）" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">音频转录</CardTitle>
              <CardDescription>本地 whisper.cpp 优先；未配置或调用失败时自动回退到 AssemblyAI / Groq / OpenAI</CardDescription>
            </CardHeader>
            <CardContent>
              <Row
                label="当前后端"
                value={
                  data.transcriptionProvider
                    ? TRANSCRIPTION_PROVIDER_LABEL[data.transcriptionProvider]
                    : "未配置（使用 Mock 转录）"
                }
                ok={data.hasTranscriptionKey}
              />
              <Row label="本地转录" value={data.localWhisper ? "已启用（whisper.cpp）" : "未启用（此进程不在模型所在机器上）"} ok={data.localWhisper} />
              {data.transcriptionProvider === "local-whisper" ? (
                <>
                  <Row label="单文件大小限制" value="无限制（本地推理，不需要上传）" />
                  <Row label="处理方式" value="同步，调用本机 whisper-cli" />
                </>
              ) : data.transcriptionProvider === "assemblyai" ? (
                <>
                  <Row label="单文件大小限制" value="5GB / 最长 10 小时" />
                  <Row label="处理方式" value="异步（Webhook 回调），支持长音频" />
                  <Row label="Webhook 回调地址" value={data.webhookConfigured ? "已就绪" : "未就绪（缺少 APP_BASE_URL 或 ASSEMBLYAI_WEBHOOK_SECRET）"} ok={data.webhookConfigured} />
                </>
              ) : (
                <>
                  {data.transcriptionModel && <Row label="模型" value={data.transcriptionModel} />}
                  <Row label="单文件大小限制" value="25MB（Whisper API 限制）" />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">自动同步</CardTitle>
              <CardDescription>Vercel Cron 定时同步接口</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row label="CRON_SECRET" value={data.cronConfigured ? "已配置" : "未配置"} ok={data.cronConfigured} />
              <p className="text-xs text-muted-foreground">
                接口地址：<code className="rounded bg-secondary px-1 py-0.5">/api/cron/sync</code>，请在 Vercel Cron 中配置定时请求，并通过{" "}
                <code className="rounded bg-secondary px-1 py-0.5">Authorization: Bearer CRON_SECRET</code> 请求头鉴权。
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {ok === true && <CheckCircle2 className="size-3.5 text-emerald-500" />}
        {ok === false && <XCircle className="size-3.5 text-muted-foreground" />}
        {value}
      </span>
    </div>
  );
}
