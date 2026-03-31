"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
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
} from "lucide-react";
import { useAppNavigation } from "./AppLink";

const mainNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Sedes", href: "/sedes", icon: Building2 },
  { title: "Equipos", href: "/equipos", icon: Shield },
  { title: "Usuarios", href: "/usuarios", icon: Users },
];

const trainingNavItems = [
  { title: "Ejercicios", href: "/ejercicios", icon: Dumbbell },
  { title: "Sesiones", href: "/sesiones", icon: CalendarDays },
  { title: "Documentos", href: "/documentos", icon: FileText },
];

const configNavItems = [
  { title: "Parámetros", href: "/parametros", icon: Sliders },
  { title: "Configuración", href: "/configuracion", icon: Settings2 },
];

interface NavItemProps {
  item: { title: string; href: string; icon: React.ComponentType<{ className?: string }> };
  isActive: boolean;
}

function NavItem({ item, isActive }: NavItemProps) {
  const { push } = useAppNavigation();
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={() => push(item.href)}
        tooltip={item.title}
      >
        <Icon className="size-4" />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Dumbbell className="size-5 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">SportApp</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Entrenamiento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {trainingNavItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configNavItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Manage Sport v0.1
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
