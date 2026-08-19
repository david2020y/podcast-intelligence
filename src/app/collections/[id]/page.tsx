"use client";

import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetcher, apiPatch, apiDelete, ApiError } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import type { Collection, CollectionItem } from "@/lib/types";

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const key = `/api/collections/${id}`;
  const { data, isLoading, error } = useSWR<{ collection: Collection; items: CollectionItem[] }>(key, fetcher);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center text-sm text-destructive">
        {error.status === 404 ? "专题不存在" : `加载失败：${error.message}`}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { collection, items } = data;

  function openEdit() {
    setName(collection.name);
    setDescription(collection.description ?? "");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    try {
      await apiPatch(key, { name, description });
      toast.success("已更新专题");
      setEditOpen(false);
      mutate(key);
      mutate("/api/collections");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "更新失败");
    }
  }

  async function handleRemoveItem(episodeId: string) {
    try {
      await apiDelete(`/api/collections/${id}/items/${episodeId}`);
      toast.success("已从专题移除");
      mutate(key);
      mutate("/api/collections");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <Link href="/collections" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        返回专题列表
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{collection.name}</h1>
          {collection.description && <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p>}
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="size-4" />
              编辑
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>编辑专题</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="专题名称" />
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="说明" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveEdit} disabled={!name.trim()}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <EmptyState title="专题内暂无节目" description="在单集详情页点击「收藏到专题」即可加入" />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/episodes/${item.episodeId}`} className="text-sm font-medium hover:underline">
                    {item.episode?.title ?? "（节目已删除）"}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.episode?.show?.title} · {formatDate(item.episode?.publishedAt ?? null)} · 加入于 {formatDate(item.createdAt)}
                  </p>
                  {item.note && <p className="mt-1.5 rounded-md bg-secondary/50 px-2 py-1.5 text-xs">{item.note}</p>}
                </div>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => handleRemoveItem(item.episodeId)}>
                  <X className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
