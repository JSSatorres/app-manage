# Fix del selector de ejercicios al editar una sesión — Implementation Plan

**Goal:** Hacer que el formulario de edición de sesión cargue y despliegue todos los ejercicios asignables del workspace, incluidos los asociados a otra sede del mismo workspace, sin alterar el filtro del catálogo general de ejercicios.

**Architecture:** La sesión y el RPC de bloques ya aceptan cualquier ejercicio del mismo workspace, mientras que el formulario reutiliza por error el lookup sede/global del catálogo general. Se añadirá una consulta explícita para el contexto de sesiones, con caché diferenciada, y se conectará `SesionForm` a ese contrato. El arreglo se cerrará con pruebas de servicio y de UI que reproduzcan el caso cross-sede observado en los seeds.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, TanStack Query mediante el wrapper local `useQuery`, Base UI/shadcn y Vitest + Testing Library.

## Diagnóstico

- Síntoma reproducido por datos: `scripts/seed-demo-data.sql` vincula sesiones de una sede con ejercicios no globales propiedad de otra sede dentro del mismo workspace.
- Causa raíz: `SesionForm` carga ejercicios mediante `fetchEjercicios(sedeId, workspaceId)`, que limita el catálogo a globales o propios de la sede activa; `fetchSesionBloques` sí hidrata el `ejercicio_id` cross-sede y el RPC solo exige pertenencia al workspace.
- Efecto observable: `SesionBloquesEditor` no puede resolver el valor persistido ni ofrecerlo como opción; al guardar, el guard de `SesionForm` lo convierte en `null` y muestra los errores de la captura.
- Hipótesis descartada: el popup no queda detrás del diálogo; el select usa `z-[60]`, el diálogo `z-50` y Base UI contempla portales hijos.
- Feedback loop: pruebas dirigidas de `ejercicios.service`, `SesionForm` y `SesionBloquesEditor`, usando un ejercicio del mismo workspace y otra sede.
- Sin migración: no cambia esquema, RLS, RPC ni datos persistidos.

## Contratos e invariantes

- El catálogo general de ejercicios conserva su regla actual: globales o propios de la sede activa.
- El selector de bloques de una sesión sigue el contrato del RPC: cualquier ejercicio del mismo workspace es asignable.
- Un ejercicio de otro workspace nunca aparece ni puede superar la validación previa al guardado.
- Las claves de React Query de ambos catálogos deben ser distintas para impedir colisiones de caché.
- Mientras carga, el selector continúa deshabilitado; al terminar, se puede abrir y muestra las opciones recibidas.
- No se corrigen ni reescriben seeds, migraciones o registros existentes.

## Perfil de verificación

- Nivel: standard
- Motivo: corrección ordinaria de consulta y UI sin cambios de persistencia, auth, RLS, migraciones ni contrato multi-tenant; requiere estático, regresión dirigida, suite unitaria/integración y build de Next.js.
- Comandos: `npm test -- --run src/__tests__/services/tenant-scope.test.ts src/__tests__/components/SesionForm.test.tsx src/__tests__/components/SesionBloquesEditor.test.tsx`; `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`.
- Evidencias esperadas: el test de servicio demuestra consulta workspace-wide solo para sesiones; el test de formulario demuestra que editar ofrece el ejercicio cross-sede; el test del editor abre el combobox y ve la opción; lint, tipos, suite completa y build terminan con código 0.

## Incidencias de verificación

Ninguna.

## Cierre de verificación (17/08/2026, Europe/Madrid)

- Veredicto: **PASA** con perfil `standard`.
- Causa raíz corregida: `SesionForm` reutilizaba `fetchEjercicios(sedeId, workspaceId)`, cuyo catálogo limita los ejercicios a los globales o propios de la sede activa; ese filtro ocultaba ejercicios válidos del mismo workspace asociados a otra sede.
- Archivos funcionales: `src/services/ejercicios.service.ts`, `src/hooks/queryKeys.ts` y `src/components/sesiones/SesionForm.tsx`; cobertura ajustada en `src/__tests__/services/tenant-scope.test.ts`, `src/__tests__/components/SesionForm.test.tsx` y `src/__tests__/components/SesionBloquesEditor.test.tsx`.
- Evidencia verde: 3 archivos dirigidos, 42 tests; `npm run lint`; `npx tsc --noEmit`; suite completa de 109 archivos y 662 tests; `npm run build`, con 35 rutas generadas. El primer intento de build falló únicamente por red al descargar `next/font`; el reintento autorizado terminó en verde.
- E2E omitido conforme al perfil `standard`; no se detectaron incidencias major/critical.
- Decisiones documentales: `docs/backlog.md` permanece intacto porque no hay una entrada exacta y B2-4/B14-17 ya estaban completadas; `docs/crud-audit.md` y las guías de diseño permanecen intactos al no cambiar CRUD, convenciones ni stack.

---

### Task 1: Definir el lookup de ejercicios asignables a sesiones

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`.

**Files:**
- Modify: `src/services/ejercicios.service.ts` — añadir una función pública y específica del contexto de sesiones, sin cambiar `fetchEjercicios`.
- Modify: `src/hooks/queryKeys.ts` — añadir una clave estable y separada por `workspaceId` para el catálogo de sesiones.
- Test: `src/__tests__/services/tenant-scope.test.ts` — cubrir el nuevo contrato tenant.

**Step 1: RED — escribir una prueba de contrato de servicio**

Añadir un caso que invoque el nuevo lookup con `workspaceId` y pruebe, mediante el mock Supabase existente, que:

- aplica `.eq("workspace_id", workspaceId)`;
- no aplica el filtro `.or("es_global.eq.true,sede_propietaria_id.eq...")`;
- devuelve ejercicios del mismo workspace aunque tengan otra `sede_propietaria_id`;
- mantiene el manejo de errores según el patrón `ServiceResult` vecino.

La prueba debe observar la API pública del servicio y no detalles privados nuevos.

**Step 2: verificar RED** — Run: `npm test -- --run src/__tests__/services/tenant-scope.test.ts` · Expected: FAIL porque el lookup específico aún no existe o sigue aplicando el filtro por sede.

**Step 3: GREEN — implementar lo mínimo**

- Añadir el lookup workspace-wide con naming coherente con la guía de datos y `getSupabaseClient()`.
- Seleccionar las mismas columnas y mantener el mismo orden/resultado tipado que `fetchEjercicios`, pero limitar solo por `workspace_id`.
- Añadir una query key específica para sesiones; no reutilizar la key dependiente de sede.
- No modificar SQL, RLS, seeds ni el comportamiento de `fetchEjercicios` usado por el módulo general.

**Step 4: verificar GREEN** — Run: `npm test -- --run src/__tests__/services/tenant-scope.test.ts` · Expected: PASS.

**Step 5: autocomprobación barata** — Run: `npm run lint -- --file src/services/ejercicios.service.ts --file src/hooks/queryKeys.ts --file src/__tests__/services/tenant-scope.test.ts` si el script acepta `--file`; en caso contrario `npm run lint`. Después: `npx tsc --noEmit`. Expected: PASS.

**Commit:** omitido; `GIT=off`.

### Task 2: Conectar el formulario y bloquear la regresión del dropdown

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`.

**Files:**
- Modify: `src/components/sesiones/SesionForm.tsx` — usar el lookup/query key de sesiones sin depender de la sede para cargar ejercicios.
- Modify: `src/components/sesiones/SesionBloquesEditor.tsx` — solo si hace falta para representar explícitamente catálogo vacío o mantener el combobox operable; no cambiar el componente base `Select` sin una reproducción que lo exija.
- Test: `src/__tests__/components/SesionForm.test.tsx` — integración de edición con bloque cross-sede y catálogo workspace-wide.
- Test: `src/__tests__/components/SesionBloquesEditor.test.tsx` — interacción real con el combobox de ejercicio.

**Step 1: RED→GREEN vertical — selector con opciones**

- Montar `SesionBloquesEditor` con al menos un ejercicio y un bloque.
- Abrir mediante la etiqueta accesible `Ejercicio del bloque 1`.
- Comprobar que la opción del ejercicio es visible/seleccionable y que `onChange` recibe su ID.
- Ejecutar: `npm test -- --run src/__tests__/components/SesionBloquesEditor.test.tsx` · Expected antes del ajuste de prueba/harness: FAIL reproduciendo la ausencia de cobertura; después de la mínima adaptación necesaria: PASS.

**Step 2: RED — edición con ejercicio cross-sede del mismo workspace**

En `SesionForm.test.tsx`, adaptar únicamente el caso de regresión para que el seam ejercite el catálogo que el formulario entrega al editor. Preparar:

- sesión y bloque persistido de la sede A;
- ejercicio del mismo workspace con `sedePropietariaId` de la sede B;
- respuesta del nuevo lookup que contiene ese ejercicio.

Assert observable: el formulario conserva el `ejercicioId`, lo ofrece al editor y el guardado no lo convierte en `null` por no pertenecer a la sede activa.

**Step 3: verificar RED** — Run: `npm test -- --run src/__tests__/components/SesionForm.test.tsx` · Expected: FAIL mientras `SesionForm` siga consultando con el filtro por sede o use la key anterior.

**Step 4: GREEN — conectar el contrato correcto**

- Sustituir únicamente la consulta de ejercicios de `SesionForm` por el lookup workspace-wide y su query key específica.
- Mantener `enabled`, loading, invalidación y validación de IDs externos al workspace según patrones existentes.
- No relajar el guard multi-tenant ni retirar la validación de ejercicios que realmente no estén disponibles.
- Si el test demuestra que el catálogo vacío deja una interacción engañosa, renderizar el texto español `No hay ejercicios disponibles` dentro del dropdown; no ampliar el alcance a rediseñar `Select`.

**Step 5: verificar GREEN** — Run: `npm test -- --run src/__tests__/components/SesionForm.test.tsx src/__tests__/components/SesionBloquesEditor.test.tsx src/__tests__/services/tenant-scope.test.ts` · Expected: PASS.

**Step 6: autocomprobación barata** — Run: `npm run lint`; `npx tsc --noEmit`. Expected: PASS.

**Commit:** omitido; `GIT=off`.

### Task 3 (final, después de que el verifier pase): Actualizar documentación

**Skills:** ninguna adicional; tarea documental, sin código de producción.

**Files:**
- Inspect/Modify only if an exact existing item applies: `docs/backlog.md`.
- Inspect/Modify only if CRUD scope materially changes: `docs/crud-audit.md`.
- Modify only if a convention or stack changes: `docs/design-guides/frontend_styleguide.md` or `docs/design-guides/data_styleguide.md`.

**Steps:**

1. Confirmar el veredicto `PASA` del perfil standard antes de tocar documentación de cierre.
2. No marcar B2-4 ni B14-17: ya estaban completadas y no son esta incidencia.
3. No inventar una tarea de backlog. Si no existe una entrada exacta, dejar `docs/backlog.md` intacto y registrar esa decisión en el HANDOFF.
4. No modificar `docs/crud-audit.md` ni design-guides si el arreglo no cambia CRUD, convenciones o stack.
5. Registrar en este plan la evidencia final de verificación y mantener `## Incidencias de verificación` vacío si no hubo fallos major/critical.

**Commit:** omitido; `GIT=off`.
