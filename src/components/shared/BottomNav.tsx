"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  FileText,
  MoreHorizontal,
  Shield,
  ClipboardList,
  UserCircle,
  Users,
  Dumbbell,
  Sliders,
  Settings2,
  HelpCircle,
  X,
} from "lucide-react";
import { useAppNavigation } from "./AppLink";
import { cn } from "@/lib/utils";

const primaryNavItems = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Sedes", href: "/sedes", icon: Building2 },
  { title: "Sesiones", href: "/sesiones", icon: CalendarDays },
  { title: "Docs", href: "/documentos", icon: FileText },
];

const moreNavItems = [
  { title: "Equipos", href: "/equipos", icon: Shield },
  { title: "Entrenadores", href: "/entrenadores", icon: ClipboardList },
  { title: "Jugadores", href: "/jugadores", icon: UserCircle },
  { title: "Usuarios", href: "/usuarios", icon: Users },
  { title: "Ejercicios", href: "/ejercicios", icon: Dumbbell },
  { title: "Parámetros", href: "/parametros", icon: Sliders },
  { title: "Configuración", href: "/configuracion", icon: Settings2 },
  { title: "Soporte", href: "#", icon: HelpCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  const { push } = useAppNavigation();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  const anyMoreActive = moreNavItems.some(
    (item) => item.href !== "#" && isActive(item.href)
  );

  function navigate(href: string) {
    setOpen(false);
    if (href !== "#") push(href);
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sheet deslizable desde abajo */}
      <div
        className={cn(
          "fixed left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl border-t border-border/60 transition-transform duration-300 ease-in-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{ bottom: "env(safe-area-inset-bottom, 0px)", paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Handle + título */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 absolute top-3 left-1/2 -translate-x-1/2" />
          <p className="text-sm font-semibold text-foreground mt-2">Más opciones</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground mt-2"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Grid de items */}
        <div className="grid grid-cols-4 gap-1 px-4 pb-4">
          {moreNavItems.map((item) => {
            const active = item.href !== "#" && isActive(item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl p-3 transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  active ? "bg-primary/15" : "bg-muted"
                )}>
                  <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                </div>
                <span className={cn(
                  "text-[10px] leading-none text-center",
                  active ? "font-semibold" : "font-medium"
                )}>
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de navegación inferior */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {primaryNavItems.map((item) => {
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

          {/* Botón "Más" */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full py-2 transition-colors",
              (open || anyMoreActive) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className={cn(
              "flex size-9 items-center justify-center rounded-xl transition-colors",
              (open || anyMoreActive) && "bg-primary/10"
            )}>
              {anyMoreActive && !open
                ? <div className="relative">
                    <MoreHorizontal className="size-5 stroke-[2.5]" />
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
                  </div>
                : <MoreHorizontal className={cn("size-5", (open || anyMoreActive) && "stroke-[2.5]")} />
              }
            </div>
            <span className={cn(
              "text-[10px] leading-none",
              (open || anyMoreActive) ? "font-semibold" : "font-medium"
            )}>
              Más
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
