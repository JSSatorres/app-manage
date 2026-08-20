# Tarea Maestra — Corregir listado de Almacenamiento en Documentos

## Contexto

Tras una subida privada completada, la pestaña `Almacenamiento` puede seguir mostrando contador cero y el tutorial de configuración. La captura aportada también evidencia numerosas consultas repetidas para resolver las mismas asociaciones de sede y documentos.

## Causa confirmada por auditoría

- `DocumentoForm` permite crear sin sede y no preselecciona la sede activa; el alta queda global al workspace.
- `fetchContentAssets` filtra una sede solo mediante pivotes y `documentos.sede_id`, por lo que excluye documentos globales aunque el contrato editorial los declara visibles.
- `DocumentosListView` monta cuatro catálogos simultáneos y cada uno repite la resolución sede → documentos → assets.
- La lista, el modal de edición y las acciones de abrir/eliminar ya existen; quedan inaccesibles cuando el catálogo calcula cero.

## Reglas de negocio y UX

- Un documento global del workspace debe seguir visible aunque haya una sede activa.
- Al crear desde una sede activa, esa sede aparece seleccionada por defecto, sin impedir que el gestor cambie las asociaciones.
- Con archivos existentes, Almacenamiento muestra lista, contador real, `Ver`, `Editar`, `Eliminar` y la acción para subir otro archivo.
- `Editar` reutiliza `DocumentoForm` en modal; no se crea una segunda interfaz de atributos.
- Entrenadores conservan solo lectura y los gestores mantienen mutaciones.
- El alcance por sede se obtiene una vez y los catálogos de proveedor lo reutilizan; no se introduce caché global manual.
- No se cambia schema, RLS, grants, cuota, RPC ni almacenamiento remoto.

## Checklist de implementación

- [x] Prueba RED para documento global visible con sede activa.
- [x] Prueba RED para reutilización del alcance sin repetir `documento_sedes` por proveedor.
- [x] Prueba RED para sede activa preseleccionada en el modal de alta.
- [x] Exponer `contentAssetId` en el tipo y mapper editorial.
- [x] Corregir lectura de asociados + globales sin incluir documentos de otras sedes.
- [x] Pasar los IDs ya resueltos a los catálogos y omitir consultas repetidas.
- [x] Mantener lista, subida adicional, edición y eliminación existentes.
- [x] Verificar desktop y móvil con el flujo autenticado disponible.
- [x] Actualizar seguimiento y auditoría tras verificación verde.

## Archivos previstos

- `src/types/documentos.ts`
- `src/services/documentos.service.ts`
- `src/services/content-assets.service.ts`
- `src/hooks/useContentAssets.ts`
- `src/components/documentos/DocumentosListView.tsx`
- `src/components/documentos/DocumentoForm.tsx`
- pruebas dirigidas de servicios y componentes del dominio
- `docs/backlog.md`, `docs/crud-audit.md` y este registro

## Plan de ejecución

`docs/plans/2026-08-16-corregir-listado-almacenamiento-documentos.md`

> **ESTADO:** EN PROGRESO.
> **FECHA DE INICIO:** 16/08/2026
> **RAMA:** actual (GIT off)

## Evidencia de ejecución — 16/08/2026

- Lint: PASS, 0 errores; dos warnings preexistentes ajenos.
- TypeScript: PASS en ronda 2.
- Pruebas dirigidas: 38/38 PASS en ocho archivos.
- Build Next.js 16: PASS.
- Navegador autenticado de solo lectura: modal de Storage verificado en escritorio y 375×667 con sede activa preseleccionada, cuerpo desplazable y acciones accesibles; no se crearon ni borraron datos.
- Suite global: 616 PASS / 11 FAIL por el trabajo concurrente `global-request-lock`; Documentos no presenta fallos.
- Supabase: `20260808180000` confirmado `local=remote`; no hubo migraciones ni escrituras de esquema/datos en esta tarea.
