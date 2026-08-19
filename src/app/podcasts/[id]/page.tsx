"use client";

import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { RefreshCw, Loader2, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import { formatDate, formatDuration, formatRelativeTime } from "@/lib/format";
import type { PodcastEpisode, PodcastShow } from "@/lib/types";

export default function PodcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const key = `/api/podcasts/${id}`;
  const { data, isLoading, error } = useSWR<{ show: PodcastShow; episodes: PodcastEpisode[] }>(key, fetcher);
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const { job } = await apiPost<{ job: { addedCount: number; updatedCount: number; failedCount: number } }>(
        `/api/podcasts/${id}/sync`
      );
      toast.success(`同步完成：新增 ${job.addedCount} 集，更新 ${job.updatedCount} 集${job.failedCount ? `，失败 ${job.failedCount} 集` : ""}`);
      mutate(key);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSubscriptionToggle(checked: boolean) {
    try {
      await apiPost(`/api/podcasts/${id}/subscription`, { status: checked ? "active" : "paused" });
      mutate(key);
      mutate("/api/podcasts");
      toast.success(checked ? "已恢复订阅" : "已取消订阅");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center text-sm text-destructive">
        {error.status === 404 ? "播客不存在" : `加载失败：${error.message}`}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { show, episodes } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <Link href="/podcasts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        返回播客列表
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <img src={show.coverUrl ?? "/podcast-placeholder.svg"} alt="" className="size-24 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-lg font-semibold">{show.title}</h1>
                <p className="text-sm text-muted-foreground">{show.author ?? "未知作者"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{show.subscriptionStatus === "active" ? "已订阅" : "已暂停"}</span>
                <Switch checked={show.subscriptionStatus === "active"} onCheckedChange={handleSubscriptionToggle} />
              </div>
            </div>
            {show.description && <p className="text-sm text-muted-foreground">{show.description}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {show.category && <Badge variant="secondary">{show.category}</Badge>}
              {show.language && <Badge variant="outline">{show.language}</Badge>}
              <span className="text-xs text-muted-foreground">
                {show.lastSyncedAt ? `最近同步 ${formatRelativeTime(show.lastSyncedAt)}` : "尚未同步"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
              {show.rssUrl && (
                <a href={show.rssUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  RSS <ExternalLink className="size-3" />
                </a>
              )}
              {show.websiteUrl && (
                <a href={show.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  官网 <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">单集（{episodes.length}）</h2>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || !show.rssUrl}>
          {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          批量同步
        </Button>
      </div>

      {episodes.length === 0 ? (
        <EmptyState title="暂无单集" description={show.rssUrl ? "点击「批量同步」拉取历史节目" : "该播客为手动添加，暂无单集数据"} />
      ) : (
        <div className="space-y-2">
          {episodes.map((ep) => (
            <Link key={ep.id} href={`/episodes/${ep.id}`}>
              <Card className="transition-colors hover:border-foreground/20">
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ep.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(ep.publishedAt)} · {formatDuration(ep.durationSeconds)}
                      {ep.guests.length > 0 ? ` · 嘉宾：${ep.guests.join("、")}` : ""}
                    </p>
                  </div>
                  <div className="hidden gap-1.5 sm:flex">
                    <StatusBadge status={ep.transcriptStatus} label="转录" />
                    <StatusBadge status={ep.analysisStatus} label="分析" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
