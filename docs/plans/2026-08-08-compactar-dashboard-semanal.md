# Compactar dashboard semanal Implementation Plan

**Goal:** Reducir la altura del dashboard y mostrar los siete días de la semana en una sola fila en escritorio y móvil, con un encabezado consistente con los demás módulos y sin la franja de métricas redundante.

**Architecture:** La composición y el estado del dashboard permanecen intactos. Se reutiliza `PageHeader`, se elimina un bloque JSX aislado y se ajusta la cuadrícula semanal con estilos mobile-first; los tests existentes se amplían para proteger la información no duplicada y los siete controles diarios.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Vitest y Testing Library.

## Perfil de verificación

- Nivel: standard
- Motivo: cambio responsive y de jerarquía visual en una pantalla autenticada, sin modificar datos, auth, permisos ni persistencia.
- Comandos: `npx vitest run src/__tests__/components/dashboard.test.tsx`; `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`; inspección visual a 320×667, 375×667, 768×900 y 1280×800 cuando exista sesión E2E.
- Evidencias esperadas: siete días visibles en una sola fila sin overflow; encabezado con patrón `PageHeader`; franja de métricas ausente; filtros, navegación y apertura de sesión operativos.

## Incidencias de verificación

<!-- Se rellena durante la ejecución solo para fallos major/critical. -->

---

## Contrato visual

- Dirección existente: «Banquillo editorial», preservada.
- Modo: Operate; densidad compacta y escaneable.
- Ruta primaria: encabezado y filtros → navegación semanal → selección de día → sesiones del día.
- El encabezado deja de dominar la página y adopta la escala exacta de `PageHeader`.
- La semana es una banda horizontal de siete celdas equivalentes, no una colección de tarjetas grandes.
- En móvil la banda usa el ancho disponible hasta márgenes seguros; no se oculta ningún día ni se introduce carrusel.

## Decisiones prohibidas

- No cambiar el contenido de las sesiones ni eliminar el panel lateral/listado de sesiones.
- No eliminar el rango semanal de los controles anterior/siguiente.
- No ocultar filtros en móvil ni convertirlos en un flujo distinto.
- No introducir scroll horizontal para los días.
- No tocar hooks, servicios, fechas, ordenación, consultas o `SesionDetalleDialog`.
- No modificar `PageHeader` global para resolver únicamente esta pantalla.

## Ampliación confirmada — 08/08/2026

- El usuario aporta `codex-clipboard-5267f189-8f33-4608-8b9a-1e8fffd58220.png` y pide retirar el texto «Sesiones del club ordenadas por fecha y hora».
- La implementación elimina únicamente la prop `description` del `PageHeader` del dashboard.
- Se añade una regresión que confirma que el subtítulo ya no se renderiza; título, filtros y resto de contenido permanecen intactos.

### Task 1: Proteger la composición compacta

**Files:**
- Modify: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Añadir el test RED de información no duplicada**

- Renderizar `DashboardPage` con la fecha fija y fixture existentes.
- Afirmar que el rango `3–9 Ago 2026` aparece una sola vez: en la navegación semanal, no también en la franja eliminada.
- Ejecutar: `npx vitest run src/__tests__/components/dashboard.test.tsx` · Expected: FAIL porque actualmente aparece dos veces.

**Step 2: Añadir el test RED de los siete días**

- Localizar los siete botones diarios por sus etiquetas/números dentro del selector semanal.
- Añadir al selector un nombre accesible estable, por ejemplo `aria-label="Días de la semana"`, y proteger que contiene siete controles.
- Proteger el contrato responsive de una fila mediante la clase `grid-cols-7`, ya que jsdom no calcula media queries.
- Ejecutar: mismo comando · Expected: FAIL porque la cuadrícula actual usa dos/cinco columnas.

### Task 2: Normalizar encabezado y retirar redundancia

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx:351-417`
- Test: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Sustituir el encabezado ad hoc**

- Importar y renderizar `PageHeader` con `title="Panel de rendimiento"` y `description="Sesiones del club ordenadas por fecha y hora"`.
- Mantener los tres `MultiSelect` en una fila compacta inmediatamente posterior, con `aria-label="Filtros del panel"`.
- No pasar los tres filtros por el slot `action`, porque `PageHeader` está optimizado para una acción corta y podría comprimir el título en móvil.

**Step 2: Eliminar la franja de resúmenes**

- Retirar el `<section>` que muestra total de sesiones, `weekRange` y fecha activa con cifras.
- Mantener `sesionesFiltradasTotal`, `weekRange` y `formatFechaLarga` porque siguen siendo necesarios para filtrar, navegar y contextualizar el panel de sesiones.

**Step 3: Ejecutar tests** — Run: `npx vitest run src/__tests__/components/dashboard.test.tsx` · Expected: el test de rango único pasa; las interacciones existentes siguen verdes.

### Task 3: Compactar la banda semanal en web y móvil

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx:419-525`
- Test: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Reducir el ritmo vertical**

- Reducir el `space-y` principal y los paddings de navegación/calendario sin bajar los controles interactivos por debajo de una altura táctil útil.
- Mantener los botones anterior, siguiente, Hoy y calendario mensual con al menos 44 px de alto.

**Step 2: Convertir la semana en una sola fila**

- Usar `grid-cols-7` desde el breakpoint base; eliminar `grid-cols-2`, `min-[701px]:grid-cols-5` y los `col-span` especiales del último día.
- En móvil usar márgenes horizontales negativos acotados para recuperar ancho útil dentro del padding de página, sin generar overflow del viewport.
- Centrar contenido diario, reducir padding horizontal, bajar la cifra a una escala compacta y conservar estado activo/cantidad de sesiones.
- Mantener cada celda con altura suficiente para interacción táctil y foco visible.

**Step 3: Ejecutar tests** — Run: `npx vitest run src/__tests__/components/dashboard.test.tsx` · Expected: PASS.

### Task 4: Verificación técnica y visual

**Files:**
- Verify: `src/app/(dashboard)/dashboard/page.tsx`
- Verify: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Verificación estática y unitaria**

- Run: `npm run lint` · Expected: PASS.
- Run: `npx tsc --noEmit` · Expected: PASS.
- Run: `npm test -- --run` · Expected: PASS.
- Run: `npm run build` · Expected: PASS; si `next/font` requiere red, reintentar con autorización sin cambiar código.

**Step 2: Verificación visual en una ronda agrupada**

- Inspeccionar dashboard a 320×667, 375×667, 768×900 y 1280×800.
- Confirmar: siete días visibles; sin scroll horizontal; cabecera equivalente a otros módulos; filtros utilizables; panel de sesiones legible; foco visible; selección de día y sesión operativas.
- Si falta sesión E2E, documentar el bloqueo y no inventar credenciales.

**Step 3: Ejecutar detector Impeccable una vez al final**

- Run: `node C:\Users\juans\.codex\skills\impeccable\scripts\detect.mjs --json --scope layout "src/app/(dashboard)/dashboard/page.tsx"`.
- Resolver únicamente hallazgos mecánicos relacionados con esta tarea.

### Task 5 (final): Actualizar documentación

**Files:**
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-compactar-dashboard-semanal-08-08-2026.md`
- Modify: `docs/backlog.md`
- Modify if needed: `docs/design-guides/frontend_styleguide.md`

**Pasos:**

- Tras verificación, registrar evidencia en TASK-003 y mantener `en_progreso` hasta confirmación humana de cierre.
- Añadir/marcar la incidencia en el bloque de shell/dashboard del backlog.
- No modificar `docs/crud-audit.md`; no cambia ningún CRUD.
- No actualizar la design guide salvo que la implementación introduzca una convención responsive reutilizable nueva.
