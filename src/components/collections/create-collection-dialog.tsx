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
import { apiPost, ApiError } from "@/lib/fetcher";
import type { Collection } from "@/lib/types";

export function CreateCollectionDialog({ onCreated }: { onCreated: (c: Collection) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const { collection } = await apiPost<{ collection: Collection }>("/api/collections", {
        name,
        description: description || undefined,
      });
      toast.success(`已创建专题《${collection.name}》`);
      onCreated(collection);
      setOpen(false);
      setName("");
      setDescription("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          新建专题
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建专题</DialogTitle>
          <DialogDescription>专题用于归类你研究的主题，例如 BTC、AI 投资。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="collection-name">名称 *</Label>
            <Input id="collection-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：BTC" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection-desc">说明</Label>
            <Textarea id="collection-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
