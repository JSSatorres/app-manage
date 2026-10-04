"use client"

import { Bell } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SedeSwitcher } from "./SedeSwitcher"
import { UserMenu } from "./UserMenu"

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 hidden h-14 shrink-0 items-center gap-2 border-b border-border bg-card/85 px-4 backdrop-blur-md md:flex lg:px-6">
      <SidebarTrigger className="size-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" />

      {process.env.NODE_ENV === "development" && (
        <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-warning">
          DEV
        </span>
      )}

      {/* Right side */}
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {/* Club + Sede context pills */}
        <SedeSwitcher />

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Bell */}
        <button
          type="button"
          className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
          aria-label="Notificaciones"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-card bg-destructive" />
        </button>

        {/* Avatar */}
        <UserMenu />
      </div>
    </header>
  )
}
