import { Star } from "lucide-react";
import { Reveal } from "./Reveal";

const TESTIMONIOS = [
  {
    quote:
      "Teníamos 4 categorías en 4 Excel distintos. Ahora es una sola pantalla y, cuando un entrenador cancela por lluvia, me entero en el momento. No vuelvo atrás.",
    autor: "Director deportivo",
    club: "Club de 3 sedes y 8 equipos",
  },
  {
    quote:
      "Importé nuestra hoja de jugadores de tres temporadas y lo conectó todo solo. Pensé que tardaría una semana; fueron diez minutos.",
    autor: "Coordinador de cantera",
    club: "Academia multideporte",
  },
  {
    quote:
      "Mis entrenadores dejan las notas desde el campo con el móvil. Por fin sé qué pasa en cada entrenamiento sin perseguir a nadie.",
    autor: "Gerente de sede",
    club: "Club de fútbol base",
  },
];

export function TestimonialsSection() {
  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Clubes que ya dejaron el Excel atrás
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIOS.map((t, i) => (
            <Reveal key={t.autor} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-semibold text-foreground">{t.autor}</p>
                  <p className="text-xs text-muted-foreground">{t.club}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Casos ilustrativos · sustituir por testimonios reales cuando los haya.
        </p>
      </div>
    </section>
  );
}
