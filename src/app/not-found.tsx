import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-lg font-semibold">页面不存在</h2>
      <p className="text-sm text-muted-foreground">你访问的页面不存在或已被移除。</p>
      <Button asChild>
        <Link href="/">返回 Dashboard</Link>
      </Button>
    </div>
  );
}
