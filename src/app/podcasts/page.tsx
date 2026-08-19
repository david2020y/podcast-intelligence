"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { RefreshCw, Loader2, Search, Rss } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { AddPodcastDialog } from "@/components/podcasts/add-podcast-dialog";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";
import type { PodcastShow } from "@/lib/types";

export default function PodcastsPage() {
  const { data, isLoading, error } = useSWR<{ shows: PodcastShow[] }>("/api/podcasts", fetcher);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [syncingAll, setSyncingAll] = useState(false);

  const shows = useMemo(() => data?.shows ?? [], [data]);
  const categories = useMemo(() => Array.from(new Set(shows.map((s) => s.category).filter(Boolean))) as string[], [shows]);

  const filtered = shows.filter((s) => {
    const matchesQuery =
      !query || s.title.toLowerCase().includes(query.toLowerCase()) || (s.author ?? "").toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || s.category === category;
    return matchesQuery && matchesCategory;
  });

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      const result = await apiPost<{ results: Array<{ ok: boolean }> }>("/api/sync/all");
      const okCount = result.results.filter((r) => r.ok).length;
      toast.success(`同步完成：${okCount}/${result.results.length} 个播客成功`);
      mutate("/api/podcasts");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "同步失败");
    } finally {
      setSyncingAll(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">我的播客</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理你订阅的播客与 RSS 同步，其他人看不到你在这里添加的内容</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncAll} disabled={syncingAll || shows.length === 0}>
            {syncingAll ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            全部同步
          </Button>
          <AddPodcastDialog onAdded={() => mutate("/api/podcasts")} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索播客名称或作者" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">加载失败：{error.message}</p>}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Rss}
          title={shows.length === 0 ? "还没有订阅任何播客" : "没有匹配的播客"}
          description={
            shows.length === 0
              ? "点击右上角「添加播客」粘贴 RSS 地址，或去「播客市场」逛逛已经整理好的节目"
              : "试试调整搜索或分类筛选"
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((show) => (
          <PodcastCard key={show.id} show={show} />
        ))}
      </div>
    </div>
  );
}

function PodcastCard({ show }: { show: PodcastShow }) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSyncing(true);
    try {
      const { job } = await apiPost<{ job: { addedCount: number; updatedCount: number } }>(`/api/podcasts/${show.id}/sync`);
      toast.success(`同步完成：新增 ${job.addedCount} 集，更新 ${job.updatedCount} 集`);
      mutate("/api/podcasts");
      mutate(`/api/podcasts/${show.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Link href={`/podcasts/${show.id}`}>
      <Card className="h-full transition-colors hover:border-foreground/20">
        <CardContent className="flex gap-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
            <img src={show.coverUrl ?? "/podcast-placeholder.svg"} alt="" className="size-full object-cover" />
            <div className="waveform-accent" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium">{show.title}</p>
            <p className="truncate text-xs text-muted-foreground">{show.author ?? "未知作者"}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {show.category && (
                <Badge variant="secondary" className="text-[11px] font-normal">
                  {show.category}
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground">{show.episodeCount ?? 0} 集</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground">
                {show.lastSyncedAt ? `同步于 ${formatRelativeTime(show.lastSyncedAt)}` : "尚未同步"}
              </span>
              <Button size="icon" variant="ghost" className="size-6" onClick={handleSync} disabled={syncing || !show.rssUrl}>
                {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
