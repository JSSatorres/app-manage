# Corregir header duplicado Implementation Plan

**Goal:** Mostrar una sola cabecera en cada breakpoint: `TopBar` en escritorio y cabecera compacta en móvil.

**Architecture:** El shell autenticado ya contiene las dos variantes necesarias. La corrección restaura la frontera responsive perdida en la cabecera móvil y la protege con una prueba de componente; no cambia rutas, contenido, providers ni comportamiento de navegación.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Vitest y Testing Library.

## Perfil de verificación

- Nivel: standard
- Motivo: cambio visual ordinario en el layout compartido de todas las rutas autenticadas, con riesgo responsive pero sin tocar auth, permisos, datos ni persistencia.
- Comandos: `npx vitest run src/__tests__/app/dashboard.layout.test.tsx`; `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; inspección de `/documentos` a 1280×800 y 375×667 cuando exista sesión E2E de desarrollo.
- Evidencias esperadas: la prueba confirma `md:hidden` en la cabecera móvil; estático y unitarios verdes; en escritorio solo aparece `TopBar` y en móvil solo la cabecera compacta.

## Incidencias de verificación

<!-- Se rellena durante la ejecución solo para fallos major/critical. -->

---

## Invariantes

- No cambiar textos, rutas, secciones, datos, permisos, providers ni handlers.
- No eliminar ninguna de las dos variantes de cabecera: ambas son necesarias en breakpoints distintos.
- No modificar `TopBar`, `AppSidebar`, `BottomNav` ni `SedeSwitcher` salvo que la prueba revele una dependencia no observada.
- Mantener LF y las convenciones de `docs/design-guides/frontend_styleguide.md`.
- Seguir `@.agents/skills/tdd` y `@.agents/skills/javascript-testing-patterns` para la regresión.

### Task 1: Proteger el contrato responsive del shell

**Files:**
- Create: `src/__tests__/app/dashboard.layout.test.tsx`
- Modify: `src/app/(dashboard)/layout.tsx:45-64`

**Step 1: Escribir la prueba que falla**

- Renderizar `DashboardLayout` con mocks mínimos de providers, contexto, navegación y componentes compartidos.
- Hacer que el mock de `TopBar` exponga una cabecera identificable.
- Localizar la cabecera que contiene la marca `SPORTAPP` y afirmar que incluye `md:hidden`.
- Afirmar que el contenedor del `TopBar` conserva `hidden md:block`.

**Step 2: Ejecutar la prueba y verificar RED** — Run: `npx vitest run src/__tests__/app/dashboard.layout.test.tsx` · Expected: FAIL porque la cabecera móvil actual carece de `md:hidden`.

**Step 3: Aplicar la corrección mínima**

- Añadir únicamente `md:hidden` a las clases de la cabecera móvil en `DashboardShell`.
- No mover JSX ni modificar el contenido de ninguna cabecera.

**Step 4: Ejecutar la prueba y verificar GREEN** — Run: `npx vitest run src/__tests__/app/dashboard.layout.test.tsx` · Expected: PASS.

**Step 5: Ejecutar verificación standard**

- Run: `npm run lint` · Expected: PASS.
- Run: `npx tsc --noEmit` · Expected: PASS.
- Run: `npm test -- --run` · Expected: PASS.
- Con sesión E2E disponible, inspeccionar `/documentos` a 1280×800 y 375×667; si no existe, documentar la limitación sin inventar credenciales.

### Task 2 (final): Actualizar documentación

**Files:**
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-corregir-header-duplicado-08-08-2026.md`
- Modify: `docs/backlog.md`
- Modify if needed: `docs/design-guides/frontend_styleguide.md`

**Pasos:**

- Tras verificación verde, marcar TASK-002 como `en_progreso` y registrar la evidencia; no usar `finalizada` sin confirmación humana, fecha y rama.
- Marcar o añadir la incidencia correspondiente en `docs/backlog.md` sin tocar `docs/crud-audit.md`.
- No actualizar la design guide salvo que la corrección introduzca una convención nueva; restaurar una clase omitida no debería hacerlo.
