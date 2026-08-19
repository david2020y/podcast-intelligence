"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Search as SearchIcon, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { fetcher } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import type { PodcastShow, SearchResultItem } from "@/lib/types";

const MATCH_LABELS: Record<string, string> = {
  episode: "标题/简介",
  show: "播客信息",
  guest: "嘉宾",
  analysis: "AI 分析",
  transcript: "转录全文",
};

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待处理" },
  { value: "processing", label: "处理中" },
  { value: "completed", label: "已完成" },
  { value: "failed", label: "失败" },
];

export default function SearchPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [showId, setShowId] = useState("all");
  const [status, setStatus] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data: showsData } = useSWR<{ shows: PodcastShow[] }>("/api/podcasts", fetcher);

  const searchParams = useMemo(() => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (showId !== "all") p.set("showId", showId);
    if (status !== "all") p.set("processingStatus", status);
    if (favoritesOnly) p.set("favoritesOnly", "true");
    return p.toString();
  }, [query, showId, status, favoritesOnly]);

  const { data, isLoading } = useSWR<{ results: SearchResultItem[] }>(`/api/search?${searchParams}`, fetcher);

  const results = data?.results ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">全局搜索</h1>
        <p className="mt-1 text-sm text-muted-foreground">跨标题、简介、嘉宾、转录全文、AI 摘要与核心观点搜索</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="搜索标题、摘要、转录内容、嘉宾…"
            className="pl-8"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={showId} onValueChange={setShowId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="全部播客" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部播客</SelectItem>
              {showsData?.shows.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Star className={`size-4 ${favoritesOnly ? "fill-current" : ""}`} />
            仅看收藏
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!isLoading && results.length === 0 && (
        <EmptyState
          title={query ? "没有找到匹配结果" : "输入关键词开始搜索"}
          description={query ? "试试更换关键词或调整筛选条件" : "支持搜索标题、简介、嘉宾、转录全文与 AI 分析内容"}
        />
      )}

      <div className="space-y-2">
        {results.map((r) => (
          <Link key={r.episode.id} href={`/episodes/${r.episode.id}`}>
            <Card className="transition-colors hover:border-foreground/20">
              <CardContent className="space-y-1.5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{r.episode.title}</p>
                  {r.episode.isFavorited && <Star className="size-3.5 shrink-0 fill-current text-amber-500" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.episode.show?.title} · {formatDate(r.episode.publishedAt)}
                </p>
                {r.snippet && <p className="line-clamp-2 text-xs text-muted-foreground">{r.snippet}</p>}
                {r.matchedIn.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {r.matchedIn.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px] font-normal">
                        匹配：{MATCH_LABELS[m] ?? m}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
