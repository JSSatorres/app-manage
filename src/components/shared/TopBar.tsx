"use client"

import { Search, Bell, Download } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SedeSwitcher } from "./SedeSwitcher"
import { UserMenu } from "./UserMenu"
import { cn } from "@/lib/utils"

export function TopBar() {
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-background px-[30px]">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg" />

      {process.env.NODE_ENV === "development" && (
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-900 leading-none">
          DEV
        </span>
      )}

      {/* Searchbar */}
      <div className="relative flex-1 max-w-[460px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
        <input
          placeholder="Buscar equipos, sesiones, jugadores…"
          className={cn(
            "w-full rounded-[10px] border border-border bg-secondary/60 py-[9px] pl-[40px] pr-[14px]",
            "text-[13.5px] text-foreground placeholder:text-muted-foreground",
            "outline-none transition-all",
            "focus:border-input focus:bg-background focus:ring-2 focus:ring-primary/10"
          )}
        />
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-[6px]">
        {/* Club + Sede context pills */}
        <SedeSwitcher />

        {/* Divider */}
        <div className="mx-1 h-[22px] w-px bg-border" />

        {/* Bell */}
        <button
          type="button"
          className="relative grid size-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Notificaciones"
        >
          <Bell size={18} />
          <span className="absolute right-[8px] top-[7px] size-[6px] rounded-full border-[1.5px] border-background bg-destructive" />
        </button>

        {/* Export */}
        <button
          type="button"
          className="inline-flex items-center gap-[7px] rounded-[10px] bg-primary px-[15px] py-[9px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110"
        >
          <Download size={16} />
          <span>Exportar</span>
        </button>

        {/* Avatar */}
        <div className="ml-1">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
