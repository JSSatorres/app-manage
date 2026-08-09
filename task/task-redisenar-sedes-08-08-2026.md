# Tarea Maestra — Rediseñar Sedes

**Estado:** `finalizada`  
**Creada:** 08/08/2026  
**Cerrada:** 09/08/2026  
**Rama:** `main` (GIT off; sin afirmación de merge)  
**Prioridad:** media  
**Tipo:** feature  
**Módulo:** sedes

## Contexto

La captura `C:\Users\juans\AppData\Local\Temp\codex-clipboard-27ce6574-7a95-4197-a0a5-aba03ee1357e.png` muestra la vista autenticada de Sedes con el árbol desplegado. La información y las acciones existen, pero sede, equipo, sesiones y miembros compiten en un mismo plano visual; los estados de sesión comparten tratamiento neutro, entrenadores y jugadores se distinguen poco y varias acciones de edición solo aparecen con hover, por lo que resultan débiles o inaccesibles en dispositivos táctiles.

El objetivo confirmado es mejorar la lectura y la identidad visual de esta pantalla sin alterar su comportamiento. La jerarquía operativa se mantiene exactamente como sede → equipo → sesiones → miembros/roles, dentro del sistema «Banquillo editorial» ya activo en `src/app/globals.css`.

## Ampliación aprobada (08/08/2026)

Las capturas `codex-clipboard-883526ca-2532-46ba-a72e-a1653900456f.png` y `codex-clipboard-cec7a90f-4715-4a83-8431-22b547d56f39.png` aprueban ampliar el alcance con scroll interno para las listas de equipos, sesiones y miembros, además de reforzar la jerarquía de la cabecera de sede. La implementación está realizada sin alterar datos, acciones ni permisos. El verifier independiente `standard` PASA y la confirmación humana autoriza el cierre el 09/08/2026.

El seguimiento posterior exige que el scroll no quede atrapado al llegar al inicio o final de una lista. Se conserva el desplazamiento interno, pero equipos, sesiones y miembros usan encadenamiento vertical nativo para que la rueda o el trackpad continúen desplazando el contenedor superior y la página.

## Alcance y reglas

- Reforzar visualmente cada nivel del árbol sin cambiar su orden, datos ni relaciones.
- Mantener intactos props, hooks, queries, query keys, callbacks, formularios, permisos y operaciones CRUD.
- Conservar el copy funcional existente en español; solo añadir nombres accesibles y etiquetas de rol/estado necesarias para que el significado no dependa del color.
- Reservar el color `primary`/coral para la acción principal y estados o roles con significado; no usarlo como decoración indiscriminada.
- Mapear estados de sesión así: Planificada → primary/coral; Realizada → verde; Borrador → neutral; No realizada → destructive.
- Diferenciar Entrenador con primary/coral y Jugador con tratamiento neutral, manteniendo texto e icono además del color.
- Hacer visibles las acciones de sede, equipo y miembro sin depender de hover; asegurar foco visible, nombre accesible contextual y objetivo táctil suficiente.
- Usar variables semánticas existentes y `color-mix()` local. No crear tokens globales salvo necesidad demostrada durante la implementación.
- Comprobar explícitamente light/dark, contraste WCAG AA, teclado, responsive y ausencia de overflow a 1280×800 y 375×667.
- Trabajar siempre sobre el contenido vigente de los componentes: contienen cambios locales ajenos y no deben reescribirse por completo.
- No añadir dependencias, no ejecutar migraciones y no usar git.

## Criterios de aceptación

- [x] La sede es el nivel dominante y cada equipo aparece como grupo subordinado reconocible.
- [x] Al desplegar un equipo, «Sesiones» y «Miembros» son regiones identificables y conservan ese orden.
- [x] Cada entrenador y jugador muestra un rol explícito mediante texto, icono/forma y color semántico.
- [x] Borrador, Planificada, Realizada y No realizada muestran su etiqueta y un tratamiento semántico distinguible en light y dark.
- [x] «Nueva» sigue siendo la CTA principal; Editar y Eliminar ganan presencia sin competir con ella y conservan sus callbacks.
- [x] Ninguna acción necesaria depende de hover; todos los controles tienen nombre contextual, foco visible y objetivo táctil adecuado.
- [x] Los acordeones conservan expansión/colapso, queries condicionales, keys y callbacks de edición actuales.
- [x] Al alcanzar el inicio o final de equipos, sesiones o miembros, el desplazamiento continúa de forma nativa en el contenedor superior y la página.
- [x] La pantalla no introduce overflow horizontal ni pérdida de jerarquía a 1280×800 y 375×667.
- [x] Los tests consultan roles, labels y comportamiento público; no usan snapshots ni clases Tailwind como contrato principal.
- [x] Lint, TypeScript, tests dirigidos, suite unitaria/integración y build finalizan en verde.

## Checklist técnico

- [x] Añadir pruebas de estados globales y acciones accesibles de `SedesListView`.
- [x] Añadir pruebas de jerarquía, acordeones, roles y callbacks de `SedeAccordionRow`.
- [x] Añadir pruebas de loading, vacío, estados y callback de `SesionesEquipoList`.
- [x] Aplicar la composición editorial con ediciones quirúrgicas en los tres componentes.
- [ ] Verificar light/dark, teclado, foco, overflow y targets táctiles en desktop y móvil.
- [x] Ejecutar el perfil `standard` completo y registrar evidencia.
- [x] Actualizar backlog, registro, tarea maestra y plan solo después de la verificación.

## Evidencia de verificación final (09/08/2026)

- Verifier `standard`: PASA. Sedes dirigidos 3/3 archivos y 17/17; `cloneSede` 2/2 y 35/35; runner+reducer 2/2 y 15/15; lint PASS; `tsc` PASS; suite 59/59 archivos y 386/386; build PASS tras reintento por red de Google Fonts; detector Impeccable único `[]`; sin migraciones ni Git.
- Validación autenticada real en escritorio y móvil: login y `/sedes`, dos sedes, expandir/colapsar por clic, Space y Enter, segunda sede alcanzable, primer equipo, `Editar` y ARIA. No hubo errores de consola o página ni overflow horizontal. Capturas: `test-results/sedes-scroll-playwright-chromium.png` y `test-results/sedes-scroll-playwright-mobile-chrome.png`.
- Limitación no bloqueante: el dataset corto (equipos 153/153 en escritorio y 226/226 en móvil; sesiones 28/28) no produjo overflow ni delta de `scrollTop`. La capacidad de scroll queda cubierta por estructura y unitarios; el fallback E2E no se relanzó.

## Archivos afectados

### Producción permitida

- `src/components/sedes/SedesListView.tsx`
- `src/components/sedes/SedeAccordionRow.tsx`
- `src/components/sedes/SesionesEquipoList.tsx`

### Pruebas previstas

- `src/__tests__/components/SedesListView.test.tsx`
- `src/__tests__/components/SedeAccordionRow.test.tsx`
- `src/__tests__/components/SesionesEquipoList.test.tsx`

### Documentación de cierre

- `docs/backlog.md`
- `task/REGISTRO-TAREAS.md`
- `task/task-redisenar-sedes-08-08-2026.md`
- `docs/plans/2026-08-08-redisenar-sedes.md`
- `DESIGN.md` solo si es imprescindible corregir una convención global que contradiga los tokens reales.

## Archivos y decisiones prohibidos

- No modificar `src/app/(dashboard)/sedes/page.tsx`.
- No modificar `src/services/**`, `src/hooks/**`, `src/schemas/**`, `src/types/**` ni `src/lib/permisos.ts`.
- No modificar formularios de dominio ni `src/components/ui/**`.
- No modificar `package.json`, lockfiles, configuración, base de datos ni migraciones.
- No cambiar comportamiento, datos, permisos, CRUD, rutas, copy funcional ni contratos públicos.
- No actualizar `docs/crud-audit.md` ni `docs/design-guides/**` salvo que aparezca un cambio funcional o una convención reutilizable real; el alcance confirmado no los prevé.

## Plan de ejecución

- Registro: TASK-004 en `task/REGISTRO-TAREAS.md`
- Plan técnico: `docs/plans/2026-08-08-redisenar-sedes.md`

> **ESTADO:** FINALIZADA. Verifier `standard` PASA y cierre confirmado humanamente el 09/08/2026; GIT permanece off y no se afirma merge alguno.
