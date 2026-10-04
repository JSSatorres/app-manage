"use client"

import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Dumbbell,
  CalendarDays,
  FileText,
  ClipboardList,
  UserCircle,
  CircleDollarSign,
  Settings2,
} from "lucide-react"
import { useAppNavigation } from "./AppLink"
import { UserMenu } from "./UserMenu"
import { BrandMark } from "./BrandMark"
import { cn } from "@/lib/utils"
import { useWorkspaceContext } from "@/lib/workspaceContext"
import { can, type Recurso } from "@/lib/permisos"
import { useRequestLock } from "@/providers/request-lock-provider"
import { sectionIconColors } from "@/lib/sectionTones"

type NavEntry = { title: string; href: string; icon: React.ComponentType<{ className?: string }>; recurso: Recurso; color: string }

const navSections: { label: string; items: NavEntry[] }[] = [
  {
    label: "Operativa",
    items: [
      { title: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard, recurso: "dashboard", color: sectionIconColors.dashboard },
      { title: "Sesiones",     href: "/sesiones",     icon: CalendarDays,    recurso: "sesiones", color: sectionIconColors.sesiones },
      { title: "Ejercicios",   href: "/ejercicios",   icon: Dumbbell,        recurso: "ejercicios", color: sectionIconColors.ejercicios },
      { title: "Documentos",   href: "/documentos",   icon: FileText,        recurso: "documentos", color: sectionIconColors.documentos },
    ],
  },
  {
    label: "Club",
    items: [
      { title: "Sedes",        href: "/sedes",        icon: Building2,       recurso: "sedes", color: sectionIconColors.sedes },
      { title: "Equipos",      href: "/equipos",      icon: Shield,          recurso: "equipos", color: sectionIconColors.equipos },
      { title: "Entrenadores", href: "/entrenadores", icon: ClipboardList,   recurso: "entrenadores", color: sectionIconColors.entrenadores },
      { title: "Jugadores",    href: "/jugadores",    icon: UserCircle,      recurso: "jugadores", color: sectionIconColors.jugadores },
    ],
  },
  {
    label: "Administración",
    items: [
      { title: "Usuarios",      href: "/usuarios",      icon: Users,            recurso: "usuarios", color: sectionIconColors.usuarios },
      { title: "Economía",      href: "/economia",      icon: CircleDollarSign, recurso: "economia", color: sectionIconColors.economia },
      { title: "Configuración", href: "/configuracion", icon: Settings2,        recurso: "configuracion", color: "text-sidebar-foreground" },
    ],
  },
]

interface NavItemProps {
  item: {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    color: string
  }
  isActive: boolean
}

function NavItem({ item, isActive }: NavItemProps) {
  const { push } = useAppNavigation()
  const { pending } = useRequestLock()
  const Icon = item.icon

  return (
    <SidebarMenuItem className="list-none">
      <button
        type="button"
        onClick={() => push(item.href)}
        disabled={pending}
        aria-disabled={pending}
        aria-current={isActive ? "page" : undefined}
        title={item.title}
        className={cn(
          "group/nav relative flex h-9 w-full items-center gap-2.5 rounded-lg px-1.5 text-left text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )}
      >
        {isActive && (
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-sidebar-primary group-data-[collapsible=icon]:hidden" />
        )}
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-md transition-colors",
            item.color,
            isActive ? "bg-current/15" : "opacity-85 group-hover/nav:opacity-100"
          )}
        >
          <Icon className="size-[17px]" />
        </span>
        <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
      </button>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { rol } = useWorkspaceContext()

  const visibleSections = navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => can(rol, item.recurso, "view")) }))
    .filter((section) => section.items.length > 0)

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground [&_[data-slot=sidebar-inner]]:bg-sidebar"
    >
      {/* Logo / Brand */}
      <SidebarHeader className="px-3 pb-2 pt-4">
        <div className="flex h-10 items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-chart-1 to-chart-6 text-white shadow-[0_4px_12px_-2px_rgb(99_102_241/0.55)]">
            <BrandMark />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-[15px] font-semibold leading-none tracking-[-0.01em] text-sidebar-accent-foreground">
              Sport<span className="text-sidebar-primary">App</span>
            </p>
            <p className="mt-1 text-[10.5px] font-medium leading-none text-sidebar-foreground/80">
              Elite Management
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navegación por secciones */}
      <SidebarContent className="gap-4 px-3 py-3">
        {visibleSections.map((section) => (
          <SidebarGroup key={section.label} className="p-0">
            <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
              {section.label}
            </p>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {section.items.map((item) => (
                  <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Usuario */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <UserMenu variant="sidebar" />
      </SidebarFooter>
    </Sidebar>
  )
}
