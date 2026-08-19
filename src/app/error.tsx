"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <h2 className="text-lg font-semibold">出现了一些问题</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{error.message || "页面加载时发生未知错误，请重试。"}</p>
      <Button onClick={reset}>重试</Button>
    </div>
  );
}
