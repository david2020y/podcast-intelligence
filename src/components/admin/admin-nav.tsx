"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/podcasts", label: "播客审核" },
  { href: "/admin/users", label: "用户管理" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-4 border-b border-border">
      {ADMIN_NAV_ITEMS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
              active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
