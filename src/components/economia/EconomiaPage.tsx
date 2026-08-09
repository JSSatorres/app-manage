"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EconomiaResumen } from "@/components/economia/EconomiaResumen";
import { MovimientosEconomicosTable } from "@/components/economia/MovimientosEconomicosTable";
import { EntradaEconomicaDialog } from "@/components/economia/EntradaEconomicaDialog";
import { CategoriasEconomicas } from "@/components/economia/CategoriasEconomicas";
import { RecurrenciasEconomicas } from "@/components/economia/RecurrenciasEconomicas";
import { ExportarEconomiaButton } from "@/components/economia/ExportarEconomiaButton";
import { StripeConnectionCard } from "@/components/economia/StripeConnectionCard";
import { useEconomia } from "@/hooks/useEconomia";
import { useAuth } from "@/hooks/useAuth";
import { useJugadores } from "@/hooks/useJugadores";
import { deriveEconomicStatus } from "@/lib/economia";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { EconomicEntry, EconomicEntryType, EconomicMovement, EconomicStatus } from "@/types/economia";

type EconomicFiltersState = {
  periodo: string;
  tipo: EconomicEntryType | "";
  estado: EconomicStatus | "";
  categoria: string;
  jugador: string;
};

const emptyFilters: EconomicFiltersState = {
  periodo: "",
  tipo: "",
  estado: "",
  categoria: "",
  jugador: "",
};

function readFiltersFromUrl(): EconomicFiltersState {
  if (typeof window === "undefined") return emptyFilters;
  const params = new URLSearchParams(window.location.search);
  const tipo = params.get("tipo");
  const estado = params.get("estado");
  return {
    periodo: params.get("periodo") ?? "",
    tipo: tipo === "player_charge" || tipo === "income" || tipo === "expense" ? tipo : "",
    estado: isEconomicStatus(estado) ? estado : "",
    categoria: params.get("categoria") ?? "",
    jugador: params.get("jugador") ?? "",
  };
}

function isEconomicStatus(value: string | null): value is EconomicStatus {
  return value === "pending" || value === "overdue" || value === "partial" || value === "paid"
    || value === "partially_refunded" || value === "refunded" || value === "cancelled";
}

function isStripeAccountActive(value: unknown): boolean {
  if (!value || typeof value !== "object" || !("connection" in value)) return false;
  const connection = value.connection;
  return Boolean(connection && typeof connection === "object" && "status" in connection && connection.status === "active");
}

function readCheckoutProcessingFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("checkout") === "processing";
}

function formatPeriodLabel(periodo: string): string {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return "Todos los períodos";
  const formatted = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" })
    .format(new Date(`${periodo}-01T00:00:00`));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function filterEntries(
  entries: readonly EconomicEntry[],
  filters: EconomicFiltersState,
  movementsByEntry: Readonly<Record<string, readonly EconomicMovement[]>>,
): EconomicEntry[] {
  return entries.filter((entry) => {
    if (filters.periodo && entry.periodKey !== filters.periodo && !entry.dueDate.startsWith(filters.periodo)) return false;
    if (filters.tipo && entry.entryType !== filters.tipo) return false;
    if (filters.categoria && entry.categoryId !== filters.categoria) return false;
    if (filters.jugador && entry.playerId !== filters.jugador) return false;
    if (filters.estado && deriveEconomicStatus(entry, movementsByEntry[entry.id] ?? []) !== filters.estado) return false;
    return true;
  });
}

export function EconomiaPage() {
  const { activeWorkspaceId } = useWorkspaceContext();
  const { session } = useAuth();
  const economia = useEconomia(activeWorkspaceId);
  const jugadores = useJugadores(activeWorkspaceId);
  const [filters, setFilters] = useState<EconomicFiltersState>(readFiltersFromUrl);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EconomicEntry | null>(null);
  const [stripeAccountActive, setStripeAccountActive] = useState(false);
  const [checkoutProcessing, setCheckoutProcessing] = useState(readCheckoutProcessingFromUrl);

  useEffect(() => {
    function syncFiltersFromHistory() {
      setFilters(readFiltersFromUrl());
      setCheckoutProcessing(readCheckoutProcessingFromUrl());
    }
    window.addEventListener("popstate", syncFiltersFromHistory);
    return () => window.removeEventListener("popstate", syncFiltersFromHistory);
  }, []);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!activeWorkspaceId || !accessToken) {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setStripeAccountActive(false);
      });
      return () => {
        cancelled = true;
      };
    }

    const workspaceId = activeWorkspaceId;
    let cancelled = false;
    async function refreshStripeConnectionStatus() {
      try {
        const response = await fetch(`/api/stripe/connect/status?workspaceId=${encodeURIComponent(workspaceId)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload: unknown = response.ok ? await response.json() : null;
        if (!cancelled) setStripeAccountActive(isStripeAccountActive(payload));
      } catch {
        if (!cancelled) setStripeAccountActive(false);
      }
    }
    void refreshStripeConnectionStatus();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, session?.access_token]);

  const movementsByEntry = useMemo(() => (economia.movimientos ?? []).reduce<Record<string, EconomicMovement[]>>(
    (groupedMovements, movement) => {
      (groupedMovements[movement.entryId] ??= []).push(movement);
      return groupedMovements;
    },
    {},
  ), [economia.movimientos]);
  const filteredEntries = useMemo(
    () => filterEntries(economia.entradas ?? [], filters, movementsByEntry),
    [economia.entradas, filters, movementsByEntry],
  );
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const playerOptions = useMemo(
    () => (jugadores.data ?? []).map((jugador) => ({
      id: jugador.id,
      label: [jugador.nombre, jugador.apellidos].filter(Boolean).join(" "),
    })),
    [jugadores.data],
  );
  const playerNameById = useMemo(
    () => Object.fromEntries(playerOptions.map((player) => [player.id, player.label])),
    [playerOptions],
  );

  function updateFilters(nextFilters: EconomicFiltersState) {
    setFilters(nextFilters);
    const params = new URLSearchParams();
    (Object.entries(nextFilters) as Array<[keyof EconomicFiltersState, string]>).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/economia?${query}` : "/economia");
  }

  function resetFilters() {
    setFilters(emptyFilters);
    window.history.replaceState(null, "", "/economia");
  }

  function retry() {
    void economia.refetchEconomia();
  }

  function openCreateEntry() {
    setSelectedEntry(null);
    setEntryDialogOpen(true);
  }

  function exportarEconomiaActual() {
    return economia.exportarEconomia({
      entryType: filters.tipo || undefined,
      categoryId: filters.categoria || undefined,
      playerId: filters.jugador || undefined,
      period: filters.periodo || undefined,
      status: filters.estado || undefined,
    });
  }

  function openEntry(entry: EconomicEntry) {
    setSelectedEntry(entry);
    setEntryDialogOpen(true);
  }

  function handleEntryDialogOpenChange(open: boolean) {
    setEntryDialogOpen(open);
    if (!open) setSelectedEntry(null);
  }

  return (
    <div>
      <PageHeader
        title="Gestión económica"
        description="Consulta los cobros, pagos y movimientos del club."
        action={activeWorkspaceId ? (
          <div className="flex flex-wrap gap-2">
            <ExportarEconomiaButton
              workspaceId={activeWorkspaceId}
              period={filters.periodo || undefined}
              loading={economia.exportando ?? false}
              errorMessage={economia.errorExportar}
              onExport={exportarEconomiaActual}
            />
            <Button type="button" onClick={openCreateEntry}>Nueva entrada</Button>
          </div>
        ) : <Button type="button" onClick={openCreateEntry} disabled>Nueva entrada</Button>}
      />

      {!activeWorkspaceId ? (
        <p className="text-sm text-muted-foreground">Selecciona un club para consultar su gestión económica.</p>
      ) : (
        <>
        <StripeConnectionCard workspaceId={activeWorkspaceId} />
        {checkoutProcessing && <p role="status" className="mb-4 text-sm text-muted-foreground">Estamos confirmando el pago</p>}
        <Tabs defaultValue="resumen">
          <TabsList className="mb-4" aria-label="Secciones de gestión económica">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
            <TabsTrigger value="periodicidades">Periodicidades</TabsTrigger>
          </TabsList>

          <FiltrosEconomicos filters={filters} hasActiveFilters={hasActiveFilters} onChange={updateFilters} onReset={resetFilters} />

          <TabsContent value="resumen">
            <EconomiaResumen
              entries={filteredEntries}
              movementsByEntry={movementsByEntry}
              periodLabel={formatPeriodLabel(filters.periodo)}
              loading={economia.cargandoResumen}
              error={economia.errorResumen}
              onRetry={retry}
            />
          </TabsContent>

          <TabsContent value="movimientos">
            <MovimientosEconomicosTable
              entries={filteredEntries}
              movementsByEntry={movementsByEntry}
              playerNameById={playerNameById}
              loading={economia.cargandoResumen}
              error={economia.errorResumen}
              onRetry={retry}
              hasActiveFilters={hasActiveFilters}
              onViewEntry={openEntry}
              onRegisterMovement={economia.registrarMovimiento}
              movementLoading={economia.registrandoMovimiento}
              movementError={economia.errorRegistrarMovimiento}
              workspaceId={activeWorkspaceId}
              stripeAccountActive={stripeAccountActive}
              onStripeRefundRequested={economia.refetchEconomia}
            />
          </TabsContent>

          <TabsContent value="categorias">
            <CategoriasEconomicas
              categorias={economia.categorias ?? []}
              loading={economia.cargandoCategorias || economia.creandoCategoria || economia.cambiandoCategoriaActiva || economia.archivandoCategoria}
              errorMessage={economia.errorCategorias ?? economia.errorCrearCategoria ?? economia.errorCambiarCategoriaActiva ?? economia.errorArchivarCategoria}
              onCreate={economia.crearCategoria}
              onSetActive={economia.cambiarCategoriaActiva}
              onArchive={economia.archivarCategoria}
            />
          </TabsContent>

          <TabsContent value="periodicidades">
            <RecurrenciasEconomicas
              recurrencias={economia.recurrencias ?? []}
              categorias={economia.categorias ?? []}
              players={playerOptions}
              currencyCode={economia.configuracion?.currencyCode ?? "EUR"}
              loading={economia.cargandoRecurrencias || economia.creandoRecurrencia || economia.actualizandoRecurrencia || economia.generandoRecurrencia}
              errorMessage={economia.errorRecurrencias ?? economia.errorCrearRecurrencia ?? economia.errorActualizarRecurrencia ?? economia.errorGenerarRecurrencia}
              onCreate={economia.crearRecurrencia}
              onUpdate={economia.actualizarRecurrencia}
              onGenerate={economia.generarSiguienteRecurrencia}
              onViewGeneratedEntry={openEntry}
            />
          </TabsContent>
        </Tabs>

        <EntradaEconomicaDialog
          open={entryDialogOpen}
          onOpenChange={handleEntryDialogOpenChange}
          entry={selectedEntry}
          categories={economia.categorias ?? []}
          players={playerOptions}
          hasMovements={selectedEntry ? (movementsByEntry[selectedEntry.id] ?? []).length > 0 : false}
          loading={selectedEntry ? economia.actualizandoEntrada : economia.creandoEntrada}
          errorMessage={selectedEntry ? economia.errorActualizarEntrada : economia.errorCrearEntrada}
          onCreate={economia.crearEntrada}
          onUpdate={economia.actualizarEntrada}
          onCancel={economia.cancelarEntrada}
        />
        </>
      )}
    </div>
  );
}

function FiltrosEconomicos({
  filters,
  hasActiveFilters,
  onChange,
  onReset,
}: {
  filters: EconomicFiltersState;
  hasActiveFilters: boolean;
  onChange: (filters: EconomicFiltersState) => void;
  onReset: () => void;
}) {
  return (
    <fieldset className="mb-5 grid gap-3 border border-border p-4 sm:grid-cols-2 xl:grid-cols-5">
      <legend className="px-1 text-sm font-semibold">Filtros económicos</legend>
      <label className="grid gap-1 text-sm font-medium">
        Período
        <input type="month" value={filters.periodo} onChange={(event) => onChange({ ...filters, periodo: event.target.value })} className="h-9 border border-input bg-background px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Tipo
        <select value={filters.tipo} onChange={(event) => onChange({ ...filters, tipo: event.target.value as EconomicEntryType | "" })} className="h-9 border border-input bg-background px-2 text-sm">
          <option value="">Todos los tipos</option>
          <option value="player_charge">Cargo a jugador</option>
          <option value="income">Ingreso</option>
          <option value="expense">Gasto</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Estado
        <select value={filters.estado} onChange={(event) => onChange({ ...filters, estado: event.target.value as EconomicStatus | "" })} className="h-9 border border-input bg-background px-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="overdue">Vencido</option>
          <option value="partial">Parcial</option>
          <option value="paid">Pagado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Categoría
        <input value={filters.categoria} onChange={(event) => onChange({ ...filters, categoria: event.target.value })} placeholder="ID de categoría" className="h-9 border border-input bg-background px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Jugador
        <input value={filters.jugador} onChange={(event) => onChange({ ...filters, jugador: event.target.value })} placeholder="ID de jugador" className="h-9 border border-input bg-background px-2 text-sm" />
      </label>
      {hasActiveFilters && <Button type="button" variant="outline" size="sm" className="self-end" onClick={onReset}>Limpiar filtros</Button>}
    </fieldset>
  );
}
