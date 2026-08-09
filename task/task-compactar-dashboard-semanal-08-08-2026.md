# Tarea Maestra — Compactar el dashboard semanal

## Contexto

El dashboard «Panel de rendimiento» conserva la identidad editorial aprobada, pero su densidad actual consume demasiado espacio en escritorio y móvil. El encabezado usa una escala tipográfica mayor que el resto de módulos, una franja de tres resúmenes repite información ya disponible y el selector semanal distribuye los siete días en varias filas.

El usuario confirma el 08/08/2026 que quiere:

- ver los siete días completos en una sola fila tanto en web como en móvil;
- reducir el tamaño de los cuadros del calendario semanal;
- eliminar la franja bajo el título que muestra «Sesiones», rango semanal y fecha activa con sus cifras;
- hacer que «Panel de rendimiento» use el mismo encabezado que Entrenadores y las demás secciones.
- retirar el subtítulo «Sesiones del club ordenadas por fecha y hora» marcado en la segunda captura.

## Reglas de producto y UX

- El rango semanal se elimina solo de la franja redundante; permanece en la navegación entre semanas.
- La fecha activa y el número de sesiones permanecen en el panel lateral de sesiones, donde aportan contexto directo.
- Los siete botones de día deben verse simultáneamente en una fila, sin scroll horizontal.
- En móvil la cuadrícula puede ocupar el ancho útil hasta los márgenes seguros, manteniendo altura táctil suficiente.
- Se conservan filtros, cambio de semana, botón Hoy, calendario mensual, selección de día, listado y diálogo de sesión.
- No se alteran consultas, datos, copy funcional, permisos ni handlers.

## Arquitectura

- Reutilizar `PageHeader` para igualar tipografía, borde y espaciado al resto de módulos.
- Mantener los filtros inmediatamente después del encabezado en una fila compacta y flexible.
- Eliminar únicamente el `<section>` de resúmenes redundantes.
- Cambiar el selector semanal a siete columnas en todos los breakpoints y reducir padding/tipografía/altura con reglas mobile-first.
- Mantener la composición principal calendario + sesiones; solo ajustar su ritmo vertical.

## Checklist Frontend

- [x] Añadir pruebas dirigidas del bloque redundante y de los siete días.
- [x] Sustituir el encabezado ad hoc por `PageHeader`.
- [x] Retirar el subtítulo descriptivo del encabezado sin alterar el título.
- [x] Mantener los filtros visibles y utilizables en todos los tamaños.
- [x] Eliminar la franja de resúmenes bajo el título.
- [x] Compactar navegación y celdas semanales.
- [x] Mostrar siete días en una única fila mediante el contrato responsive `grid-cols-7`.
- [x] Confirmar que la selección de sesión y los filtros siguen funcionando.

## Verificación ejecutada

- TDD RED: dos fallos esperados por rango semanal duplicado y selector sin contrato de siete columnas.
- TDD GREEN: test dirigido del dashboard 3/3.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- Suite unitaria: 38 archivos, 231 tests PASS.
- `npm run build`: PASS con Next.js 16.2.1 tras habilitar red para `next/font`.
- Detector Impeccable de layout: sin hallazgos.
- Revisión estructural: `PageHeader`, filtros compactos, rango único, `grid-cols-7`, controles de 44 px, foco visible y contexto de sesiones conservado.
- Limitación no bloqueante: no existe sesión/configuración E2E autenticada; el navegador redirige a login, por lo que no se capturaron los cuatro viewports con datos reales.
- Ampliación de captura: eliminado únicamente el subtítulo «Sesiones del club ordenadas por fecha y hora»; test dirigido 4/4, suite completa 232/232, lint y detector Impeccable en verde.

## Archivos afectados

- `src/app/(dashboard)/dashboard/page.tsx`
- `src/__tests__/components/dashboard.test.tsx`
- `task/REGISTRO-TAREAS.md`
- `docs/backlog.md`

## Plan de ejecución

- Registro: TASK-003 en `task/REGISTRO-TAREAS.md`
- Plan técnico: `docs/plans/2026-08-08-compactar-dashboard-semanal.md`
