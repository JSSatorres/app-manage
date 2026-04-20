"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  FileText,
  Settings2,
} from "lucide-react";
import { useAppNavigation } from "./AppLink";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Sedes", href: "/sedes", icon: Building2 },
  { title: "Sesiones", href: "/sesiones", icon: CalendarDays },
  { title: "Docs", href: "/documentos", icon: FileText },
  { title: "Config", href: "/configuracion", icon: Settings2 },
];

export function BottomNav() {
  const pathname = usePathname();
  const { push } = useAppNavigation();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center justify-around h-16 px-1">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex size-9 items-center justify-center rounded-xl transition-colors",
                active && "bg-primary/10"
              )}>
                <Icon className={cn("size-5", active && "stroke-[2.5]")} />
              </div>
              <span className={cn(
                "text-[10px] leading-none",
                active ? "font-semibold" : "font-medium"
              )}>
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
