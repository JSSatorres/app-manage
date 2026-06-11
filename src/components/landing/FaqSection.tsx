"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "¿Tengo que meter todos mis datos a mano?",
    a: "No. Subes tu Excel actual (o pegas tu Google Sheets) y SportApp reconoce las columnas —aunque las llames distinto— y lo conecta todo. También hay plantilla si empiezas de cero.",
  },
  {
    q: "¿Puedo sacar mis datos cuando quiera?",
    a: "Sí. Exportas todo el club a Excel con un clic, con nombres legibles. Sin lock-in.",
  },
  {
    q: "¿Sirve para mi deporte?",
    a: "SportApp es agnóstico al deporte: fútbol, fútbol sala, baloncesto, balonmano, academias multideporte… Tú configuras las categorías, posiciones y parámetros.",
  },
  {
    q: "¿Funciona en el móvil?",
    a: "Sí, está pensada para usarse en el campo: navegación inferior en móvil y todo accesible desde el teléfono del entrenador.",
  },
  {
    q: "¿Cómo controlo quién ve qué?",
    a: "Con cinco roles y una matriz de permisos que distingue ver de modificar. Cada persona accede solo a lo suyo.",
  },
  {
    q: "¿Y si un entrenamiento se cancela?",
    a: "El entrenador lo marca como No realizada y deja el motivo (lluvia, lesión, falta de jugadores…). Aparece en el dashboard del admin y queda registrado en el histórico del club.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-t border-border bg-white">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Dudas frecuentes
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-10 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className="overflow-hidden rounded-2xl border border-border bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-foreground">{f.q}</span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
