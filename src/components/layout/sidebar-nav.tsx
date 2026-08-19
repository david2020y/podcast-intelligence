"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Rss, Store, Search, Bookmark, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/podcasts", label: "我的播客", icon: Rss },
  { href: "/marketplace", label: "播客市场", icon: Store },
  { href: "/search", label: "搜索", icon: Search },
  { href: "/collections", label: "专题收藏", icon: Bookmark },
  { href: "/settings", label: "设置", icon: Settings2 },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
