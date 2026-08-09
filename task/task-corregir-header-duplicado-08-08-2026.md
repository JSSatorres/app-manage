# Tarea Maestra — Corregir header duplicado

## Contexto

Tras el rediseño «Banquillo editorial», las rutas autenticadas muestran en escritorio dos cabeceras consecutivas: el `TopBar` de escritorio y la cabecera compacta diseñada para móvil. Las capturas aportadas en `/documentos` y `/jugadores` confirman que se repiten la marca, el indicador `DEV`, el club y la sede.

El usuario confirma el 08/08/2026 que debe conservarse únicamente la barra superior completa —la que contiene notificaciones y avatar— y eliminarse la segunda fila repetida en escritorio.

## Diagnóstico

- `src/app/(dashboard)/layout.tsx` monta `TopBar` dentro de `hidden md:block`, correctamente limitado a escritorio.
- El mismo layout monta después la cabecera móvil sin `md:hidden`, por lo que también permanece visible en escritorio.
- `rg` confirma que las páginas de dominio no montan otro `TopBar`; la duplicación pertenece al shell compartido.
- Hipótesis confirmada: durante el rediseño se perdió la clase responsive que ocultaba la cabecera móvil en `md+`.

## Reglas de comportamiento

- En escritorio (`md+`) debe verse un único header: `TopBar`.
- En móvil (`< md`) debe verse la cabecera compacta con marca, entorno y selector de sede.
- Deben conservarse sin cambios sidebar, `BottomNav`, club/sede, notificaciones, avatar, permisos, rutas, contenido y handlers.
- No se cambiarán textos ni se rediseñarán otras superficies.

## Checklist Frontend

- [x] Añadir una prueba de regresión del contrato responsive del shell.
- [x] Restaurar `md:hidden` en la cabecera móvil.
- [x] Confirmar que el TopBar sigue limitado a escritorio.
- [~] Verificar `/documentos` en escritorio y móvil — contrato responsive cubierto por test; inspección autenticada bloqueada por ausencia de sesión E2E.

## Verificación ejecutada

- Prueba RED: `dashboard.layout.test.tsx` falla porque la cabecera móvil no contiene `md:hidden`.
- Corrección mínima: se añade únicamente `md:hidden` al `<header>` móvil de `DashboardShell`.
- Prueba GREEN dirigida: 1/1.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- Suite unitaria: 38 archivos, 229/229 tests PASS.
- `npm run build`: PASS con Next.js 16.2.1 tras habilitar red para descargar las fuentes de `next/font`.
- Navegador: `/documentos` redirige a login porque no hay sesión E2E disponible; no se inventaron credenciales.

## Archivos afectados

- `src/app/(dashboard)/layout.tsx`
- `src/__tests__/app/dashboard.layout.test.tsx`
- `task/REGISTRO-TAREAS.md`
- `docs/backlog.md`

## Plan de ejecución

- Registro: TASK-002 en `task/REGISTRO-TAREAS.md`
- Plan técnico: `docs/plans/2026-08-08-corregir-header-duplicado.md`
