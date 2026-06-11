import { RefreshCw, Link2, Eye } from "lucide-react";
import { Reveal } from "./Reveal";

const BENEFICIOS = [
  {
    icon: RefreshCw,
    title: "Cambia una vez, cambia en todo",
    body: "Renombras una sede, mueves un jugador de equipo o actualizas la titulación de un entrenador, y toda la app lo refleja. Cero copia-pega.",
  },
  {
    icon: Link2,
    title: "Nada se pierde de contexto",
    body: "Un ejercicio sabe a qué sesiones pertenece. Una sesión sabe su equipo, su entrenador y sus documentos. Haces clic y tienes la historia completa.",
  },
  {
    icon: Eye,
    title: "Cada quien ve lo suyo",
    body: "El dato es único, pero la vista es personal: el dueño ve todas las sedes; el gerente, la suya; el entrenador, sus equipos.",
  },
];

/** Nodo del grafo de datos conectado. */
function Node({
  label,
  emoji,
  className = "",
}: {
  label: string;
  emoji: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground shadow-sm ${className}`}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </div>
  );
}

export function SolutionSection() {
  return (
    <section id="solucion" className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Un solo sitio. Todo conectado. Se actualiza solo.
          </h2>
          <p className="mt-4 text-muted-foreground">
            En SportApp no hay copias. Hay{" "}
            <span className="font-medium text-foreground">un dato vivo</span> que
            cada persona ve según su rol. En un Excel, el nombre de un jugador
            vive en seis archivos; aquí existe una sola vez.
          </p>
        </Reveal>

        {/* Grafo de relaciones */}
        <Reveal delay={0.1} className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-2xl border border-border bg-muted/40 p-6 sm:p-10">
            <div className="flex flex-col items-center gap-3">
              <Node label="Tu club (workspace)" emoji="🏢" className="!bg-primary/5" />
              <Connector />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Node label="Sede A" emoji="🏟️" />
                <Node label="Sede B" emoji="🏟️" />
                <Node label="Sede C" emoji="🏟️" />
              </div>
              <Connector />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Node label="Equipos" emoji="🛡️" />
                <span className="text-xs font-semibold text-primary">↔ M:N ↔</span>
                <Node label="Jugadores" emoji="👤" />
                <Node label="Entrenadores" emoji="📋" />
              </div>
              <Connector />
              <Node
                label="Sesión · fecha · estado · objetivo"
                emoji="📅"
                className="!bg-primary/5"
              />
              <Connector />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Node label="Ejercicios" emoji="🏋️" />
                <Node label="Notas post-entreno" emoji="📝" />
                <Node label="Documentos" emoji="📄" />
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Las relaciones <span className="font-semibold text-primary">M:N</span>{" "}
              son muchos-a-muchos reales en el modelo de datos — lo que un Excel
              no puede representar.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {BENEFICIOS.map((b, i) => (
            <Reveal key={b.title} delay={0.1 + i * 0.08}>
              <div className="h-full rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <b.icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {b.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Connector() {
  return <span className="h-5 w-px bg-border" aria-hidden />;
}
