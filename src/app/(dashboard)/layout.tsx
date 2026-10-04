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
import { BrandMark } from "@/components/shared/BrandMark"

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
        <TopBar />

        {/* Header móvil */}
        <header className="sticky top-0 z-30 flex h-14 min-w-0 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-chart-1 to-chart-6 text-white shadow-[0_4px_12px_-2px_rgb(99_102_241/0.5)]">
              <BrandMark />
            </div>
            <span className="text-[16px] font-semibold leading-none tracking-[-0.01em]">Sport<span className="text-primary">App</span></span>
            {process.env.NODE_ENV === "development" && (
              <span className="shrink-0 rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-warning">
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
        <main className="min-w-0 flex-1 bg-background px-4 pb-24 pt-4 md:px-6 md:pb-10 md:pt-5 xl:px-8">
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
      <SidebarProvider
        style={{ "--sidebar-width": "15rem", "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
      >
        <AuthGate>
          <WorkspaceProvider>
            <DashboardShell>{children}</DashboardShell>
          </WorkspaceProvider>
        </AuthGate>
      </SidebarProvider>
    </TooltipProvider>
  )
}
