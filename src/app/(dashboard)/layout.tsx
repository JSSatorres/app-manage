"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/shared/AppSidebar"
import { AuthGate } from "@/components/auth/AuthGate"
import { WorkspaceProvider } from "@/lib/workspaceContext"
import { WorkspaceSwitcher } from "@/components/shared/WorkspaceSwitcher"
import { BottomNav } from "@/components/shared/BottomNav"
import { TopBar } from "@/components/shared/TopBar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AuthGate>
          <WorkspaceProvider>
            {/* Sidebar: solo en md+ */}
            <div className="hidden md:block">
              <AppSidebar />
            </div>

            <SidebarInset className="flex flex-col min-h-svh overflow-hidden">
              {/* TopBar desktop (md+) */}
              <div className="hidden md:block">
                <TopBar />
              </div>

              {/* Header móvil */}
              <header className="flex md:hidden h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card px-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
                    <svg
                      className="size-4 text-primary-foreground"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm">SportApp</span>
                  {process.env.NODE_ENV === "development" && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-900 leading-none">
                      DEV
                    </span>
                  )}
                </div>
                <WorkspaceSwitcher />
              </header>

              {/* Contenido principal */}
              <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-6 lg:pb-8 bg-background">
                {children}
              </main>
            </SidebarInset>

            {/* Bottom nav: solo en móvil */}
            <div className="md:hidden">
              <BottomNav />
            </div>
          </WorkspaceProvider>
        </AuthGate>
      </SidebarProvider>
    </TooltipProvider>
  )
}
