import { Reveal } from "./Reveal";

const ROLES = [
  { emoji: "🏟️", name: "Gerente de sede", desc: "Manda en su sede: equipos, técnicos, jugadores, sesiones y documentos. No ve las ajenas." },
  { emoji: "📋", name: "Entrenador", desc: "Su día a día: equipos, jugadores, crea y cierra sesiones, monta ejercicios y deja notas." },
  { emoji: "👤", name: "Jugador", desc: "Acceso de consulta de su información, fuera del panel de gestión." },
];

// Vista comercial de los perfiles operativos derivada de src/lib/permisos.ts.
// 2 = ver y modificar · 1 = solo ver · 0 = sin acceso. Orden: Gerente, Entrenador, Jugador
const RECURSOS: { name: string; perms: number[] }[] = [
  { name: "Dashboard", perms: [2, 1, 0] },
  { name: "Sedes", perms: [2, 0, 0] },
  { name: "Equipos", perms: [2, 1, 0] },
  { name: "Entrenadores", perms: [2, 0, 0] },
  { name: "Jugadores", perms: [2, 2, 0] },
  { name: "Ejercicios", perms: [2, 2, 0] },
  { name: "Sesiones", perms: [2, 2, 0] },
  { name: "Documentos", perms: [2, 2, 0] },
];

const COLS = ["Gerente", "Entrenador", "Jugador"];

function Cell({ value }: { value: number }) {
  if (value === 2)
    return (
      <span className="inline-flex items-center justify-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        Editar
      </span>
    );
  if (value === 1)
    return (
      <span className="inline-flex items-center justify-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
        Ver
      </span>
    );
  return <span className="text-muted-foreground/40">—</span>;
}

export function RolesSection() {
  return (
    <section className="border-t border-border" style={{ backgroundColor: "var(--background)" }}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Tres perfiles. Cada persona trabaja con lo que necesita.
          </h2>
          <p className="mt-4 text-muted-foreground">
            SportApp acompaña el trabajo real del club: coordinación en la sede,
            planificación en pista y consulta para el jugador. Cada perfil distingue{" "}
            <span className="font-medium text-foreground">ver</span> de{" "}
            <span className="font-medium text-foreground">modificar</span>.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {ROLES.map((r, i) => (
            <Reveal key={r.name} delay={(i % 5) * 0.05}>
              <div className="h-full rounded-md border border-border bg-card p-6 shadow-sm">
                <div className="text-2xl">{r.emoji}</div>
                <h3 className="mt-2 font-semibold text-foreground">{r.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {r.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Matriz */}
        <Reveal delay={0.1} className="mt-12">
          <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
            Así se reparte el trabajo diario
          </p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Recurso
                  </th>
                  {COLS.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-3 text-center font-semibold text-foreground"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECURSOS.map((r, i) => (
                  <tr
                    key={r.name}
                    className={i % 2 ? "bg-muted/20" : "bg-card"}
                  >
                    <td className="border-t border-border px-4 py-2.5 font-medium text-foreground">
                      {r.name}
                    </td>
                    {r.perms.map((p, j) => (
                      <td
                        key={j}
                        className="border-t border-border px-3 py-2.5 text-center"
                      >
                        <Cell value={p} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            El jugador consulta su información fuera del panel de gestión. El gerente
            y el entrenador trabajan sobre un mismo dato, sin duplicados ni versiones distintas.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
