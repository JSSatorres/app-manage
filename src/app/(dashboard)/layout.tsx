"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/shared/AppSidebar"
import { AuthGate } from "@/components/auth/AuthGate"
import { WorkspaceProvider, useWorkspaceContext } from "@/lib/workspaceContext"
import { SedeSwitcher } from "@/components/shared/SedeSwitcher"
import { BottomNav } from "@/components/shared/BottomNav"
import { TopBar } from "@/components/shared/TopBar"
import { CreateClubForm } from "@/components/onboarding/CreateClubForm"
import { Zap } from "lucide-react"

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { ready, needsOnboarding } = useWorkspaceContext()

  if (!ready) return null

  return (
    <>
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
        <header className="flex md:hidden h-[54px] shrink-0 items-center justify-between border-b border-border bg-background px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-[30px] items-center justify-center rounded-lg bg-primary">
              <Zap className="size-4 text-white" />
            </div>
            <span className="text-[16px] font-semibold tracking-[-0.02em]">SportApp</span>
            {process.env.NODE_ENV === "development" && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-900 leading-none">
                DEV
              </span>
            )}
          </div>
          {/* Context pills móvil */}
          <div className="flex items-center gap-1">
            <SedeSwitcher />
          </div>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 overflow-auto bg-background px-4 py-[20px] pb-[100px] md:px-[30px] md:py-[38px] md:pb-[70px]">
          {needsOnboarding ? <CreateClubForm /> : children}
        </main>
      </SidebarInset>

      {/* Bottom nav: solo en móvil */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </>
  )
}

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
            <DashboardShell>{children}</DashboardShell>
          </WorkspaceProvider>
        </AuthGate>
      </SidebarProvider>
    </TooltipProvider>
  )
}
