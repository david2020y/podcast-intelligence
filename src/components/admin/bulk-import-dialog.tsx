"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiPost, ApiError } from "@/lib/fetcher";

interface BulkImportResult {
  url: string;
  ok: boolean;
  title?: string;
  error?: string;
}

export function BulkImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [urlsText, setUrlsText] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkImportResult[] | null>(null);

  const urls = urlsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  async function handleSubmit() {
    setLoading(true);
    setResults(null);
    try {
      const { results } = await apiPost<{ results: BulkImportResult[] }>("/api/admin/podcasts/bulk-import", {
        urls,
        category: category.trim() || undefined,
      });
      setResults(results);
      const okCount = results.filter((r) => r.ok).length;
      toast.success(`导入完成：${okCount}/${results.length} 条成功`);
      onImported();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "批量导入失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setUrlsText("");
      setCategory("");
      setResults(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" />
          批量导入
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>批量导入播客</DialogTitle>
          <DialogDescription>
            每行一个链接，支持 RSS 订阅地址，或 YouTube 频道链接（自动识别对应的官方 RSS）。导入后直接上架到播客市场。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="bulk-urls">链接列表</Label>
          <Textarea
            id="bulk-urls"
            rows={8}
            placeholder={"https://example.com/feed.xml\nhttps://www.youtube.com/@somechannel"}
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">共 {urls.length} 条，一次最多 50 条。</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bulk-category">统一分类（可选）</Label>
          <Input
            id="bulk-category"
            placeholder="例如：科技"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
          />
        </div>

        {results && (
          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border p-2 text-sm">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5">
                {r.ok ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate">{r.ok ? r.title : r.url}</p>
                  {!r.ok && <p className="truncate text-xs text-muted-foreground">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            关闭
          </Button>
          <Button onClick={handleSubmit} disabled={urls.length === 0 || loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
