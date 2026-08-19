"use client";

import useSWR from "swr";
import Link from "next/link";
import { Rss, Headphones, Clock, Sparkles, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { fetcher } from "@/lib/fetcher";
import type { DashboardStats } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

export default function DashboardPage() {
  const { data, isLoading, error } = useSWR<{ stats: DashboardStats }>("/api/dashboard", fetcher);
  const stats = data?.stats;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">播客情报库概览</p>
      </div>

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">加载失败：{error.message}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Rss} label="已订阅播客" value={stats?.subscribedShowCount} loading={isLoading} />
        <StatCard icon={Headphones} label="已收集单集" value={stats?.totalEpisodeCount} loading={isLoading} />
        <StatCard icon={ArrowUpRight} label="本周新增" value={stats?.newEpisodesThisWeek} loading={isLoading} />
        <StatCard icon={Clock} label="等待转录" value={stats?.pendingTranscriptionCount} loading={isLoading} />
        <StatCard icon={Sparkles} label="已完成分析" value={stats?.completedAnalysisCount} loading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近更新的播客</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!isLoading && (stats?.recentlyUpdatedShows.length ?? 0) === 0 && (
              <EmptyState title="暂无订阅播客" description="前往播客页面添加你的第一个 RSS 订阅" />
            )}
            {stats?.recentlyUpdatedShows.map((show) => (
              <Link
                key={show.id}
                href={`/podcasts/${show.id}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 -mx-2 transition-colors hover:bg-secondary/60"
              >
                <img
                  src={show.coverUrl ?? "/podcast-placeholder.svg"}
                  alt=""
                  className="size-10 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{show.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {show.author ?? "未知作者"} · 更新于 {formatRelativeTime(show.updatedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近生成的分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!isLoading && (stats?.recentAnalyses.length ?? 0) === 0 && (
              <EmptyState title="暂无已完成的分析" description="对单集发起 AI 分析后会显示在这里" />
            )}
            {stats?.recentAnalyses.map((ep) => (
              <Link
                key={ep.id}
                href={`/episodes/${ep.id}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 -mx-2 transition-colors hover:bg-secondary/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ep.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{ep.show?.title}</p>
                </div>
                <StatusBadge status={ep.analysisStatus} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number;
  loading: boolean;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span className="text-xs">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-12" />
        ) : (
          <>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value ?? 0}</p>
            <div className="stat-meter mt-2" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
