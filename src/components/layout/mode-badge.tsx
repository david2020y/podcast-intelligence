"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AppMode } from "@/lib/types";

export function ModeBadge() {
  const [mode, setMode] = useState<AppMode | null>(null);

  useEffect(() => {
    fetch("/api/mode")
      .then((r) => r.json())
      .then(setMode)
      .catch(() => {});
  }, []);

  if (!mode) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={mode.mockMode ? "secondary" : "outline"} className="gap-1.5 font-normal">
          <span className={`size-1.5 rounded-full ${mode.mockMode ? "bg-amber-500" : "bg-emerald-500"}`} />
          {mode.mockMode ? "Mock Mode 演示数据" : "已连接 Supabase"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">
        {mode.mockMode
          ? "未检测到 Supabase / AI 密钥，当前展示的是内置演示数据。配置环境变量后重启即可连接真实数据。"
          : `Supabase 已连接 · Claude ${mode.hasAnthropicKey ? "已配置" : "未配置"} · 转录 ${mode.hasTranscriptionKey ? "已配置" : "未配置"}`}
      </TooltipContent>
    </Tooltip>
  );
}
