"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, CheckCircle2 } from "lucide-react";

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-border bg-background"
    >
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <motion.div initial={{ opacity: 1, y: shouldReduceMotion ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-sm"><span className="size-2 rounded-full bg-primary" /> SportApp · un producto de Satorus.es</span>
            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-foreground sm:text-[56px]">El club entero, al día y conectado.</h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">Organiza sedes, equipos, sesiones, personas y documentos desde un solo lugar. SportApp transforma la rutina del club en información clara para cada persona.</p>
            <a href="#lista-espera" className="mt-8 inline-flex h-12 items-center gap-2 rounded-[12px] bg-primary px-6 text-[15px] font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary">Unirme a la lista de espera <ArrowDownRight size={18} aria-hidden /></a>
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 size={17} className="text-primary" /> Acceso anticipado para clubes y academias.</div>
          </motion.div>
          <motion.div className="relative" initial={{ opacity: 1, y: shouldReduceMotion ? 0 : 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.7, delay: shouldReduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}>
            <div className="absolute -right-8 -top-8 size-36 rounded-full bg-primary/15 blur-2xl" aria-hidden />
            <div className="overflow-hidden rounded-md border border-border bg-card shadow-2xl shadow-primary/15"><Image src="/landing/equipo-entrenando.png" alt="Equipo de fútbol entrenando con su entrenador en el campo" width={1800} height={1013} priority unoptimized sizes="(max-width: 1024px) 100vw, 55vw" className="h-auto w-full" /></div>
            <div className="absolute -bottom-7 -left-4 hidden w-[57%] overflow-hidden rounded-md border border-border bg-card p-1 shadow-xl sm:block"><Image src="/landing/01-dashboard-redesign-2026.png" alt="Dashboard semanal de SportApp con el estado de las sesiones" width={900} height={560} className="h-auto w-full rounded-md" /></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
