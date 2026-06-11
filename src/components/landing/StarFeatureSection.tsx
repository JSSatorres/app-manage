"use client";

import { motion } from "framer-motion";
import { Bell, Smartphone, Monitor, History, BarChart4, PhoneOff } from "lucide-react";
import { Reveal } from "./Reveal";

const ACTIVIDAD = [
  { dot: "bg-rose-500", estado: "No realizada", nota: "Cancelada por lluvia. Campo encharcado, recuperamos el jueves." },
  { dot: "bg-amber-500", estado: "Incidencia", nota: "Lesión de Martín en el minuto 30, tobillo derecho. Avisado el fisio." },
  { dot: "bg-emerald-500", estado: "Realizada", nota: "Gran intensidad. El bloque de transiciones funcionó muy bien." },
  { dot: "bg-blue-500", estado: "Cambio de plan", nota: "Solo vinieron 8 jugadores: adaptamos a rondos." },
];

const BENEFICIOS = [
  { icon: History, title: "Trazabilidad total", body: "Cada sesión guarda qué pasó, por qué y quién lo anotó. El histórico del club, escrito solo." },
  { icon: BarChart4, title: "Decisiones con datos", body: "¿Cuántas sesiones se caen por lluvia en esta sede? Ya no es una sensación: es un dato." },
  { icon: PhoneOff, title: "Cero teléfono roto", body: "La nota la escribe quien estuvo allí y la lee quien decide. Sin intermediarios." },
];

export function StarFeatureSection() {
  return (
    <section id="feature" className="border-t border-border bg-[#0b0d12] text-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
            En tiempo real
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
            El entrenador anota. El director se entera. Sin una sola llamada.
          </h2>
          <p className="mt-4 text-white/60">
            Cuando un entrenamiento termina, el entrenador deja sus notas desde el
            campo. En ese instante, esa nota viaja al dashboard del administrador y
            queda registrada para siempre.
          </p>
        </Reveal>

        {/* Split screen */}
        <div className="mx-auto mt-14 grid max-w-4xl items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* Lado entrenador */}
          <Reveal>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-white/50">
                <Smartphone size={14} /> Lado entrenador · en el campo
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold">Sesión · Infantil A</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300">
                  Estado: No realizada
                </div>
                <p className="mt-3 text-xs text-white/50">Notas del entrenador</p>
                <p className="mt-1 text-sm text-white/90">
                  “Cancelada por lluvia. Recuperamos el jueves.”
                </p>
                <div className="mt-4 w-full rounded-lg bg-primary py-2 text-center text-xs font-semibold">
                  Guardar notas
                </div>
              </div>
            </div>
          </Reveal>

          {/* Flecha */}
          <div className="hidden justify-center lg:flex">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-2xl text-primary"
            >
              ▶
            </motion.div>
          </div>

          {/* Lado admin */}
          <Reveal delay={0.2}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-white/50">
                <Monitor size={14} /> Lado admin · en la oficina
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Dashboard — Hoy</p>
                  <span className="relative">
                    <Bell size={16} className="text-white/60" />
                    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-rose-500" />
                  </span>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/[0.08] p-3"
                >
                  <p className="text-sm font-medium">18:00 · Infantil A</p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                    <span className="size-1.5 rounded-full bg-rose-400" /> No realizada
                  </div>
                  <p className="mt-2 text-xs italic text-white/70">
                    “Cancelada por lluvia”
                  </p>
                </motion.div>
                <p className="mt-2 text-center text-[11px] text-white/40">
                  ↑ aparece al instante
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Carrusel de actividad */}
        <Reveal delay={0.1} className="mx-auto mt-14 max-w-3xl">
          <p className="mb-4 text-center text-sm font-medium text-white/50">
            Lo que el admin ve aparecer en su panel
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ACTIVIDAD.map((a) => (
              <div
                key={a.estado}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5"
              >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${a.dot}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{a.estado}</p>
                  <p className="text-xs text-white/55">{a.nota}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Beneficios */}
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {BENEFICIOS.map((b, i) => (
            <Reveal key={b.title} delay={0.1 + i * 0.08}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <div className="grid size-11 place-items-center rounded-xl bg-primary/20 text-primary">
                  <b.icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mx-auto mt-12 max-w-3xl">
          <p className="text-center text-lg text-white/80">
            En un Excel, esto sería una celda que alguien tiene que acordarse de
            rellenar. En SportApp,{" "}
            <span className="font-semibold text-white">
              es el flujo natural de cerrar un entrenamiento
            </span>{" "}
            — y llega solo a quien tiene que verlo.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
