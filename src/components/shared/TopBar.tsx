"use client"

import { Search, Bell, Download } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"

export function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border/60 bg-white px-5">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      {process.env.NODE_ENV === "development" && (
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-900 leading-none">
          DEV
        </span>
      )}

      <div className="relative flex-1 max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={15}
        />
        <Input
          placeholder="Buscar equipos, sesiones..."
          className="pl-9 h-9 bg-muted/40 border-0 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30 rounded-lg"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <WorkspaceSwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-muted-foreground hover:text-foreground relative"
        >
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
        </Button>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-lg h-9 px-4 font-semibold text-xs"
        >
          <Download size={14} />
          Exportar
        </Button>
        <div className="size-9 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20">
          <span className="text-xs font-bold text-white">U</span>
        </div>
      </div>
    </header>
  )
}
