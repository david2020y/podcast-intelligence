import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProcessingStatus } from "@/lib/types";

const LABELS: Record<ProcessingStatus, string> = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
  failed: "失败",
};

const DOT_CLASS: Record<ProcessingStatus, string> = {
  pending: "bg-muted-foreground/50",
  processing: "bg-blue-500 animate-pulse",
  completed: "bg-emerald-500",
  failed: "bg-destructive",
};

export function StatusBadge({ status, label }: { status: ProcessingStatus; label?: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span className={cn("size-1.5 rounded-full", DOT_CLASS[status])} />
      {label ? `${label}：${LABELS[status]}` : LABELS[status]}
    </Badge>
  );
}
