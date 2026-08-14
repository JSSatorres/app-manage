import Image from "next/image";
import { PlayCircle, Smartphone, Tablet } from "lucide-react";

const steps = [
  { icon: Tablet, title: "El manager prepara", body: "Deja ejercicios, documentos y vídeos dentro de la sesión." },
  { icon: Smartphone, title: "El entrenador abre", body: "Consulta el plan desde móvil o tablet, en pista o en el campo." },
  { icon: PlayCircle, title: "El equipo lo entiende", body: "Ve el vídeo del ejercicio antes de llevarlo a la práctica." },
] as const;

export function TrainingVideoSection() {
  return (
    <section className="overflow-hidden text-white" style={{ backgroundColor: "var(--foreground)" }}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="grid overflow-hidden rounded-md lg:grid-cols-2" style={{ backgroundColor: "var(--primary)" }}>
          <div className="relative min-h-[360px] lg:min-h-[620px]">
            <Image
              src="/landing/entrenador-tablet-baloncesto.png"
              alt="Entrenador de baloncesto enseñando un ejercicio en tablet a su equipo"
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7" style={{ background: "var(--foreground)" }}>
              <p className="max-w-md text-sm font-medium text-white/90">El mismo flujo funciona en fútbol, baloncesto, voleibol, balonmano y academias multideporte.</p>
            </div>
          </div>

          <div className="flex flex-col justify-center p-7 text-foreground sm:p-10 lg:p-12">
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">Del despacho al entrenamiento, sin perder el contexto.</h2>
            <p className="mt-5 text-lg leading-relaxed text-foreground/85">Cada ejercicio llega al entrenador con la explicación y el vídeo que necesita para enseñarlo bien.</p>
            <ol className="mt-9 space-y-6">
              {steps.map((step, index) => (
                <li key={step.title} className="grid gap-4" style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}>
                  <div className="grid size-11 place-items-center rounded-md" style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}><step.icon size={21} aria-hidden /></div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/70">Paso {index + 1}</p>
                    <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/80">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
