"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { Bookmark, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import type { Collection } from "@/lib/types";

export function AddToCollectionDialog({ episodeId }: { episodeId: string }) {
  const [open, setOpen] = useState(false);
  const { data } = useSWR<{ collections: Collection[] }>(open ? "/api/collections" : null, fetcher);
  const [selectedOverride, setSelectedOverride] = useState<string>("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const collections = data?.collections ?? [];
  const selected = selectedOverride || collections[0]?.id || "";

  async function handleCreateCollection() {
    if (!newName.trim()) return;
    try {
      const { collection } = await apiPost<{ collection: Collection }>("/api/collections", { name: newName.trim() });
      toast.success(`已创建专题《${collection.name}》`);
      setNewName("");
      setCreating(false);
      setSelectedOverride(collection.id);
      mutate("/api/collections");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "创建失败");
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await apiPost(`/api/collections/${selected}/items`, { episodeId, note: note || undefined });
      toast.success("已加入专题");
      mutate(`/api/collections/${selected}`);
      setOpen(false);
      setNote("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="size-4" />
          收藏到专题
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>收藏到专题</DialogTitle>
          <DialogDescription>选择一个专题并添加备注（可选）。</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {collections.length > 0 && !creating && (
            <div className="space-y-2">
              <Label>选择专题</Label>
              <Select value={selected} onValueChange={setSelectedOverride}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择专题" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" />
                新建专题
              </Button>
            </div>
          )}

          {(collections.length === 0 || creating) && (
            <div className="space-y-2">
              <Label htmlFor="new-collection">新专题名称</Label>
              <div className="flex gap-2">
                <Input id="new-collection" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例如：BTC 研究" />
                <Button variant="secondary" onClick={handleCreateCollection} disabled={!newName.trim()}>
                  创建
                </Button>
              </div>
              {collections.length > 0 && (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setCreating(false)}>
                  取消，选择已有专题
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">备注</Label>
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="记录你的想法或后续待办" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!selected || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
