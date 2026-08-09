# Tarea Maestra — Mejorar la navegación del calendario del dashboard

## Contexto

El dashboard muestra una semana compacta y dispone de un mini calendario mensual separado. Las capturas del 08/08/2026 concretan dos interacciones complementarias que deben resultar familiares en web y móvil:

- el botón con icono de calendario alterna entre la fila de siete días y el mes completo;
- el texto del rango semanal, por ejemplo «3–9 Ago 2026», abre un selector de fecha clásico con navegación directa por mes y año.
- semana y mes deben usar el mismo chip visual para identificar el número de sesiones de cada día; el mes completo debe además ocupar menos altura y delimitar cada día con una cuadrícula sutil.

## Reglas de producto y UX

- La vista inicial sigue siendo semanal y muestra los siete días en una sola fila.
- Al pulsar el icono de calendario, la vista mensual sustituye a la banda semanal; no deben mostrarse ambas a la vez.
- Al volver a pulsar el icono, reaparece únicamente la semana correspondiente al día activo.
- El rango semanal se convierte en un botón accesible que abre un calendario emergente.
- El selector emergente permite cambiar mes y año y elegir un día; al elegirlo, actualiza `diaActivo`, el rango semanal y el listado de sesiones.
- La selección de una fecha desde el emergente lo cierra y conserva la vista semana/mes que estuviera activa.
- Los botones anterior, siguiente y Hoy mantienen su comportamiento actual.
- La navegación por años cubrirá 2000–2100, suficiente para el dominio y explícita para no depender del límite implícito de `react-day-picker`.
- Los contadores mensuales respetan los filtros activos de sede, período y estado, y abarcan todas las fechas visibles, no solo la semana activa.
- Los días sin sesiones no muestran chip; los que tienen actividad presentan un badge claramente reconocible, no un número suelto debajo de la fecha.
- El chip semanal y el mensual comparten lenguaje visual, singular/plural accesible y contraste suficiente en estados normal, seleccionado y dark mode.
- La cuadrícula mensual conserva objetivos táctiles mínimos de 44 px, foco visible, selección, hoy y días exteriores, aunque reduzca la extensión total del calendario.
- Se conserva la identidad «Banquillo editorial», el contenido, los filtros, las sesiones, el diálogo y las consultas existentes.
- Debe funcionar con ratón, teclado y táctil, sin desbordamiento horizontal a 320 px.

## Arquitectura

- Extraer la navegación temporal de la página a `src/components/dashboard/DashboardCalendarNavigator.tsx` para aislar estado visual, accesibilidad y pruebas.
- Mantener `diaActivo` como única fuente de verdad en `DashboardPage`; el componente recibe la fecha y emite `onDateChange(iso)`.
- Reutilizar `src/components/ui/calendar.tsx` y `src/components/ui/popover.tsx`, basados en `react-day-picker` y Base UI; no añadir dependencias.
- Usar `captionLayout="dropdown"`, localización española y límites explícitos para ofrecer selectores de mes y año.
- Mantener en la página el cálculo de sesiones por día y entregar al navegador un mapa de conteos de todas las sesiones filtradas para reutilizarlo en semana y mes.
- Personalizar el contenido del botón de día solo dentro de `DashboardCalendarNavigator`, reutilizando `CalendarDayButton`; no modificar `src/components/ui/calendar.tsx` ni afectar otros calendarios.

## Criterios de aceptación

- [x] La semana es la vista inicial.
- [x] El icono cambia de semana a mes y de mes a semana.
- [x] Semana y mes nunca aparecen simultáneamente.
- [x] El rango abre un selector emergente con controles de mes y año.
- [x] Elegir una fecha actualiza el rango, la semana/mes activa y las sesiones del día.
- [x] Los controles anuncian su estado y propósito en español.
- [ ] La interacción es utilizable a 320 px y en escritorio, sin overflow (pendiente de validación visual autenticada).
- [ ] No cambian filtros, contenido, datos, rutas, permisos ni persistencia.
- [x] Tests, lint, TypeScript, suite y build quedan verdes.
- [x] El mes se implementa como una cuadrícula compacta de celdas táctiles de 44 px, claramente delimitada y sin estirarse por toda la columna.
- [x] Cada día con sesiones muestra un único chip inequívoco tanto en semana como en mes; los días con cero sesiones no muestran chip.
- [x] Los conteos mensuales incluyen sesiones fuera de la semana activa y cambian con los filtros existentes.
- [x] El nombre accesible de cada día comunica también el número de sesiones cuando existe.

## Archivos previstos

- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/dashboard/DashboardCalendarNavigator.tsx`
- `src/__tests__/components/DashboardCalendarNavigator.test.tsx`
- `src/__tests__/components/dashboard.test.tsx`
- `task/REGISTRO-TAREAS.md`
- `task/task-mejorar-navegacion-calendario-dashboard-08-08-2026.md`
- `docs/backlog.md`

## Plan de ejecución

- Registro: TASK-005 en `task/REGISTRO-TAREAS.md`
- Plan técnico: `docs/plans/2026-08-08-mejorar-navegacion-calendario-dashboard.md`

## Estado de ejecución — 08/08/2026

TASK-005 permanece en `en_progreso` hasta la validación humana. La verificación técnica fue satisfactoria:

- Tests dirigidos: 2 archivos, 7/7 PASS.
- Lint: PASS.
- Typecheck: PASS.
- Suite completa: `npm.cmd test -- --run`, 44 archivos y 259 tests PASS en 16.60 s.
- Build: Next.js 16.2.1 PASS, 25 rutas.
- Verifier independiente STANDARD: PASA, sin incidencias.

La validación visual/E2E no se ejecutó. `/dashboard` redirige a `/login`, no existe `.env.test.local` ni una sesión autenticada reutilizable; no se inventaron credenciales ni se condujo OAuth. Queda pendiente comprobar la interacción autenticada, incluida la vista a 320 px y en escritorio.

El 08/08/2026 el usuario amplió y confirmó el alcance con chips de sesiones por día en semana y mes, cuadrícula mensual y reducción del tamaño del mes. Aclaró que el número semanal anterior parecía texto suelto y no comunicaba qué representaba. La ampliación se ejecutó como segunda fase del mismo plan.

## Estado de la ampliación — 08/08/2026

La ampliación está implementada y superó el perfil STANDARD:

- Tests dirigidos: 2 archivos, 10/10 PASS.
- Suite completa: 44 archivos, 262/262 PASS.
- Lint, TypeScript y build Next.js 16.2.1: PASS.
- Detector Impeccable sobre los dos archivos de producción: `[]`.
- El primer build falló únicamente por el bloqueo de red de `next/font`; el mismo build pasó al permitir la descarga de Geist, Geist Mono y Roboto Condensed.

La inspección visual real sigue pendiente: `http://localhost:3000/dashboard` redirige a `/login` y no se usaron credenciales ni OAuth. TASK-005 permanece `en_progreso` hasta validación humana.
