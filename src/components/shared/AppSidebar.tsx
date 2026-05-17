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
  Settings2,
  Sliders,
  Zap,
  HelpCircle,
  ClipboardList,
  UserCircle,
} from "lucide-react"
import { useAppNavigation } from "./AppLink"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Sedes", href: "/sedes", icon: Building2 },
  { title: "Equipos", href: "/equipos", icon: Shield },
  { title: "Entrenadores", href: "/entrenadores", icon: ClipboardList },
  { title: "Jugadores", href: "/jugadores", icon: UserCircle },
  { title: "Usuarios", href: "/usuarios", icon: Users },
  { title: "Ejercicios", href: "/ejercicios", icon: Dumbbell },
  { title: "Sesiones", href: "/sesiones", icon: CalendarDays },
  { title: "Documentos", href: "/documentos", icon: FileText },
]

const bottomNavItems = [
  { title: "Parámetros", href: "/parametros", icon: Sliders },
  { title: "Configuración", href: "/configuracion", icon: Settings2 },
  { title: "Soporte", href: "#", icon: HelpCircle },
]

interface NavItemProps {
  item: {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }
  isActive: boolean
}

function NavItem({ item, isActive }: NavItemProps) {
  const { push } = useAppNavigation()
  const Icon = item.icon

  return (
    <SidebarMenuItem className="list-none">
      <button
        type="button"
        onClick={() => push(item.href)}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        )}
      >
        {/* Indicador izquierdo activo */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
        )}
        <Icon
          className={cn(
            "size-[17px] shrink-0",
            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60",
          )}
        />
        <span
          className={cn(
            "text-[13px] tracking-wide group-data-[collapsible=icon]:hidden",
            isActive
              ? "font-bold uppercase text-sidebar-accent-foreground"
              : "font-medium",
          )}
        >
          {item.title}
        </span>
      </button>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/dashboard")
      return pathname === "/dashboard" || pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo */}
      <SidebarHeader className="h-14 px-4 flex-row items-center border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
            <Zap className="size-4 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <p className="text-[14px] font-bold text-sidebar-accent-foreground leading-tight">
              SportApp
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest leading-tight mt-0.5">
              Elite Management
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Nav principal */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Nav inferior */}
      <SidebarFooter className="px-2 pb-4 border-t border-sidebar-border">
        <SidebarMenu className="gap-0.5 pt-3">
          {bottomNavItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
            />
          ))}
        </SidebarMenu>

        {/* Avatar / versión */}
        <div className="flex items-center gap-2.5 px-2 mt-3 group-data-[collapsible=icon]:hidden">
          <div className="size-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white">U</span>
          </div>
          <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">
            v0.1.0
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
