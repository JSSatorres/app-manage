# Rediseñar Sedes Implementation Plan

**Goal:** Añadir scroll interno de altura deliberada a las listas largas de equipos, sesiones y miembros de Sedes, y reforzar la distinción jerárquica de cada cabecera de sede, sin cambiar copy, acciones, permisos, datos ni comportamiento.

**Architecture:** La ampliación queda contenida en los componentes presentacionales existentes `SedeAccordionRow` y `SesionesEquipoList`. Cada lista conserva sus queries, orden, callbacks y renderizado, pero su contenedor pasa a ser una región nombrada, enfoc-able y con altura máxima explícita, scroll vertical nativo y gutter estable; la cabecera de sede gana estructura semántica y señales visuales Banquillo editorial sin crear cards anidadas.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estricto, Tailwind CSS v4, shadcn/ui, Vitest y Testing Library.

## Perfil de verificación

- Nivel: standard
- Motivo: cambio ordinario de UI React con impacto en estructura accesible, teclado, responsive y dark mode. No toca auth, permisos, servicios, persistencia, schemas, datos ni migraciones. Se conserva el build porque la integración React/Next y las utilidades Tailwind deben compilar.
- Comandos: `npx vitest run src/__tests__/components/SedesListView.test.tsx src/__tests__/components/SedeAccordionRow.test.tsx src/__tests__/components/SesionesEquipoList.test.tsx`; `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`; una única ejecución de `node C:\Users\juans\.codex\skills\impeccable\scripts\detect.mjs --json src/components/sedes/SedeAccordionRow.tsx src/components/sedes/SesionesEquipoList.tsx`; inspección real de `/sedes` si existe una sesión autenticada reutilizable.
- Evidencias esperadas: cada slice registra RED y GREEN; los tests verifican landmarks, nombres accesibles, foco y pertenencia estructural sin snapshots; el seguimiento del scroll fija además la política CSS observable porque jsdom no implementa desplazamiento ni encadenamiento reales. Estático, suite y build terminan en verde; el detector se ejecuta exactamente una vez sobre los dos targets visuales; si auth lo permite, desktop, móvil, light/dark y scroll por teclado/puntero se comprueban en navegador real.

## Incidencias de verificación

- **Ronda 1 — major propia (08/08/2026), resuelta:** el ajuste visual perdió el texto visible `Editar` y exponía `aria-controls` fuera del ciclo de montaje del panel. Se restauró el copy y `aria-controls` se limita al panel montado.
- **Ronda 3 — dependencia externa (08/08/2026), resuelta:** los fallos por `sedesService.cloneSede` undefined de TASK-008 ya no bloquean la suite final; TASK-004 no modificó esa feature.
- **Entorno visual y autenticación (08/08/2026), resuelto:** los bloqueos previos de `useSesionRunner`, servidor y autenticación se resolvieron para la comprobación autenticada real de `/sedes`.
- **Seguimiento — scroll atrapado (08/08/2026), resuelto:** `overscroll-contain` impedía propagar el desplazamiento al ancestro al alcanzar un límite. Se sustituyó por `overscroll-y-auto` en los cinco estados/contenedores afectados, sin listeners de rueda ni cambios de altura.
- **Estado final (09/08/2026):** el verifier independiente `standard` **PASA**: pruebas dirigidas de Sedes 3/3 archivos y 17/17, `cloneSede` 2/2 y 35/35, runner+reducer 2/2 y 15/15; lint y TypeScript PASS; suite 59/59 archivos y 386/386; build PASS tras reintento por red de Google Fonts; detector Impeccable único `[]`; sin migraciones ni Git.
- **Limitación visual no bloqueante:** la sesión autenticada real cubrió login y `/sedes` en escritorio y móvil, dos sedes, expansión/colapso por clic, Space y Enter, alcance de segunda sede, primer equipo, `Editar`, ARIA, ausencia de errores de consola/página y de overflow horizontal. El dataset corto (equipos 153/153 en escritorio y 226/226 en móvil; sesiones 28/28) no produjo overflow ni delta de `scrollTop`; la capacidad de scroll queda demostrada por estructura y unitarios, y el fallback E2E no se relanzó. Capturas: `test-results/sedes-scroll-playwright-chromium.png` y `test-results/sedes-scroll-playwright-mobile-chrome.png`.

---

## Estado operativo

- GIT: off. No ejecutar comandos git, no crear rama y no hacer commits.
- Cadencia: continuo; el usuario ya aprobó esta ampliación concreta.
- TASK-004 queda `finalizada` tras verifier PASA y confirmación humana; rama `main`, cierre 09/08/2026.
- Migraciones: no aplican.
- UI: español. No cambiar copy funcional existente.
- Perfil: `standard`; el executor/verifier no puede rebajarlo.
- Contenido compartido: releer los archivos justo antes de editarlos y preservar cambios concurrentes.

## Discovery del estado actual

- `SedeAccordionRow` concentra los tres niveles relevantes: `SedeAccordionRow` renderiza la cabecera de sede, `EquiposList` la colección de equipos y `EquipoAccordionRow` distribuye sesiones y miembros.
- Las regiones `Equipos de {sede}`, `Sesiones de {equipo}` y `Miembros de {equipo}` ya existen o están asociadas a encabezados, pero sus colecciones crecen sin una altura máxima y desplazan el resto de la página.
- `SesionesEquipoList` ya ofrece una región `Sesiones`, estados accesibles y callbacks de edición; su lista usa `flex-wrap` sin límite vertical.
- `MiembroList` agrupa entrenadores antes que jugadores y mantiene acciones contextuales; este orden debe conservarse dentro de su nueva región desplazable.
- Los tests vigentes cubren expansión/colapso, jerarquía, roles, estados y callbacks. La ampliación debe extenderlos con contratos semánticos observables, no duplicar internals ni fijar clases de Tailwind.
- `SedesListView` no requiere cambios de producción. Su test participa solo en la regresión dirigida porque protege el contrato público del árbol y las acciones de sede.

## Decisiones de diseño y accesibilidad

- Dirección visual: Impeccable **Operate** sobre Banquillo editorial; reutilizar tokens semánticos existentes.
- La sede es el nivel dominante mediante estructura de cabecera, superficie, hairlines, forma, espaciado, tipografía e iconografía. El color nunca es la única señal.
- Los equipos siguen subordinados a su sede; sesiones y miembros siguen siendo columnas hermanas en desktop y bloques apilados en móvil.
- Alturas máximas deliberadas: una altura mayor para equipos, que puede contener equipos desplegados, y una altura compacta equivalente para sesiones y miembros. El executor debe escoger valores Tailwind existentes y mantenerlos constantes entre estados; no calcular alturas en JavaScript.
- Cada contenedor con scroll será una región nombrada y alcanzable por teclado (`tabIndex={0}`), con foco visible, `overflow-y-auto`, `overscroll-y-auto` y gutter estable para que la scrollbar no tape contenido ni el desplazamiento quede atrapado en sus límites.
- Mantener scrollbar nativa usable y contraste del foco en light/dark; no ocultarla ni estilizarla con plugins o CSS global.
- Las cabeceras permanecen fuera del scroll cuando el componente ya separa encabezado y colección; si el contenedor vigente obliga a incluirla, preservar su nombre accesible y comprobar que sigue siendo localizable al desplazarse.
- En móvil no introducir scroll horizontal ni áreas táctiles menores de 44 px. El scroll vertical interno debe funcionar con gesto; en escritorio, con rueda, trackpad, scrollbar y teclado al enfocar la región.

## Contratos invariantes

- Preservar props públicas, firmas, hooks, servicios, queries, query keys, condiciones `open`, keys de React, orden de datos y callbacks.
- Preservar el orden sede → equipos → sesiones/miembros, y dentro de miembros entrenadores → jugadores.
- No cambiar copy, acciones, permisos, formularios, carga, vacíos, estados, navegación ni objetos entregados a callbacks.
- No modificar `SedesListView.tsx` salvo que un fallo real demuestre que el contrato público no puede protegerse desde sus tests; esa excepción exige registrar el cambio de alcance antes de editar.
- Los tests consultan roles, nombres, foco y contención DOM observable. Prohibidas snapshots, selectores por clase Tailwind y aserciones de valores CSS como contrato principal.
- Mantener `aria-expanded`, `aria-controls` y `aria-labelledby` existentes; no crear landmarks anónimos ni nombres duplicados ambiguos dentro del mismo equipo.

## Decisiones prohibidas

- No crear cards anidadas, sombras, gradientes, bordes laterales gruesos ni coral decorativo en grandes superficies.
- No usar `overflow-hidden` para recortar contenido, scroll horizontal o altura de viewport global para resolver las listas.
- No ocultar scrollbar, eliminar indicadores de foco ni depender de hover.
- No añadir virtualización, paginación, dependencias, componentes base nuevos, tokens globales ni lógica de medición con JavaScript.
- No modificar página, servicios, hooks, schemas, tipos, permisos, formularios, `src/components/ui/**`, configuración, lockfiles, base de datos o migraciones.
- No actualizar backlog ni evidencias de cierre antes de que el verifier complete Task 4.

### Task 1: Reforzar la jerarquía y la cabecera de sede

**Files:**
- Modify: `src/__tests__/components/SedeAccordionRow.test.tsx` — suite `SedeAccordionRow`
- Modify: `src/components/sedes/SedeAccordionRow.tsx` — símbolo `SedeAccordionRow`

**Skills:** `tdd`, `javascript-testing-patterns`, `impeccable` (Operate).

**Step 1: Releer el slice vigente**

- Releer ambos archivos y `docs/design-guides/frontend_styleguide.md`; confirmar que las props, callbacks, ids y controles de acordeón siguen coincidiendo con este plan.

**Step 2: Escribir la prueba RED de jerarquía de sede**

- Extender el fixture existente sin introducir mocks nuevos.
- Exigir un landmark nombrado para `Sede Central`, una cabecera semántica contenida en ese bloque y el control `Mostrar equipos de Central` dentro de la cabecera.
- Abrir la sede y comprobar que la región `Equipos de Central` permanece descendiente del bloque de sede y asociada al control mediante los ids vigentes.
- No consultar clases, iconos concretos ni colores.

**Step 3: Ejecutar RED y confirmar el fallo** — Run: `npx vitest run src/__tests__/components/SedeAccordionRow.test.tsx` · Expected: FAIL porque la fila de sede actual no expone un bloque/cabecera de sede nombrado y distinguible semánticamente.

**Step 4: Implementar el mínimo GREEN**

- Convertir el wrapper de cada sede en un bloque semántico nombrado y su franja superior en cabecera, conservando botón, acciones y propagación.
- Reforzar el nivel sede con tokens existentes, hairline, superficie, espaciado, tipografía e icono decorativo; mantener el nombre y la dirección como contenido existente.
- Mantener el equipo visualmente subordinado sin cards anidadas, sombras, gradientes ni borde lateral grueso.

**Step 5: Reejecutar GREEN** — Run: `npx vitest run src/__tests__/components/SedeAccordionRow.test.tsx` · Expected: PASS.

### Task 2: Acotar la lista de equipos con scroll interno accesible

**Files:**
- Modify: `src/__tests__/components/SedeAccordionRow.test.tsx` — fixtures y contrato de la región de equipos
- Modify: `src/components/sedes/SedeAccordionRow.tsx` — símbolos `EquiposList` y `SedeAccordionRow`

**Skills:** `tdd`, `javascript-testing-patterns`, `impeccable` (Operate).

**Step 1: Escribir la prueba RED de colección larga**

- Hacer que el mock de la query `equipos/accordion` devuelva varios equipos con nombres distintos.
- Abrir `Central` y exigir que todos los controles de equipo pertenezcan a la región contextual `Equipos de Central`.
- Exigir que esa región sea alcanzable por teclado y conserve `aria-labelledby`/nombre contextual; enfocar la región y comprobar que recibe foco.
- No afirmar `max-h-*`, `overflow-y-auto` ni estilos computados.

**Step 2: Ejecutar RED y confirmar el fallo** — Run: `npx vitest run src/__tests__/components/SedeAccordionRow.test.tsx` · Expected: FAIL porque la región de equipos aún no es un área de scroll enfoc-able.

**Step 3: Implementar el mínimo GREEN**

- Aplicar a la colección de equipos una altura máxima deliberada mayor que las listas internas, `overflow-y-auto`, `overscroll-y-auto`, gutter estable y foco visible.
- Mantener visible/localizable el encabezado `Equipos de {sede}` y conservar el orden original, las keys y el comportamiento de expansión de cada equipo.
- Evitar altura calculada, scroll horizontal y scrollbar oculta.

**Step 4: Reejecutar GREEN** — Run: `npx vitest run src/__tests__/components/SedeAccordionRow.test.tsx` · Expected: PASS.

### Task 3: Acotar sesiones y miembros con scroll interno equivalente

**Files:**
- Modify: `src/__tests__/components/SedeAccordionRow.test.tsx` — contrato de región y foco de miembros
- Modify: `src/__tests__/components/SesionesEquipoList.test.tsx` — colección larga de sesiones y región enfoc-able
- Modify: `src/components/sedes/SedeAccordionRow.tsx` — símbolos `EquipoAccordionRow` y `MiembroList`
- Modify: `src/components/sedes/SesionesEquipoList.tsx` — símbolo `SesionesEquipoList`

**Skills:** `tdd`, `javascript-testing-patterns`, `impeccable` (Operate).

**Step 1: Escribir el RED de miembros**

- Ampliar los fixtures de entrenador/jugador para representar una lista larga y abrir sede + equipo.
- Exigir que todos los miembros sigan dentro de la región `Miembros de Juvenil A`, que la colección desplazable tenga nombre inequívoco, sea alcanzable por teclado y reciba foco.
- Confirmar que Entrenador precede a Jugador y que los botones de edición siguen entregando el objeto original.

**Step 2: Ejecutar el RED de miembros** — Run: `npx vitest run src/__tests__/components/SedeAccordionRow.test.tsx` · Expected: FAIL porque la colección de miembros actual no es una región de scroll enfoc-able.

**Step 3: Implementar el mínimo GREEN de miembros**

- Mantener el encabezado `Miembros de {equipo}` separado de la colección cuando la estructura vigente lo permita.
- Dar a la colección una región nombrada, altura máxima compacta, `overflow-y-auto`, `overscroll-y-auto`, gutter estable y foco visible.
- Conservar orden, role labels, acciones, loading y vacío sin cambiar copy.

**Step 4: Reejecutar el GREEN de miembros** — Run: `npx vitest run src/__tests__/components/SedeAccordionRow.test.tsx` · Expected: PASS.

**Step 5: Escribir el RED de sesiones**

- Hacer que el mock de sesiones devuelva suficientes elementos con ids/fechas distintos para representar una lista larga.
- Exigir que todos los botones de sesión pertenezcan a la región `Sesiones`, que esa región sea alcanzable por teclado y reciba foco.
- Repetir los casos loading y vacío para asegurar que conservan nombre, copy y semántica; no comprobar clases ni tamaño.

**Step 6: Ejecutar el RED de sesiones** — Run: `npx vitest run src/__tests__/components/SesionesEquipoList.test.tsx` · Expected: FAIL porque la región de sesiones actual no es un área de scroll enfoc-able.

**Step 7: Implementar el mínimo GREEN de sesiones**

- Estabilizar una región `Sesiones` en los estados loading, vacío y con datos; la colección con datos usa la misma altura máxima compacta que miembros, scroll vertical nativo encadenado, gutter estable y foco visible.
- Preservar `flex-wrap`, estados, fechas, horas, duración, acciones, keys, query condicional y callback.

**Step 8: Reejecutar el GREEN de sesiones** — Run: `npx vitest run src/__tests__/components/SesionesEquipoList.test.tsx` · Expected: PASS.

### Task 4: Ejecutar detector y autocheck integral standard

**Files:**
- Verify: `src/components/sedes/SedeAccordionRow.tsx`
- Verify: `src/components/sedes/SesionesEquipoList.tsx`
- Verify: `src/__tests__/components/SedesListView.test.tsx`
- Verify: `src/__tests__/components/SedeAccordionRow.test.tsx`
- Verify: `src/__tests__/components/SesionesEquipoList.test.tsx`

**Skills:** `impeccable` (detector), `agent-browser` solo si hay sesión autenticada reutilizable.

**Step 1: Ejecutar una sola vez el detector Impeccable**

- Run exactamente una vez: `node C:\Users\juans\.codex\skills\impeccable\scripts\detect.mjs --json src/components/sedes/SedeAccordionRow.tsx src/components/sedes/SesionesEquipoList.tsx` · Expected: JSON válido sin hallazgos blocking.
- Registrar la salida real. No ejecutar el detector por archivo ni repetirlo en otra ronda.

**Step 2: Ejecutar la regresión dirigida**

- Run: `npx vitest run src/__tests__/components/SedesListView.test.tsx src/__tests__/components/SedeAccordionRow.test.tsx src/__tests__/components/SesionesEquipoList.test.tsx` · Expected: PASS.

**Step 3: Ejecutar estático, suite y build en orden**

- Run: `npm run lint` · Expected: PASS.
- Run: `npx tsc --noEmit` · Expected: PASS.
- Run: `npm test -- --run` · Expected: PASS.
- Run: `npm run build` · Expected: PASS con Next.js 16.

**Step 4: Hacer autocheck funcional y visual**

- Verificar por revisión del DOM/test que la sede domina sin parecer una card anidada y que los tres contenedores mantienen nombres inequívocos, foco visible y orden de datos.
- Si existe sesión autenticada reutilizable, iniciar la app y abrir `/sedes` en 1280×800 y 375×667, light y dark. Expandir una sede y un equipo con listas largas.
- Comprobar que equipos, sesiones y miembros conservan altura intencional y se desplazan de forma independiente con rueda/trackpad/scrollbar, gesto táctil y teclado al enfocar; las cabeceras siguen localizables y no hay overflow horizontal ni contenido tapado por la scrollbar.
- Recorrer expansión y botones de edición con teclado sin guardar formularios ni confirmar eliminaciones.
- Si `/sedes` redirige a `/login`, registrar la limitación; no inventar credenciales, no conducir OAuth y no afirmar que la inspección visual se realizó.

**Step 5: Gestionar hallazgos sin rebajar el perfil**

- Un executor fresco corrige solo el hallazgo. Repetir desde Step 2; el detector no se repite porque su contrato es una única ejecución.
- Registrar en `## Incidencias de verificación` solo fallos major/critical o minor repetidos/con cambio de alcance, con ronda, causa, corrección y evidencia verde.
- No iniciar Task 5 hasta que el verifier independiente complete el perfil standard.

### Task 5 (final, completada): Actualizar documentación solo después del verifier

**Estado:** completada el 09/08/2026, tras verifier PASA y confirmación humana.

**Files:**
- Modify: `docs/backlog.md` — entrada `B5-5`, solo con evidencia del verifier
- Modify: `task/REGISTRO-TAREAS.md` — TASK-004
- Modify: `task/task-redisenar-sedes-08-08-2026.md` — ampliación de scroll interno
- Modify: `docs/plans/2026-08-08-redisenar-sedes.md` — evidencias/incidencias reales
- Modify if needed: `docs/design-guides/frontend_styleguide.md` — solo si nace una convención reutilizable real

**Skills:** `writing-plans` (Definición de Terminado).

**Step 1: Aplicar el gate post-verifier**

- Confirmar que Task 4 está completada por el verifier independiente. Si no, detener esta tarea sin tocar `docs/backlog.md` ni marcar criterios.

**Step 2: Releer documentos y sincronizar solo evidencia demostrada**

- Releer los cinco archivos inmediatamente antes de editar y preservar cambios concurrentes.
- Actualizar `B5-5` únicamente después del verifier y solo para reflejar el scroll interno y la jerarquía realmente comprobados; no cerrar ni renumerar otras entradas.
- Marcar únicamente los criterios nuevos demostrados en la Tarea Maestra y registrar comandos/resultados reales en el plan.
- Registrar TASK-004 como `finalizada` con rama `main` y fecha de cierre 09/08/2026, tras verifier PASA y confirmación humana.
- Registrar las incidencias previas y sus resoluciones, junto con la limitación visual no bloqueante, sin afirmar una ejecución E2E que no se realizó.

**Step 3: Evaluar documentación de convenciones**

- No tocar `docs/crud-audit.md`: no cambia CRUD ni datos.
- Actualizar `frontend_styleguide.md` solo si el verifier demuestra que la región de scroll establece una convención reusable fuera de Sedes; en caso contrario, dejarla intacta.

**Step 4: Comprobar el cierre documental sin git**

- Confirmar por lectura que plan, tarea y registro describen el mismo alcance, que `B5-5` se cerró después del verifier y que TASK-004 figura como `finalizada` por confirmación humana.
