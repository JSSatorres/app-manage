"use client";

import { useMemo, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentos } from "@/hooks/useDocumentos";
import { useSesionBloques } from "@/hooks/useSesionBloques";
import { useSesionRunner } from "@/hooks/useSesionRunner";
import { useSesion } from "@/hooks/useSesiones";
import { getSesionBloquesSignature } from "@/lib/sesionBloques";
import { can } from "@/lib/permisos";
import { cn } from "@/lib/utils";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { SesionBloque } from "@/types/sesion-bloques";
import type { Documento } from "@/types/documentos";
import { SesionBloqueRecurso } from "./SesionBloqueRecurso";

interface SesionEjecutarViewProps {
  sesionId: string;
}

interface SesionEjecutarRunnerProps {
  sesionId: string;
  bloques: SesionBloque[];
  documentos: Documento[];
  blocksSignature: string;
}

function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function SesionEjecutarRunner({ sesionId, bloques, documentos, blocksSignature }: SesionEjecutarRunnerProps) {
  const runner = useSesionRunner({
    sesionId,
    blocks: bloques.map(({ id, duracionMinutos }) => ({ id, duracionMinutos })),
    blocksSignature,
  });
  const [liveMessage, setLiveMessage] = useState("");

  if (!runner.isHydrated || !runner.state) {
    return <p className="text-sm text-muted-foreground">Preparando temporizador…</p>;
  }

  const viewedBlock = bloques.find((bloque) => bloque.id === runner.state?.viewedBlockId) ?? null;
  const activeBlock = bloques.find((bloque) => bloque.id === runner.state?.activeBlockId) ?? null;
  const isRunning = runner.state.running;
  const viewedIndex = viewedBlock ? bloques.findIndex((bloque) => bloque.id === viewedBlock.id) : -1;
  const isViewingActiveBlock = Boolean(viewedBlock && activeBlock && viewedBlock.id === activeBlock.id);
  const documento = viewedBlock
    ? documentos.find((item) => item.id === viewedBlock.documentoId) ?? null
    : null;

  function selectPreview(blockId: string) {
    runner.view(blockId);
    const block = bloques.find((item) => item.id === blockId);
    if (block) setLiveMessage(`Previsualizando ${block.titulo}.`);
  }

  function previousPreview() {
    runner.previousPreview();
    const previous = bloques[viewedIndex - 1];
    if (previous) setLiveMessage(`Previsualizando ${previous.titulo}.`);
  }

  function nextPreview() {
    runner.nextPreview();
    const next = bloques[viewedIndex + 1];
    if (next) setLiveMessage(`Previsualizando ${next.titulo}.`);
  }

  function play() {
    runner.play();
    if (viewedBlock) setLiveMessage(`Temporizador iniciado para ${viewedBlock.titulo}.`);
  }

  function pause() {
    runner.pause();
    if (activeBlock) setLiveMessage(`Temporizador pausado en ${activeBlock.titulo}.`);
  }

  function skip() {
    runner.skip();
    if (activeBlock) setLiveMessage(`Bloque ${activeBlock.titulo} saltado.`);
  }

  return (
    <div className="space-y-6">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage || runner.state.notice}
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="bloques-sesion-title" className="space-y-2">
          <h2 id="bloques-sesion-title" className="text-lg font-semibold">Bloques de la sesión</h2>
          <ol className="space-y-2">
            {bloques.map((bloque) => {
              const isActive = bloque.id === activeBlock?.id;
              const isViewed = bloque.id === viewedBlock?.id;
              const status = isActive ? (isRunning ? "En curso" : "Preparado") : isViewed ? "Previsualizando" : "Preparado";
              return (
                <li key={bloque.id}>
                  <Button
                    type="button"
                    variant={isViewed ? "secondary" : "outline"}
                    className={cn(
                      "h-auto w-full justify-between whitespace-normal px-3 py-2 text-left",
                      isActive && "border-success bg-success text-success-foreground hover:bg-success/90",
                    )}
                    aria-label={`Previsualizar ${bloque.titulo}${isActive ? " (bloque activo)" : ""}`}
                    aria-current={isViewed ? "true" : undefined}
                    onClick={() => selectPreview(bloque.id)}
                  >
                    <span>{bloque.orden}. {bloque.titulo}</span>
                    <span className={cn("text-xs", isActive ? "text-success-foreground/80" : "text-muted-foreground")}>{status}</span>
                  </Button>
                </li>
              );
            })}
          </ol>
        </section>

        <section
          aria-labelledby="previsualizacion-title"
          className={cn("space-y-4 rounded-lg border bg-card p-4", isViewingActiveBlock && "border-success")}
        >
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Previsualización</p>
            <h2 id="previsualizacion-title" className="text-xl font-semibold">{viewedBlock?.titulo}</h2>
            {viewedBlock && <p className="text-sm text-muted-foreground">Duración: {viewedBlock.duracionMinutos} min</p>}
            {viewedBlock?.ejercicioTitulo && (
              <p className="text-sm text-muted-foreground">
                Ejercicio: {viewedBlock.ejercicioTitulo}
              </p>
            )}
            {viewedBlock?.notas && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{viewedBlock.notas}</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-success">Bloque activo: {activeBlock?.titulo}</p>
            <p
              role="timer"
              aria-label={`Tiempo restante de ${activeBlock?.titulo ?? "la sesión"}`}
              className="text-4xl font-semibold tabular-nums"
            >
              {formatRemaining(runner.remainingMs)}
            </p>
          </div>

          {viewedBlock && <SesionBloqueRecurso documento={documento} bloqueTitulo={viewedBlock.titulo} />}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={previousPreview} disabled={viewedIndex <= 0}>
              Anterior bloque
            </Button>
            <Button type="button" variant="outline" onClick={nextPreview} disabled={viewedIndex < 0 || viewedIndex >= bloques.length - 1}>
              Siguiente bloque
            </Button>
            {runner.state.running ? (
              <Button type="button" onClick={pause}>
                <Pause />
                Pausa
              </Button>
            ) : (
              <Button type="button" onClick={play} disabled={!viewedBlock}>
                <Play />
                Play
              </Button>
            )}
            <Button type="button" variant="outline" onClick={skip} disabled={!activeBlock}>
              <SkipForward />
              Saltar
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function SesionEjecutarView({ sesionId }: SesionEjecutarViewProps) {
  const { activeSede, activeWorkspaceId, rol } = useWorkspaceContext();
  const puedeEjecutar = can(rol, "sesiones", "mutate");
  const runnerSesionId = puedeEjecutar ? sesionId : null;
  const runnerWorkspaceId = puedeEjecutar ? activeWorkspaceId : null;
  const runnerSedeIds = puedeEjecutar && activeSede ? [activeSede.id] : [];
  const sesion = useSesion(runnerSesionId, runnerWorkspaceId);
  const bloques = useSesionBloques(runnerSesionId);
  const documentos = useDocumentos(runnerSedeIds, runnerWorkspaceId);
  const blocksSignature = useMemo(
    () =>
      bloques.data?.isExecutable
        ? getSesionBloquesSignature(bloques.data.bloques)
        : "",
    [bloques.data],
  );

  if (!puedeEjecutar) {
    return <p className="text-sm text-destructive">No tienes permiso para ejecutar esta sesión.</p>;
  }

  if (sesion.loading || bloques.loading || documentos.loading) {
    return <p className="text-sm text-muted-foreground">Cargando ejecución de la sesión…</p>;
  }

  if (sesion.errorMessage || bloques.errorMessage || documentos.errorMessage) {
    return <p className="text-sm text-destructive">No se pudo cargar la ejecución de la sesión.</p>;
  }

  if (!sesion.data) {
    return <p className="text-sm text-muted-foreground">No se encontró la sesión solicitada.</p>;
  }

  if (!bloques.data?.isExecutable || bloques.data.bloques.length === 0 || !blocksSignature) {
    return <p className="text-sm text-muted-foreground">La sesión no tiene bloques ejecutables. Completa y guarda sus bloques antes de ejecutarla.</p>;
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Sesión del {sesion.data.fecha}</p>
        <h1 className="text-2xl font-semibold">Ejecutar sesión</h1>
      </header>
      <SesionEjecutarRunner
        sesionId={sesionId}
        bloques={bloques.data.bloques}
        documentos={documentos.data ?? []}
        blocksSignature={blocksSignature}
      />
    </main>
  );
}
