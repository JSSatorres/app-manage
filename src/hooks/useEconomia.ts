"use client";

import { useCallback, useMemo } from "react";
import { economicKeys } from "@/hooks/queryKeys";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  archiveEconomicCategory,
  cancelEconomicEntry,
  createEconomicCategory,
  createEconomicEntry,
  createEconomicSchedule,
  fetchEconomicCategories,
  fetchEconomicExport,
  fetchEconomicEntries,
  fetchEconomicMovements,
  fetchEconomicSchedules,
  fetchEconomicSettings,
  generateNextEconomicOccurrence,
  recordEconomicAdjustment,
  recordEconomicMovement,
  setEconomicCategoryActive,
  updateEconomicCategory,
  updateEconomicEntry,
  updateEconomicSchedule,
  updateEconomicSettings,
  type EconomicCategoryUpdateInput,
  type EconomicEntryUpdateInput,
  type EconomicExportData,
  type EconomicExportFilters,
  type EconomicScheduleUpdateInput,
} from "@/services/economia.service";
import type {
  EconomicCategory,
  EconomicCategoryCreateInput,
  EconomicEntry,
  EconomicEntryCreateInput,
  EconomicFilters,
  EconomicMovement,
  EconomicMovementCreateInput,
  EconomicSchedule,
  EconomicScheduleCreateInput,
  EconomicScheduleStatus,
  EconomicSettings,
  EconomicSettingsUpdateInput,
} from "@/types/economia";

export interface UseEconomiaOptions {
  filtros?: EconomicFilters;
  incluirCategoriasInactivas?: boolean;
  estadoRecurrencias?: EconomicScheduleStatus;
}

function invalidacionesEntrada(workspaceId: string | null) {
  return [
    economicKeys.summary.workspace(workspaceId),
    economicKeys.entries.workspace(workspaceId),
  ];
}

/**
 * Estado remoto económico. El resumen se deriva de las entradas ya filtradas,
 * porque el servicio todavía no expone una lectura agregada independiente.
 */
export function useEconomia(
  workspaceId: string | null,
  {
    filtros = {},
    incluirCategoriasInactivas = false,
    estadoRecurrencias,
  }: UseEconomiaOptions = {},
) {
  const configuracionQuery = useQuery<EconomicSettings>(
    () => workspaceId
      ? fetchEconomicSettings(workspaceId)
      : Promise.resolve({ data: null, error: null }),
    economicKeys.settings.detail(workspaceId),
  );
  const categoriasQuery = useQuery<EconomicCategory[]>(
    () => workspaceId
      ? fetchEconomicCategories(workspaceId, { includeInactive: incluirCategoriasInactivas })
      : Promise.resolve({ data: [], error: null }),
    economicKeys.categories.list(workspaceId, incluirCategoriasInactivas),
  );
  const recurrenciasQuery = useQuery<EconomicSchedule[]>(
    () => workspaceId
      ? fetchEconomicSchedules(workspaceId, { status: estadoRecurrencias })
      : Promise.resolve({ data: [], error: null }),
    economicKeys.schedules.list(workspaceId, estadoRecurrencias),
  );
  const entradasQuery = useQuery<EconomicEntry[]>(
    () => workspaceId
      ? fetchEconomicEntries(workspaceId, filtros)
      : Promise.resolve({ data: [], error: null }),
    economicKeys.entries.list(workspaceId, filtros),
  );
  const movimientosQuery = useQuery<EconomicMovement[]>(
    () => workspaceId
      ? fetchEconomicMovements(workspaceId)
      : Promise.resolve({ data: [], error: null }),
    economicKeys.movements.list(workspaceId),
  );

  const refetchEconomia = useCallback(async () => {
    await Promise.all([
      configuracionQuery.refetch(),
      categoriasQuery.refetch(),
      recurrenciasQuery.refetch(),
      entradasQuery.refetch(),
      movimientosQuery.refetch(),
    ]);
  }, [categoriasQuery, configuracionQuery, entradasQuery, movimientosQuery, recurrenciasQuery]);

  const actualizarConfiguracionMutation = useMutation<EconomicSettings, { id: string; input: EconomicSettingsUpdateInput }>(
    ({ id, input }) => updateEconomicSettings(id, workspaceId, input),
    { invalidateKeys: [economicKeys.settings.detail(workspaceId), ...invalidacionesEntrada(workspaceId)] },
  );
  const crearCategoriaMutation = useMutation<EconomicCategory, EconomicCategoryCreateInput>(
    (input) => createEconomicCategory(workspaceId, input),
    { invalidateKeys: [economicKeys.categories.workspace(workspaceId), ...invalidacionesEntrada(workspaceId)] },
  );
  const actualizarCategoriaMutation = useMutation<EconomicCategory, { id: string; input: EconomicCategoryUpdateInput }>(
    ({ id, input }) => updateEconomicCategory(id, workspaceId, input),
    { invalidateKeys: [economicKeys.categories.workspace(workspaceId), ...invalidacionesEntrada(workspaceId)] },
  );
  const cambiarCategoriaActivaMutation = useMutation<EconomicCategory, { id: string; isActive: boolean }>(
    ({ id, isActive }) => setEconomicCategoryActive(id, workspaceId, isActive),
    { invalidateKeys: [economicKeys.categories.workspace(workspaceId), ...invalidacionesEntrada(workspaceId)] },
  );
  const archivarCategoriaMutation = useMutation<EconomicCategory, { id: string }>(
    ({ id }) => archiveEconomicCategory(id, workspaceId),
    { invalidateKeys: [economicKeys.categories.workspace(workspaceId), ...invalidacionesEntrada(workspaceId)] },
  );
  const crearRecurrenciaMutation = useMutation<EconomicSchedule, EconomicScheduleCreateInput>(
    (input) => createEconomicSchedule(workspaceId, input),
    { invalidateKeys: [economicKeys.schedules.workspace(workspaceId), ...invalidacionesEntrada(workspaceId)] },
  );
  const actualizarRecurrenciaMutation = useMutation<EconomicSchedule, { id: string; input: EconomicScheduleUpdateInput }>(
    ({ id, input }) => updateEconomicSchedule(id, workspaceId, input),
    { invalidateKeys: [economicKeys.schedules.workspace(workspaceId), ...invalidacionesEntrada(workspaceId)] },
  );
  const generarRecurrenciaMutation = useMutation<EconomicEntry, { id: string }>(
    ({ id }) => generateNextEconomicOccurrence(id, workspaceId),
    { invalidateKeys: [economicKeys.schedules.workspace(workspaceId), ...invalidacionesEntrada(workspaceId)] },
  );
  const crearEntradaMutation = useMutation<EconomicEntry, EconomicEntryCreateInput>(
    (input) => createEconomicEntry(workspaceId, input),
    { invalidateKeys: invalidacionesEntrada(workspaceId) },
  );
  const actualizarEntradaMutation = useMutation<EconomicEntry, { id: string; input: EconomicEntryUpdateInput }>(
    ({ id, input }) => updateEconomicEntry(id, workspaceId, input),
    { invalidateKeys: invalidacionesEntrada(workspaceId) },
  );
  const cancelarEntradaMutation = useMutation<EconomicEntry, { id: string; motivo: string }>(
    ({ id, motivo }) => cancelEconomicEntry(id, workspaceId, motivo),
    { invalidateKeys: invalidacionesEntrada(workspaceId) },
  );
  const registrarMovimientoMutation = useMutation<EconomicMovement, EconomicMovementCreateInput>(
    (input) => recordEconomicMovement(workspaceId, input),
    { invalidateKeys: [...invalidacionesEntrada(workspaceId), economicKeys.movements.workspace(workspaceId)] },
  );
  const registrarAjusteMutation = useMutation<EconomicMovement, EconomicMovementCreateInput>(
    (input) => recordEconomicAdjustment(workspaceId, input),
    { invalidateKeys: [...invalidacionesEntrada(workspaceId), economicKeys.movements.workspace(workspaceId)] },
  );
  const exportarEconomiaMutation = useMutation<EconomicExportData, EconomicExportFilters>(
    (filters) => fetchEconomicExport(workspaceId, filters),
  );

  const actualizarConfiguracion = useCallback(async (id: string, input: EconomicSettingsUpdateInput) => {
    const configuracion = await actualizarConfiguracionMutation.mutate({ id, input });
    if (configuracion) await configuracionQuery.refetch();
    return configuracion;
  }, [actualizarConfiguracionMutation, configuracionQuery]);
  const crearCategoria = useCallback(async (input: EconomicCategoryCreateInput) => {
    const categoria = await crearCategoriaMutation.mutate(input);
    if (categoria) await categoriasQuery.refetch();
    return categoria;
  }, [categoriasQuery, crearCategoriaMutation]);
  const actualizarCategoria = useCallback(async (id: string, input: EconomicCategoryUpdateInput) => {
    const categoria = await actualizarCategoriaMutation.mutate({ id, input });
    if (categoria) await categoriasQuery.refetch();
    return categoria;
  }, [actualizarCategoriaMutation, categoriasQuery]);
  const cambiarCategoriaActiva = useCallback(async (id: string, isActive: boolean) => {
    const categoria = await cambiarCategoriaActivaMutation.mutate({ id, isActive });
    if (categoria) await categoriasQuery.refetch();
    return categoria;
  }, [cambiarCategoriaActivaMutation, categoriasQuery]);
  const archivarCategoria = useCallback(async (id: string) => {
    const categoria = await archivarCategoriaMutation.mutate({ id });
    if (categoria) await categoriasQuery.refetch();
    return categoria;
  }, [archivarCategoriaMutation, categoriasQuery]);
  const crearRecurrencia = useCallback(async (input: EconomicScheduleCreateInput) => {
    const recurrencia = await crearRecurrenciaMutation.mutate(input);
    if (recurrencia) await recurrenciasQuery.refetch();
    return recurrencia;
  }, [crearRecurrenciaMutation, recurrenciasQuery]);
  const actualizarRecurrencia = useCallback(async (id: string, input: EconomicScheduleUpdateInput) => {
    const recurrencia = await actualizarRecurrenciaMutation.mutate({ id, input });
    if (recurrencia) await recurrenciasQuery.refetch();
    return recurrencia;
  }, [actualizarRecurrenciaMutation, recurrenciasQuery]);
  const generarSiguienteRecurrencia = useCallback(async (id: string) => {
    const entrada = await generarRecurrenciaMutation.mutate({ id });
    if (entrada) {
      await Promise.all([recurrenciasQuery.refetch(), entradasQuery.refetch()]);
    }
    return entrada;
  }, [entradasQuery, generarRecurrenciaMutation, recurrenciasQuery]);
  const crearEntrada = useCallback(async (input: EconomicEntryCreateInput) => {
    const entrada = await crearEntradaMutation.mutate(input);
    if (entrada) await entradasQuery.refetch();
    return entrada;
  }, [crearEntradaMutation, entradasQuery]);
  const actualizarEntrada = useCallback(async (id: string, input: EconomicEntryUpdateInput) => {
    const entrada = await actualizarEntradaMutation.mutate({ id, input });
    if (entrada) await entradasQuery.refetch();
    return entrada;
  }, [actualizarEntradaMutation, entradasQuery]);
  const cancelarEntrada = useCallback(async (id: string, motivo: string) => {
    const entrada = await cancelarEntradaMutation.mutate({ id, motivo });
    if (entrada) await entradasQuery.refetch();
    return entrada;
  }, [cancelarEntradaMutation, entradasQuery]);
  const registrarMovimiento = useCallback(async (input: EconomicMovementCreateInput) => {
    const movimiento = await registrarMovimientoMutation.mutate(input);
    if (movimiento) await Promise.all([entradasQuery.refetch(), movimientosQuery.refetch()]);
    return movimiento;
  }, [entradasQuery, movimientosQuery, registrarMovimientoMutation]);
  const registrarAjuste = useCallback(async (input: EconomicMovementCreateInput) => {
    const movimiento = await registrarAjusteMutation.mutate(input);
    if (movimiento) await Promise.all([entradasQuery.refetch(), movimientosQuery.refetch()]);
    return movimiento;
  }, [entradasQuery, movimientosQuery, registrarAjusteMutation]);
  const exportarEconomia = useCallback(
    (filters: EconomicExportFilters) => exportarEconomiaMutation.mutate(filters),
    [exportarEconomiaMutation],
  );

  const estados = useMemo(() => ({
    actualizandoConfiguracion: actualizarConfiguracionMutation.loading,
    creandoCategoria: crearCategoriaMutation.loading,
    actualizandoCategoria: actualizarCategoriaMutation.loading,
    cambiandoCategoriaActiva: cambiarCategoriaActivaMutation.loading,
    archivandoCategoria: archivarCategoriaMutation.loading,
    creandoRecurrencia: crearRecurrenciaMutation.loading,
    actualizandoRecurrencia: actualizarRecurrenciaMutation.loading,
    generandoRecurrencia: generarRecurrenciaMutation.loading,
    creandoEntrada: crearEntradaMutation.loading,
    actualizandoEntrada: actualizarEntradaMutation.loading,
    cancelandoEntrada: cancelarEntradaMutation.loading,
    registrandoMovimiento: registrarMovimientoMutation.loading,
    registrandoAjuste: registrarAjusteMutation.loading,
    errorActualizarConfiguracion: actualizarConfiguracionMutation.errorMessage,
    errorCrearCategoria: crearCategoriaMutation.errorMessage,
    errorActualizarCategoria: actualizarCategoriaMutation.errorMessage,
    errorCambiarCategoriaActiva: cambiarCategoriaActivaMutation.errorMessage,
    errorArchivarCategoria: archivarCategoriaMutation.errorMessage,
    errorCrearRecurrencia: crearRecurrenciaMutation.errorMessage,
    errorActualizarRecurrencia: actualizarRecurrenciaMutation.errorMessage,
    errorGenerarRecurrencia: generarRecurrenciaMutation.errorMessage,
    errorCrearEntrada: crearEntradaMutation.errorMessage,
    errorActualizarEntrada: actualizarEntradaMutation.errorMessage,
    errorCancelarEntrada: cancelarEntradaMutation.errorMessage,
    errorRegistrarMovimiento: registrarMovimientoMutation.errorMessage,
    errorRegistrarAjuste: registrarAjusteMutation.errorMessage,
    exportando: exportarEconomiaMutation.loading,
    errorExportar: exportarEconomiaMutation.errorMessage,
  }), [
    actualizarConfiguracionMutation.loading, crearCategoriaMutation.loading,
    actualizarCategoriaMutation.loading, cambiarCategoriaActivaMutation.loading,
    archivarCategoriaMutation.loading, crearRecurrenciaMutation.loading,
    actualizarRecurrenciaMutation.loading, generarRecurrenciaMutation.loading,
    crearEntradaMutation.loading, actualizarEntradaMutation.loading,
    cancelarEntradaMutation.loading, registrarMovimientoMutation.loading,
    registrarAjusteMutation.loading, actualizarConfiguracionMutation.errorMessage,
    crearCategoriaMutation.errorMessage, actualizarCategoriaMutation.errorMessage,
    cambiarCategoriaActivaMutation.errorMessage, archivarCategoriaMutation.errorMessage,
    crearRecurrenciaMutation.errorMessage, actualizarRecurrenciaMutation.errorMessage,
    generarRecurrenciaMutation.errorMessage, crearEntradaMutation.errorMessage,
    actualizarEntradaMutation.errorMessage, cancelarEntradaMutation.errorMessage,
    registrarMovimientoMutation.errorMessage, registrarAjusteMutation.errorMessage,
    exportarEconomiaMutation.loading, exportarEconomiaMutation.errorMessage,
  ]);

  return {
    configuracion: configuracionQuery.data,
    cargandoConfiguracion: configuracionQuery.loading,
    errorConfiguracion: configuracionQuery.errorMessage,
    categorias: categoriasQuery.data,
    cargandoCategorias: categoriasQuery.loading,
    errorCategorias: categoriasQuery.errorMessage,
    recurrencias: recurrenciasQuery.data,
    cargandoRecurrencias: recurrenciasQuery.loading,
    errorRecurrencias: recurrenciasQuery.errorMessage,
    entradas: entradasQuery.data,
    cargandoEntradas: entradasQuery.loading,
    errorEntradas: entradasQuery.errorMessage,
    movimientos: movimientosQuery.data,
    cargandoMovimientos: movimientosQuery.loading,
    errorMovimientos: movimientosQuery.errorMessage,
    resumen: entradasQuery.data,
    cargandoResumen: entradasQuery.loading || movimientosQuery.loading,
    errorResumen: entradasQuery.errorMessage ?? movimientosQuery.errorMessage,
    ...estados,
    actualizarConfiguracion,
    crearCategoria,
    actualizarCategoria,
    cambiarCategoriaActiva,
    archivarCategoria,
    crearRecurrencia,
    actualizarRecurrencia,
    generarSiguienteRecurrencia,
    crearEntrada,
    actualizarEntrada,
    cancelarEntrada,
    registrarMovimiento,
    registrarAjuste,
    exportarEconomia,
    refetchEconomia,
  };
}
