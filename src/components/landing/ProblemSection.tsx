import { FileSpreadsheet, FolderOpen, MessageCircle } from "lucide-react";
import { Reveal } from "./Reveal";

const SUENA = [
  "¿Cuándo es el entrenamiento del sub-14 esta semana?",
  "El archivo de ejercicios lo tiene Marcos, pregúntale",
  "¿La sesión se canceló? No me enteré",
  "No sé cuántos jugadores tiene la sede de Pozuelo",
  "El Excel del convenio lo sobreescribió alguien",
  "¿Por qué el entrenador no puede ver los vídeos tácticos?",
];

const DOLORES = [
  {
    icon: FileSpreadsheet,
    title: "El Excel zombie",
    body: '"Jugadores_v3_FINAL_BUENO.xlsx". Nadie sabe cuál es la versión buena. Cambias un dorsal y se desincroniza de la plantilla del equipo.',
  },
  {
    icon: FolderOpen,
    title: "El Drive caótico",
    body: 'Carpetas dentro de carpetas. Los ejercicios en PDF que solo encuentra quien los subió. El vídeo de la jugada perdido en "Sin título (3)".',
  },
  {
    icon: MessageCircle,
    title: "El WhatsApp infinito",
    body: '"¿Quién cubre el sábado?", "se canceló por lluvia", "¿alguien tiene la ficha de Martín?". La información se evapora al hacer scroll.',
  },
];

export function ProblemSection() {
  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Tu club no vive en una herramienta. Vive en siete.
          </h2>
          <p className="mt-4 text-muted-foreground">
            ¿Te suena esto? Si asientes, SportApp es para tu club.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-10 max-w-2xl">
          <ul className="grid gap-2.5 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            {SUENA.map((s) => (
              <li
                key={s}
                className="flex items-start gap-3 text-sm text-foreground"
              >
                <span className="mt-0.5 shrink-0 text-lg leading-none">😩</span>
                <span className="italic text-muted-foreground">“{s}”</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {DOLORES.map((d, i) => (
            <Reveal key={d.title} delay={0.1 + i * 0.08}>
              <div className="h-full rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="grid size-11 place-items-center rounded-xl bg-rose-50 text-rose-500">
                  <d.icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {d.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {d.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mx-auto mt-12 max-w-3xl">
          <p className="text-center text-lg text-foreground">
            Cada herramienta funciona sola. El problema es que{" "}
            <span className="font-semibold">
              tu club no funciona en piezas sueltas.
            </span>{" "}
            Y donde se copia a mano, se equivoca.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
