"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Loader2, ShieldCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { fetcher, apiPatch, ApiError } from "@/lib/fetcher";
import { toast } from "sonner";
import type { PodcastShow } from "@/lib/types";

interface AdminShow extends PodcastShow {
  addedByPhone: string | null;
}

const ADMIN_PODCASTS_KEY = "/api/admin/podcasts";

export function AdminPodcastsView() {
  const { data, isLoading, error } = useSWR<{ shows: AdminShow[] }>(ADMIN_PODCASTS_KEY, fetcher);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"pending" | "all">("pending");

  const shows = useMemo(() => data?.shows ?? [], [data]);
  const pendingCount = useMemo(() => shows.filter((s) => s.addedByUserId && !s.inMarketplace).length, [shows]);

  const filtered = shows.filter((s) => {
    if (tab === "pending" && !(s.addedByUserId && !s.inMarketplace)) return false;
    const matchesQuery =
      !query || s.title.toLowerCase().includes(query.toLowerCase()) || (s.author ?? "").toLowerCase().includes(query.toLowerCase());
    return matchesQuery;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">播客后台管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">审核用户添加的播客，管理播客市场的上架状态与分类</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "all")}>
          <TabsList>
            <TabsTrigger value="pending">
              待审核{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="all">全部播客</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索播客名称或作者" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">加载失败：{error.message}</p>}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title={tab === "pending" ? "没有待审核的播客" : "还没有任何播客"}
          description={tab === "pending" ? "用户新添加、还没上架市场的播客会出现在这里" : undefined}
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>添加者</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>上架市场</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((show) => (
                <AdminShowRow key={show.id} show={show} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function AdminShowRow({ show }: { show: AdminShow }) {
  const [category, setCategory] = useState(show.marketplaceCategory ?? "");
  const [savingCategory, setSavingCategory] = useState(false);
  const [togglingMarketplace, setTogglingMarketplace] = useState(false);

  async function patch(body: { inMarketplace?: boolean; marketplaceCategory?: string | null }) {
    await apiPatch(`/api/admin/podcasts/${show.id}`, body);
    mutate(ADMIN_PODCASTS_KEY);
  }

  async function handleToggleMarketplace(checked: boolean) {
    setTogglingMarketplace(true);
    try {
      await patch({ inMarketplace: checked });
      toast.success(checked ? `已上架《${show.title}》` : `已下架《${show.title}》`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败，请重试");
    } finally {
      setTogglingMarketplace(false);
    }
  }

  async function handleCategoryBlur() {
    const next = category.trim();
    if (next === (show.marketplaceCategory ?? "")) return;
    setSavingCategory(true);
    try {
      await patch({ marketplaceCategory: next || null });
      toast.success(`已更新《${show.title}》的分类`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "更新分类失败");
      setCategory(show.marketplaceCategory ?? "");
    } finally {
      setSavingCategory(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="max-w-48 truncate font-medium">{show.title}</TableCell>
      <TableCell className="max-w-32 truncate text-muted-foreground">{show.author ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {show.addedByPhone ? show.addedByPhone : show.addedByUserId ? <Badge variant="outline">已注销</Badge> : <Badge variant="secondary">系统预置</Badge>}
      </TableCell>
      <TableCell>
        <div className="relative w-32">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onBlur={handleCategoryBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="未分类"
            className="h-8 text-sm"
            disabled={savingCategory}
          />
          {savingCategory && <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={show.inMarketplace} onCheckedChange={handleToggleMarketplace} disabled={togglingMarketplace} />
          {togglingMarketplace && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        </div>
      </TableCell>
    </TableRow>
  );
}
