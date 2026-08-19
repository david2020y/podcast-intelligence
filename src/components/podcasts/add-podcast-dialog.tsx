"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiPost, ApiError } from "@/lib/fetcher";
import type { PodcastShow } from "@/lib/types";

export function AddPodcastDialog({ onAdded }: { onAdded: (show: PodcastShow) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("rss");
  const [loading, setLoading] = useState(false);

  const [rssUrl, setRssUrl] = useState("");
  const [episodeUrl, setEpisodeUrl] = useState("");
  const [manual, setManual] = useState({ title: "", author: "", description: "", websiteUrl: "", category: "" });

  async function handleSubmit() {
    setLoading(true);
    try {
      const body =
        tab === "rss"
          ? { rssUrl }
          : tab === "episode"
            ? { episodeUrl }
            : { manual: { ...manual, author: manual.author || undefined, description: manual.description || undefined } };

      const { show } = await apiPost<{ show: PodcastShow }>("/api/podcasts", body);
      toast.success(`已添加播客《${show.title}》`);
      onAdded(show);
      setOpen(false);
      setRssUrl("");
      setEpisodeUrl("");
      setManual({ title: "", author: "", description: "", websiteUrl: "", category: "" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "添加失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    (tab === "rss" && rssUrl.trim().length > 0) ||
    (tab === "episode" && episodeUrl.trim().length > 0) ||
    (tab === "manual" && manual.title.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          添加播客
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加播客</DialogTitle>
          <DialogDescription>通过 RSS 地址、单集链接或手动信息添加播客到你的资料库。</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="rss" className="flex-1">RSS 地址</TabsTrigger>
            <TabsTrigger value="episode" className="flex-1">单集链接</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">手动添加</TabsTrigger>
          </TabsList>

          <TabsContent value="rss" className="space-y-2 pt-2">
            <Label htmlFor="rss-url">RSS 订阅地址</Label>
            <Input
              id="rss-url"
              placeholder="https://example.com/feed.xml"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">系统会自动读取播客信息并同步历史节目。</p>
          </TabsContent>

          <TabsContent value="episode" className="space-y-2 pt-2">
            <Label htmlFor="episode-url">单集或节目页面链接</Label>
            <Input
              id="episode-url"
              placeholder="https://example.com/episode/42"
              value={episodeUrl}
              onChange={(e) => setEpisodeUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              系统会尝试从页面自动发现 RSS 地址。若失败，请改用 RSS 地址方式添加。
            </p>
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="manual-title">播客名称 *</Label>
              <Input
                id="manual-title"
                value={manual.title}
                onChange={(e) => setManual((m) => ({ ...m, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-author">主持人 / 作者</Label>
              <Input
                id="manual-author"
                value={manual.author}
                onChange={(e) => setManual((m) => ({ ...m, author: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-desc">简介</Label>
              <Textarea
                id="manual-desc"
                rows={3}
                value={manual.description}
                onChange={(e) => setManual((m) => ({ ...m, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-category">分类</Label>
              <Input
                id="manual-category"
                placeholder="例如：投资理财"
                value={manual.category}
                onChange={(e) => setManual((m) => ({ ...m, category: e.target.value }))}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
