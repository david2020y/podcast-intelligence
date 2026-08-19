"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Headphones } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ModeBadge } from "@/components/layout/mode-badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-56 shrink-0 border-r border-border md:flex md:flex-col">
        <div className="flex items-center gap-2 px-4 py-4">
          <Headphones className="size-5" />
          <span className="text-sm font-semibold tracking-tight">播客情报库</span>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-56 p-0">
                <div className="flex items-center gap-2 px-4 py-4">
                  <Headphones className="size-5" />
                  <span className="text-sm font-semibold tracking-tight">播客情报库</span>
                </div>
                <SidebarNav />
              </SheetContent>
            </Sheet>
            <Link href="/" className="text-sm font-semibold">
              播客情报库
            </Link>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <ModeBadge />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
