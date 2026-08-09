"use client"

import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/shared/AppSidebar"
import { AuthGate } from "@/components/auth/AuthGate"
import { WorkspaceProvider, useWorkspaceContext } from "@/lib/workspaceContext"
import { SedeSwitcher } from "@/components/shared/SedeSwitcher"
import { BottomNav } from "@/components/shared/BottomNav"
import { TopBar } from "@/components/shared/TopBar"
import { CreateClubForm } from "@/components/onboarding/CreateClubForm"
import { AccesoDenegado } from "@/components/shared/RequireRol"
import { Zap } from "lucide-react"

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { ready, needsOnboarding, isJugador } = useWorkspaceContext()
  const pathname = usePathname()
  const isSesionRunnerPath = /^\/sesiones\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/ejecutar$/i.test(pathname)

  if (!ready) return null

  // El rol "jugador" no tiene acceso al panel de gestión por ahora.
  if (isJugador && !isSesionRunnerPath) {
    return (
      <SidebarInset className="flex min-h-svh items-center justify-center bg-background px-4">
        <AccesoDenegado
          titulo="Acceso no disponible"
          descripcion="La gestión del club está reservada al equipo técnico. Si crees que esto es un error, contacta con tu club."
        />
      </SidebarInset>
    )
  }

  return (
    <>
      {/* Sidebar: solo en md+ */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <SidebarInset className="flex min-h-svh min-w-0 flex-col bg-background">
        {/* TopBar desktop (md+) */}
        <div className="hidden md:block">
          <TopBar />
        </div>

        {/* Header móvil */}
        <header className="flex min-h-16 min-w-0 shrink-0 items-center justify-between gap-3 border-b-2 border-foreground bg-card px-4 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
              <Zap className="size-[18px]" />
            </div>
            <span className="font-heading text-[20px] leading-none tracking-[0.02em]">SPORT<span className="text-primary">APP</span></span>
            {process.env.NODE_ENV === "development" && (
              <span className="shrink-0 bg-yellow-400 px-1.5 py-0.5 text-xs font-semibold leading-none text-yellow-900">
                DEV
              </span>
            )}
          </div>
          {/* Context pills móvil */}
          <div className="min-w-0 shrink-0">
            <SedeSwitcher />
          </div>
        </header>

        {/* Contenido principal */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-background px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-16 xl:px-10">
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
