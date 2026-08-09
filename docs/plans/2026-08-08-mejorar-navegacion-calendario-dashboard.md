# Mejorar navegación del calendario del dashboard Implementation Plan

**Goal:** Permitir navegar entre semana y mes con un chip visual coherente que identifique el número de sesiones en cada día con actividad y una vista mensual compacta y cuadriculada.

**Architecture:** `DashboardPage` conserva `diaActivo` como fuente de verdad, deriva en una sola pasada los conteos de todas las sesiones filtradas y delega la interfaz temporal a un componente de dominio. El navegador reutiliza `Calendar`, `CalendarDayButton` y `Popover`, muestra de forma excluyente la banda semanal o una cuadrícula mensual compacta y comunica cada selección mediante fechas ISO locales, sin tocar servicios, el calendario base ni persistencia.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estricto, Tailwind CSS v4, shadcn/ui, Base UI Popover, react-day-picker 9.14, Vitest y Testing Library.

## Perfil de verificación

- Nivel: standard
- Motivo: nueva interacción responsive con estado React y accesibilidad en una pantalla autenticada; no cambia auth, permisos, datos ni persistencia.
- Comandos: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx src/__tests__/components/dashboard.test.tsx`; `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`; inspección visual e interacción a 320×667, 375×667 y 1280×800.
- Evidencias esperadas: alternancia exclusiva semana/mes; selector emergente con mes y año; cuadrícula mensual compacta; chip único, reconocible y correcto en semana y mes; selección que actualiza fecha, rango y sesiones; teclado, foco y móvil sin overflow; cero regresiones del dashboard.

## Incidencias de verificación

<!-- Se rellena durante la ejecución solo para fallos major/critical. -->

---

## Contrato funcional

- Estado inicial: vista semanal.
- Botón de calendario: `semana → mes → semana`; su `aria-label` cambia entre «Ver calendario mensual» y «Ver semana» y expone `aria-pressed`.
- Rango semanal: botón que abre/cierra un `Popover`; su texto visible conserva el formato actual.
- Selector emergente: `Calendar` en español, selección simple, `captionLayout="dropdown"`, `startMonth={new Date(2000, 0)}` y `endMonth={new Date(2100, 11)}`.
- Selección desde el emergente: emite ISO local `YYYY-MM-DD`, cierra el popover y mantiene el modo semana/mes actual.
- Selección desde el mes: emite ISO local y mantiene visible el mes hasta que el usuario pulse de nuevo el icono.
- Cambio anterior/siguiente: desplaza siete días en modo semanal y un mes en modo mensual, evitando que la etiqueta del control contradiga la acción.
- Hoy: activa la fecha local actual sin forzar un cambio de modo.
- Conteos: `sessionCountByDay` incluye todas las sesiones que superan los filtros activos, aunque estén fuera de la semana seleccionada.
- Día semanal y mensual: muestran la fecha y, solo cuando el conteo es mayor que cero, el mismo chip visual; el nombre accesible del botón añade «N sesión/sesiones».
- Densidad mensual: siete columnas con celdas de al menos 44 px, bordes compartidos y ancho intrínseco o acotado; no debe estirarse hasta ocupar toda la columna principal.

## Decisiones prohibidas

- No mostrar simultáneamente la banda semanal y el calendario mensual.
- No usar `input type="date"`; no ofrece una experiencia consistente de navegación por mes/año entre navegadores.
- No añadir una segunda librería de calendario ni editar el componente base `src/components/ui/calendar.tsx` salvo que una prueba demuestre un defecto global.
- No cambiar el formato visible del rango, los filtros, las sesiones, los datos o el diálogo.
- No convertir fechas locales a UTC para el estado del calendario; evitar desplazamientos de día por zona horaria.
- No introducir estado global ni consultas nuevas.
- No cerrar el calendario mensual al elegir un día; el cambio de modo es una acción explícita del icono.
- No contar únicamente `sesionesPorDia`, porque ese mapa está limitado a `weekDays` y omitiría el resto del mes.
- No mostrar chips con cero, duplicar el contador fuera del día ni codificar la cantidad solo por color.
- No conservar el contador semanal como texto desnudo: debe tener superficie, borde/forma y separación suficientes para leerse como indicador de sesiones.
- No modificar `src/components/ui/calendar.tsx`: el tratamiento cuadriculado y el botón con contador son específicos del dashboard.

### Task 1: Proteger el contrato de navegación con TDD

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management` para estado local con hooks.

**Files:**
- Create: `src/__tests__/components/DashboardCalendarNavigator.test.tsx`
- Modify: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Escribir el test RED de alternancia exclusiva**

- Renderizar el navegador con `activeDay="2026-08-08"`, semana y conteos controlados.
- Comprobar que «Días de la semana» está visible y el calendario mensual no.
- Pulsar «Ver calendario mensual» y comprobar que aparece el mes, desaparece la semana y el control pasa a «Ver semana» con `aria-pressed="true"`.
- Pulsar de nuevo y comprobar el retorno exacto a la semana.

**Step 2: Ejecutar el test dirigido** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx` · Expected: FAIL porque el componente aún no existe.

**Step 3: Escribir el test RED del selector de fecha**

- Pulsar el botón «3–9 Ago 2026».
- Afirmar que el popover contiene dos `combobox` accesibles para mes y año y el calendario de agosto de 2026.
- Elegir otra fecha y comprobar `onDateChange("2026-08-17")` y cierre del popover.

**Step 4: Escribir la regresión de integración**

- En `dashboard.test.tsx`, seleccionar una fecha desde el nuevo navegador y comprobar que el rango semanal y el encabezado de sesiones reflejan la nueva semana/día.
- Conservar las pruebas existentes de siete días, filtros y apertura del detalle.

### Task 2: Crear el navegador calendario del dashboard

**Skills:** `tdd`, `react-state-management` para estado local con `useState`/props controladas.

**Files:**
- Create: `src/components/dashboard/DashboardCalendarNavigator.tsx`
- Test: `src/__tests__/components/DashboardCalendarNavigator.test.tsx`

**Step 1: Definir el contrato tipado**

- Props mínimas: `activeDay`, `weekDays`, `weekRange`, `sessionCountByDay` y `onDateChange`.
- Mantener utilidades puras de conversión fecha local ↔ ISO junto al componente o exportarlas solo si las pruebas las necesitan.
- Representar el modo con una unión literal `"week" | "month"`; no usar dos booleanos incompatibles.

**Step 2: Implementar controles compartidos**

- Mantener anterior, rango, siguiente, Hoy e icono con tamaño táctil mínimo de 44 px.
- Hacer del rango el `PopoverTrigger`; conservar el texto y añadir un nombre accesible que explique «Elegir fecha».
- Cambiar acción y etiqueta de anterior/siguiente según el modo: semana o mes.

**Step 3: Implementar el selector emergente**

- Renderizar `Calendar` con localización española, modo simple, mes controlado por la fecha activa, dropdowns de mes/año y límites 2000–2100.
- Al seleccionar, convertir sin UTC, emitir `onDateChange` y cerrar el popover.
- Asegurar cierre por Escape/clic exterior mediante el comportamiento nativo de `Popover`.

**Step 4: Implementar vistas mutuamente excluyentes**

- En modo semana, renderizar exactamente la cuadrícula actual de siete columnas, estados activo/hoy y contadores.
- En modo mes, renderizar `Calendar` a ancho disponible, con la fecha activa seleccionada y sin la banda semanal.
- Mantener el modo mensual después de seleccionar un día.

**Step 5: Ejecutar tests** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx` · Expected: PASS.

### Task 3: Integrar el navegador sin cambiar contenido ni datos

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Sustituir la implementación embebida**

- Retirar `MiniCalendar`, `showCalendar` y los bloques JSX de navegación/banda/mini calendario ahora encapsulados.
- Importar `DashboardCalendarNavigator` y pasar `diaActivo`, `weekDays`, `weekRange`, conteos y `setDiaActivo`.
- Conservar en la página filtros, cálculo de sesiones, panel lateral y diálogo sin reformular contenido.

**Step 2: Mantener los conteos por día**

- Derivar un mapa tipado de números desde `sesionesPorDia` o aceptar el mapa existente sin exponer las sesiones completas al componente visual.
- Confirmar que cambiar de fecha recalcula `weekDays`, `sesionesPorDia` y `sesionesDiaActivo` mediante los `useMemo` existentes.

**Step 3: Ejecutar tests dirigidos** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx src/__tests__/components/dashboard.test.tsx` · Expected: PASS.

### Task 4: Verificación técnica y visual

**Files:**
- Verify: `src/components/dashboard/DashboardCalendarNavigator.tsx`
- Verify: `src/app/(dashboard)/dashboard/page.tsx`
- Verify: `src/__tests__/components/DashboardCalendarNavigator.test.tsx`
- Verify: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Verificación estática y completa**

- Run: `npm run lint` · Expected: PASS.
- Run: `npx tsc --noEmit` · Expected: PASS.
- Run: `npm test -- --run` · Expected: PASS.
- Run: `npm run build` · Expected: PASS; si `next/font` necesita red, solicitar autorización y reintentar sin cambiar código.

**Step 2: Verificación de intención con navegador**

- Usar `agent-browser` con sesión E2E autenticada si está disponible.
- Probar a 320×667, 375×667 y 1280×800: abrir rango, cambiar mes y año, seleccionar fecha, alternar semana/mes dos veces, usar anterior/siguiente y Hoy.
- Confirmar foco visible, Escape/clic exterior, ausencia de overflow y que sesiones/filtros siguen operativos.
- Si faltan credenciales E2E, documentar el bloqueo y no inventarlas.

### Task 5: Actualizar documentación del alcance inicial

**Files:**
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-mejorar-navegacion-calendario-dashboard-08-08-2026.md`
- Modify: `docs/backlog.md`
- Modify if needed: `docs/design-guides/frontend_styleguide.md`

**Steps:**

- Pasar TASK-005 a `en_progreso` al comenzar la ejecución aprobada y registrar las evidencias técnicas al terminar.
- Añadir y marcar el elemento del backlog del bloque de shell/dashboard.
- Mantener `en_progreso` hasta validación humana; `finalizada` exige fecha y rama.
- No modificar `docs/crud-audit.md`: no cambia ningún CRUD.
- Actualizar la guía frontend solo si aparece una convención reutilizable nueva, no por una implementación local.

## Ampliación confirmada — contadores y cuadrícula compacta (08/08/2026)

### Task 6: Proteger los chips de semana y mes con TDD

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**
- Modify: `src/__tests__/components/DashboardCalendarNavigator.test.tsx`
- Modify: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Escribir un test RED del chip semanal**

- Renderizar la semana con un día sin sesiones, uno con una sesión y otro con varias.
- Comprobar que los dos días con actividad contienen un indicador identificado como «1 sesión» y «N sesiones», mientras el día vacío no muestra indicador.
- Confirmar que el nombre accesible de cada botón de día incluye fecha y conteo, evitando que el número quede sin contexto.

**Step 2: Ejecutar el test dirigido** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx` · Expected: FAIL porque el contador semanal actual es texto sin tratamiento ni contexto en el nombre del botón.

**Step 3: Implementar el chip semanal mínimo**

- Extraer un `SessionCountChip` local, no interactivo, con superficie, forma y texto accesible reutilizables.
- Reemplazar el número semanal suelto y ampliar el `aria-label` del botón del día con singular/plural.

**Step 4: Ejecutar el test semanal** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx` · Expected: PASS.

**Step 5: Escribir un test RED del chip mensual**

- Renderizar el navegador con conteos en dos fechas de agosto, una de ellas fuera de `weekDays`.
- Cambiar a «Ver calendario mensual».
- Comprobar mediante roles/nombres accesibles que cada día con actividad anuncia su fecha y «N sesión/sesiones», y contiene un único chip con ese número.
- Comprobar que un día con conteo cero no contiene chip.

**Step 6: Ejecutar el test dirigido** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx` · Expected: FAIL porque el mes aún no renderiza conteos.

**Step 7: Implementar el mínimo comportamiento observable**

- Añadir el botón de día específico del dashboard y pasarle el mapa existente sin cambiar la API pública del componente.
- Reutilizar `SessionCountChip`; mantener el día completo como único control interactivo y no crear un botón anidado.

**Step 8: Ejecutar el test dirigido** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx` · Expected: PASS.

**Step 9: Escribir la integración RED de conteos fuera de la semana**

- En `dashboard.test.tsx`, incluir varias sesiones filtrables en una fecha del mismo mes pero fuera de la semana activa.
- Abrir el mes y comprobar que el día correspondiente anuncia el total correcto.
- Verificar que los filtros existentes siguen determinando el conteo y que el panel lateral continúa mostrando solo el día activo.

**Step 10: Ejecutar los tests dirigidos** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx src/__tests__/components/dashboard.test.tsx` · Expected: FAIL hasta ampliar el mapa de conteos en la página.

### Task 7: Crear el día con contador y la cuadrícula mensual compacta

**Skills:** `tdd`, `vercel-react-best-practices`.

**Files:**
- Modify: `src/components/dashboard/DashboardCalendarNavigator.tsx`
- Test: `src/__tests__/components/DashboardCalendarNavigator.test.tsx`

**Step 1: Añadir un `DayButton` local y estable**

- Reutilizar `CalendarDayButton` y los tipos públicos de `react-day-picker` 9.14.
- Obtener el ISO local desde `day.date`, consultar `sessionCountByDay` y conservar `props`, `day` y `modifiers` para no romper selección, foco ni teclado.
- Reutilizar el mismo `SessionCountChip` de la semana solo con conteos positivos y ampliar el `aria-label` del botón con singular/plural en español.
- Mantener estable la identidad del componente personalizado —por ejemplo mediante un contexto local al módulo— para evitar remontajes de las celdas durante la navegación.

**Step 2: Acotar el calendario mensual**

- Sustituir el estiramiento `w-full` por una composición de ancho intrínseco/acotado con celdas de 44 px.
- Añadir bordes compartidos y sutiles a cabeceras y días mediante selectores locales del calendario del dashboard.
- Mantener el número y el chip legibles en estados normal, hover, hoy, seleccionado, fuera de mes y dark mode.
- Permitir overflow horizontal contenido solo como salvaguarda en anchos extremos, sin reducir los objetivos táctiles por debajo de 44 px.

**Step 3: Ejecutar el test del componente** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx` · Expected: PASS.

### Task 8: Derivar conteos de todas las sesiones filtradas

**Skills:** `tdd`, `javascript-testing-patterns`, `vercel-react-best-practices`.

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Ampliar `sessionCountByDay`**

- Derivar el mapa directamente desde `sesionesFiltradasTotal` en una única iteración, sin ordenar ni copiar sesiones completas.
- Conservar `sesionesPorDia` limitado a `weekDays` para el panel semanal y `sesionesDiaActivo`; no mezclar ambas responsabilidades.
- Mantener las dependencias primitivas/estables de `useMemo` y no añadir consultas, efectos ni estado duplicado.

**Step 2: Ejecutar la integración** — Run: `npx vitest run src/__tests__/components/DashboardCalendarNavigator.test.tsx src/__tests__/components/dashboard.test.tsx` · Expected: PASS.

### Task 9: Verificar comportamiento y composición visual

**Files:**
- Verify: `src/components/dashboard/DashboardCalendarNavigator.tsx`
- Verify: `src/app/(dashboard)/dashboard/page.tsx`
- Verify: `src/__tests__/components/DashboardCalendarNavigator.test.tsx`
- Verify: `src/__tests__/components/dashboard.test.tsx`

**Step 1: Verificación técnica**

- Run: `npm run lint` · Expected: PASS.
- Run: `npx tsc --noEmit` · Expected: PASS.
- Run: `npm test -- --run` · Expected: PASS.
- Run: `npm run build` · Expected: PASS.
- Run: `node C:\Users\juans\.codex\skills\impeccable\scripts\detect.mjs --json src/components/dashboard/DashboardCalendarNavigator.tsx src/app/(dashboard)/dashboard/page.tsx` · Expected: `[]` o hallazgos corregidos/documentados.

**Step 2: Inspección visual acotada**

- Con sesión autenticada disponible, comprobar el mes a 320×667, 375×667 y 1280×800 en light y dark.
- Confirmar cuadrícula identificable, ancho compacto, chips semanales y mensuales inequívocos y no solapados, selección/foco visibles, conteos correctos con filtros y ausencia de overflow de página.
- Si `/dashboard` vuelve a redirigir a `/login`, documentar la limitación sin inventar credenciales ni automatizar OAuth.

### Task 10 (final): Actualizar documentación

**Files:**
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-mejorar-navegacion-calendario-dashboard-08-08-2026.md`
- Modify: `docs/backlog.md`
- Modify if needed: `docs/design-guides/frontend_styleguide.md`

**Steps:**

- Registrar la evidencia de la nueva verificación STANDARD y mantener `TASK-005` en `en_progreso` hasta validación humana.
- Actualizar B16-3 con los contadores y la cuadrícula verificados.
- Actualizar la guía frontend solo si la implementación introduce una convención reutilizable; no modificar `docs/crud-audit.md` porque no cambia CRUD ni datos.

**Estado (08/08/2026):** completada la ampliación. Evidencia: 10/10 tests dirigidos; suite 44 archivos/262 tests; lint, typecheck y build Next.js 16.2.1 en verde; detector Impeccable `[]`. El build necesitó acceso de red exclusivamente para descargar las fuentes declaradas con `next/font`. La inspección visual autenticada no fue viable porque `/dashboard` redirigió a `/login`; no se inventaron credenciales. TASK-005 continúa `en_progreso` hasta validación humana.
