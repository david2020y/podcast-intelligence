"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { AdminNav } from "@/components/admin/admin-nav";
import { fetcher } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";

interface AdminUser {
  id: string;
  phone: string | null;
  createdAt: string;
  addedShowCount: number;
  subscriptionCount: number;
}

export function AdminUsersView() {
  const { data, isLoading, error } = useSWR<{ users: AdminUser[] }>("/api/admin/users", fetcher);
  const [query, setQuery] = useState("");

  const users = useMemo(() => data?.users ?? [], [data]);
  const filtered = users.filter((u) => !query || (u.phone ?? "").includes(query));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">播客后台管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">查看所有注册用户及其使用情况</p>
        </div>
      </div>

      <AdminNav />

      <div className="flex justify-end">
        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="按手机号搜索" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
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
        <EmptyState icon={Users} title={users.length === 0 ? "还没有注册用户" : "没有匹配的用户"} />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>手机号</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>添加播客</TableHead>
                <TableHead>订阅播客</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{u.addedShowCount}</TableCell>
                  <TableCell className="text-muted-foreground">{u.subscriptionCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
