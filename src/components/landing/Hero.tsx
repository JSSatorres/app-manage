"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Star } from "lucide-react";
import { AppLink } from "@/components/shared/AppLink";

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 50% -8%, rgba(51,88,255,0.10) 0%, transparent 70%), #ffffff",
      }}
    >
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-sm">
            <span
              className="size-1.5 rounded-full"
              style={{ background: "#3358ff" }}
            />
            SportApp · Elite Management
          </span>

          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[56px]">
            Gestiona todo tu club deportivo desde una sola pantalla.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Sedes, equipos, jugadores, entrenadores, sesiones y documentos —
            conectados de verdad. Cuando algo cambia, se actualiza para todos.{" "}
            <span className="font-medium text-foreground">
              Sin hojas de cálculo. Sin archivos perdidos.
            </span>
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <AppLink
              href="/register"
              className="inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-primary px-7 text-[15px] font-semibold text-white shadow-sm transition-[filter] hover:brightness-110 sm:w-auto"
            >
              Probar gratis
            </AppLink>
            <a
              href="#videos"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border border-border bg-white px-6 text-[15px] font-semibold text-foreground shadow-sm transition-colors hover:bg-muted sm:w-auto"
            >
              <Play size={16} className="text-primary" />
              Ver cómo funciona (2 min)
            </a>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={15}
                  className="fill-amber-400 text-amber-400"
                />
              ))}
            </span>
            <span>
              Clubes de fútbol, baloncesto y academias ya entrenan con cabeza
            </span>
          </div>
        </motion.div>

        {/* Captura del dashboard */}
        <motion.div
          className="relative mx-auto mt-14 max-w-5xl"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="absolute -inset-x-10 -top-8 bottom-0 -z-10 rounded-[40px] opacity-60 blur-2xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(51,88,255,0.18), transparent 70%)",
            }}
          />
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-primary/5">
            <Image
              src="/landing/01-dashboard.png"
              alt="Dashboard semanal de SportApp con el calendario, las sesiones del día y los estados de color"
              width={2400}
              height={1500}
              priority
              className="h-auto w-full"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
