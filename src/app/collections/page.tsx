"use client";

import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";
import { fetcher } from "@/lib/fetcher";
import { formatRelativeTime } from "@/lib/format";
import type { Collection } from "@/lib/types";

export default function CollectionsPage() {
  const { data, isLoading, error } = useSWR<{ collections: Collection[] }>("/api/collections", fetcher);
  const collections = data?.collections ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">专题收藏</h1>
          <p className="mt-1 text-sm text-muted-foreground">按主题整理你收藏的播客单集</p>
        </div>
        <CreateCollectionDialog onCreated={() => mutate("/api/collections")} />
      </div>

      {error && <p className="text-sm text-destructive">加载失败：{error.message}</p>}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!isLoading && collections.length === 0 && (
        <EmptyState icon={Bookmark} title="还没有专题" description="创建专题来归类你正在研究的主题，例如 BTC、AI 投资" />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <Link key={c.id} href={`/collections/${c.id}`}>
            <Card className="h-full transition-colors hover:border-foreground/20">
              <CardContent className="space-y-1.5">
                <p className="text-sm font-medium">{c.name}</p>
                {c.description && <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                  <span>{c.itemCount ?? 0} 期节目</span>
                  <span>更新于 {formatRelativeTime(c.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
