"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Loader2, Search, Store, Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import { toast } from "sonner";
import type { PodcastShow } from "@/lib/types";

// Preferred display order; any other category the admin introduces later still shows up,
// just sorted after these.
const CATEGORY_ORDER = ["科技", "宏观经济", "投资", "加密货币"];

export default function MarketplacePage() {
  const { data, isLoading, error } = useSWR<{ shows: PodcastShow[] }>("/api/marketplace", fetcher);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const shows = useMemo(() => data?.shows ?? [], [data]);
  const categories = useMemo(() => {
    const present = Array.from(new Set(shows.map((s) => s.marketplaceCategory).filter(Boolean))) as string[];
    return present.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [shows]);

  const filtered = shows.filter((s) => {
    const matchesQuery =
      !query || s.title.toLowerCase().includes(query.toLowerCase()) || (s.author ?? "").toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || s.marketplaceCategory === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">播客市场</h1>
        <p className="mt-1 text-sm text-muted-foreground">精选整理的播客，一键加入「我的播客」</p>
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
          icon={Store}
          title={shows.length === 0 ? "播客市场暂时还是空的" : "没有匹配的播客"}
          description={shows.length === 0 ? "整理好的播客上架后会显示在这里" : "试试调整搜索或分类筛选"}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((show) => (
          <MarketplaceCard key={show.id} show={show} />
        ))}
      </div>
    </div>
  );
}

function MarketplaceCard({ show }: { show: PodcastShow }) {
  const [loading, setLoading] = useState(false);
  const subscribed = show.subscriptionStatus === "active" || show.subscriptionStatus === "paused";

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await apiPost(`/api/podcasts/${show.id}/subscription`, { status: "active" });
      toast.success(`已加入《${show.title}》到我的播客`);
      mutate("/api/marketplace");
      mutate("/api/podcasts");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "添加失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Link href={`/podcasts/${show.id}`}>
      <Card className="h-full transition-colors hover:border-foreground/20">
        <CardContent className="flex gap-3">
          <img src={show.coverUrl ?? "/podcast-placeholder.svg"} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium">{show.title}</p>
            <p className="truncate text-xs text-muted-foreground">{show.author ?? "未知作者"}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {show.marketplaceCategory && (
                <Badge variant="secondary" className="text-[11px] font-normal">
                  {show.marketplaceCategory}
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground">{show.episodeCount ?? 0} 集</span>
            </div>
            <div className="flex items-center justify-end pt-1">
              <Button size="sm" variant={subscribed ? "secondary" : "default"} className="h-7 px-2 text-xs" onClick={handleAdd} disabled={loading || subscribed}>
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : subscribed ? (
                  <Check className="size-3.5" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {subscribed ? "已添加" : "加入我的播客"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
