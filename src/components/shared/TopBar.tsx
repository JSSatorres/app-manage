"use client"

import { Bell } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SedeSwitcher } from "./SedeSwitcher"
import { UserMenu } from "./UserMenu"

export function TopBar() {
  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b-2 border-foreground bg-card px-6 xl:px-8">
      <SidebarTrigger className="size-11 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" />

      {process.env.NODE_ENV === "development" && (
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-900 leading-none">
          DEV
        </span>
      )}
      
      {/* Right side */}
      <div className="ml-auto flex min-w-0 items-center gap-1">
        {/* Club + Sede context pills */}
        <SedeSwitcher />

        {/* Divider */}
        <div className="mx-2 h-7 w-px bg-border" />

        {/* Bell */}
        <button
          type="button"
          className="relative grid size-11 place-items-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
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
