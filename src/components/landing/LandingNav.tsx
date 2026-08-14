"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const links = [
  { href: "#funciones", label: "El producto" },
  { href: "#solucion", label: "Cómo ayuda" },
  { href: "#lista-espera", label: "Lista de espera" },
];

const MOBILE_NAVIGATION_ID = "navegacion-movil";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    firstMobileLinkRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setOpen(false);
      queueMicrotask(() => menuButtonRef.current?.focus());
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <a
        href="#contenido-principal"
        className="fixed left-4 top-4 z-[60] -translate-y-20 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Saltar al contenido principal
      </a>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-colors",
          scrolled
            ? "border-b border-border bg-background/95"
            : "border-b border-transparent bg-background",
        )}
      >
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex h-[64px] max-w-6xl items-center justify-between px-5 sm:px-6"
        >
          <a href="#top" className="shrink-0" aria-label="SportApp inicio">
            <Logo />
          </a>
          <div className="hidden items-center gap-7 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
          <a
            href="#lista-espera"
            className="hidden min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-foreground transition-[filter] hover:brightness-110 md:inline-flex"
          >
            Unirme a la lista
          </a>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid size-11 place-items-center rounded-lg text-foreground hover:bg-muted md:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls={MOBILE_NAVIGATION_ID}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </nav>
        {open && (
          <nav
            id={MOBILE_NAVIGATION_ID}
            aria-label="Navegación móvil"
            className="border-t border-border bg-card px-5 py-4 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {links.map((link, index) => (
                <a
                  key={link.href}
                  ref={index === 0 ? firstMobileLinkRef : undefined}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#lista-espera"
                onClick={() => setOpen(false)}
                className="mt-2 flex min-h-11 items-center justify-center rounded-[10px] bg-primary px-4 py-2.5 text-center text-sm font-semibold text-foreground"
              >
                Unirme a la lista de espera
              </a>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
