"use client";

import { Search, Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border/60 bg-white px-5">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
        <Input
          placeholder="Buscar equipos, sesiones..."
          className="pl-9 h-8 bg-background border-border/60 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <WorkspaceSwitcher />
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground relative">
          <Bell size={16} />
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
        </Button>
        <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">U</span>
        </div>
      </div>
    </header>
  );
}
