"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export function UserMenu() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    async function loadPhone() {
      try {
        const supabase = getSupabaseBrowser();
        const { data } = await supabase.auth.getUser();
        setPhone((data.user?.user_metadata?.phone as string | undefined) ?? null);
      } catch {
        // Mock Mode or not logged in: nothing to show.
      }
    }
    loadPhone();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!phone) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <User className="size-3.5" />
      <span className="hidden sm:inline">{phone}</span>
      <Button variant="ghost" size="icon" className="size-7" onClick={handleLogout}>
        <LogOut className="size-3.5" />
      </Button>
    </div>
  );
}
