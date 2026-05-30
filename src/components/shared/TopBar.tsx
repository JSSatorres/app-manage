"use client"

import { Bell } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SedeSwitcher } from "./SedeSwitcher"
import { UserMenu } from "./UserMenu"

export function TopBar() {
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-background px-[30px]">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg" />

      {process.env.NODE_ENV === "development" && (
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-900 leading-none">
          DEV
        </span>
      )}

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

        {/* Avatar */}
        <div className="ml-1">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
