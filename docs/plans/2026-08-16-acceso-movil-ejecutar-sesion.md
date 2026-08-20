# Acceso móvil para ejecutar sesiones Implementation Plan

**Goal:** Permitir que una persona autorizada abra el runner de una sesión desde su tarjeta móvil sin abrir accidentalmente el editor y sin cambiar permisos ni reglas de ejecutabilidad.

**Architecture:** Mantener el runner como flujo separado en `/sesiones/[id]/ejecutar` y añadir a la representación móvil de `SesionesListView` la misma acción de navegación que ya existe en escritorio, gobernada por `puedeMutar`. `DataTable` separará semánticamente el activador de edición y la región de acciones mediante una API opcional mínima (`mobileCardActions` o nombre local equivalente), de modo que sean hermanos y nunca controles interactivos anidados; el runner seguirá siendo la única capa que valida si el estado concreto permite ejecutar la sesión.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `next/link`, Tailwind CSS, Vitest y Testing Library.

## Perfil de verificación

- Nivel: standard
- Motivo: cambio ordinario de interacción y navegación en componentes React, incluido el contrato móvil compartido de `DataTable`, con una regresión de permisos visible en UI. No cambia autenticación, la definición de roles/RBAC, persistencia, RLS, rutas, datos ni lógica del runner; por tanto no corresponde `full`. Se incluye build porque el cambio usa una ruta de Next.js y debe compilarse con Next.js 16.
- Comandos: `npm.cmd run lint`; `npx.cmd tsc --noEmit`; `npm.cmd test -- --run`; `npm.cmd run build`.
- Evidencias esperadas: regresiones dirigidas y suite completa en verde; lint y TypeScript sin errores; build de Next.js correcto; activador de edición y enlace móvil como controles hermanos sin anidación interactiva; enlace con destino exacto y permiso esperado; click/teclado de la acción sin apertura del editor; acción de escritorio intacta. Si hay una sesión local autenticada disponible, evidencia visual intencionada a `375x667` de la diferenciación entre editar la tarjeta y ejecutar la sesión; esta comprobación no amplía el perfil a E2E/full.

## Incidencias de verificación

- **Major — ronda 1 — 16/08/2026 — RESUELTA:** `src/__tests__/components/SesionEjecutarView.test.tsx:157` esperaba un único enlace `Ejecutar`, aunque el DOM contiene legítimamente las representaciones de escritorio y móvil. Causa: aserción previa singular no adaptada al contrato responsive. Corrección: el test verifica ahora ambos enlaces, escritorio y móvil, sin relajar el destino ni la ausencia para jugador. Evidencia verde: las pruebas dirigidas de los tres archivos terminan `13/13`.
- **Major — ronda 1 — 16/08/2026 — RESUELTA:** `src/components/shared/DataTable.tsx:202`–`216` anidaba el enlace móvil dentro del wrapper `role="button"` usado como activador de edición. Causa: el contrato de `DataTable` no distinguía el contenido activable de la región de acciones. Corrección: `DataTable.mobileCardActions` renderiza activador de edición y acciones como regiones hermanas, manteniendo tap/teclado de edición y evitando controles interactivos anidados. Evidencia verde: las pruebas dirigidas de `DataTable`, `SesionesListView` y `SesionEjecutarView` terminan `13/13`.
- **Major — ronda 2 — 16/08/2026 — ABIERTA / BLOQUEANTE EXTERNA:** la suite global queda en `4/5` en `publicMetadata.test.tsx` porque `CtaSection` usa `useRequestLock` fuera de `RequestLockProvider`. Impacto: la fase 3 del gate STANDARD no pasa globalmente, por lo que Task 2 y las actualizaciones de `docs/backlog.md`/`docs/crud-audit.md` permanecen bloqueadas. Alcance: fallo externo a este cambio, no remediado por este plan. Evidencia propia revalidada: los tres archivos dirigidos siguen `13/13`.
- **Major — ronda 2 — 16/08/2026 — RESUELTA POR ESTABILIZACIÓN EXTERNA:** una ejecución de TypeScript reportó transitoriamente un fallo de import/export. No se aplicó ni se atribuye ninguna corrección a este cambio. Evidencia de revalidación: `npx.cmd tsc --noEmit` terminó con exit `0`; la evidencia propia dirigida permanece `13/13`.

---

## Contexto y diagnóstico cerrado

- Comportamiento actual: `SesionesListView` renderiza el enlace `Ejecutar` únicamente en la acción de escritorio y solo cuando `puedeMutar` es verdadero. Su `mobileCard` no entrega `actions`; tocar la tarjeta móvil activa la edición.
- Causa confirmada: omisión de la acción en la rama móvil.
- Factor contribuyente confirmado en ronda 1: `DataTable` convierte el wrapper completo del `mobileCard` en `role="button"`, por lo que el enlace queda semánticamente anidado dentro del activador de edición aunque se frene el bubbling.
- Hipótesis descartadas: la ruta del runner existe; el cálculo RBAC actual mediante `puedeMutar` ya funciona en escritorio; los estados de sesión no deben filtrarse en la lista; los bloques/datos de la sesión no impiden mostrar el acceso. La validación de ejecutabilidad pertenece al runner.
- Feedback loop: prueba de componente determinista que renderice la interfaz móvil real y observe el enlace y la ausencia de apertura del editor. Debe fallar antes del fix por la ausencia del enlace dentro de la tarjeta móvil, no por encontrar o dejar de encontrar la acción de escritorio.

## Ajustes del plan

- 16/08/2026: el executor confirmó que `@testing-library/user-event` no está instalado. No se añadirá ninguna dependencia; las activaciones de puntero y teclado se simularán con `fireEvent` de Testing Library o, solo si el contrato real lo exige, con dispatch nativo mediante APIs ya instaladas. Es un ajuste previo a producción, no una incidencia de verificación.

## Contratos e invariantes

- La URL de una sesión con id `sessionId` es exactamente `/sesiones/sessionId/ejecutar`.
- El nombre accesible del enlace es `Ejecutar`.
- El enlace móvil se muestra si y solo si el mismo `puedeMutar` que protege la acción de escritorio es verdadero. No se crea otro cálculo de roles.
- Un usuario con rol jugador no ve la acción móvil.
- Una persona autorizada ve la acción también para una sesión `Borrador`. No añadir filtros para `Borrador`, `Planificada`, `Realizada` ni `NoRealizada`.
- Activar `Ejecutar` con puntero o teclado no dispara la edición de la tarjeta. No cancelar el comportamiento nativo del enlace.
- La acción tiene objetivo táctil con altura mínima de 42 px, foco de teclado claramente visible e icono decorativo oculto del árbol accesible; el texto aporta el nombre accesible.
- La acción de escritorio actual no se modifica ni se reemplaza.
- `SesionForm`, la ruta `/sesiones/[id]/ejecutar`, los servicios, hooks, schemas, permisos y la base de datos quedan fuera de alcance.
- Cuando una tarjeta tenga acciones, `DataTable` debe renderizar un contenedor de tarjeta no interactivo con dos regiones hermanas: un activador de edición con semántica `button` y soporte de click/`Enter`/espacio, y una región de acciones fuera de ese activador. No usar overlays ni ocultar la anidación con ARIA.
- Añadir a `DataTableProps<T>` una API opcional mínima como `mobileCardActions?: (row: T) => React.ReactNode` (se permite adaptar solo el nombre al estilo local). Sin esa prop, conservar el comportamiento y DOM actuales para todos los consumidores existentes. Con ella, `mobileCard(row)` aporta el contenido editable y `mobileCardActions(row)` la región hermana de acciones.
- En `SesionesListView`, pasar el `Link` mediante esa nueva API de `DataTable`; no duplicarlo dentro de `MobileCardRow.actions`. Mantener el aislamiento de eventos del enlace como defensa, sin depender de él para corregir la semántica.
- Migraciones: no se requieren.
- GIT: off; no crear rama, commit ni push.

### Task 1: Restituir la acción Ejecutar en la tarjeta móvil con una regresión TDD

**Skills:** `diagnose`, `tdd`, `javascript-testing-patterns`.

**Files:**

- Create: `src/__tests__/components/SesionesListView.test.tsx` si no existe.
- Modify: `src/__tests__/components/SesionesListView.test.tsx` si ya existe; ampliar el archivo sin reemplazar cobertura previa, porque es la prueba pública del mismo componente.
- Modify: `src/components/sesiones/SesionesListView.tsx` (`mobileCard`; conservar sin cambios la acción `Ejecutar` de escritorio).
- Modify: `src/components/shared/DataTable.tsx` (`DataTableProps<T>` y render móvil; separar activador y acciones solo cuando se use la nueva API opcional).
- Modify: `src/__tests__/data-table.test.tsx` (regresión semántica, puntero y teclado del contrato móvil compartido).
- Modify: `src/__tests__/components/SesionEjecutarView.test.tsx:157` (actualizar la aserción responsive sin relajar destino ni permisos).

**Precondiciones:**

1. Leer `docs/design-guides/frontend_styleguide.md` y la documentación instalada de Next.js 16 relativa a `next/link` bajo `node_modules/next/dist/docs/` antes de editar.
2. Revisar la firma real de `SesionesListView`, sus mocks/fixtures vecinos, el contrato de `MobileCardRow.actions` y el indicador observable con el que la UI expone que el editor se ha abierto.
3. Si el archivo de prueba ya existe, justificar en una nota del plan de ejecución que se amplía por cohesión y conservar sus helpers. Si no existe, crearlo en la ruta indicada siguiendo el setup Vitest actual.
4. Construir un harness estrecho: usar el componente real y la rama móvil real; mockear solo dependencias externas inevitables. Las consultas deben ser semánticas (`role` + nombre accesible). No permitir que el test pase encontrando el enlace de escritorio: acotar las consultas al DOM de la tarjeta móvil o al render móvil determinista que ya use el proyecto.

**Ciclo 1 — RED → GREEN: enlace móvil autorizado y destino exacto**

1. Escribir primero una prueba para una sesión de id estable y un rol con `puedeMutar = true` que localice dentro de la tarjeta móvil un enlace con nombre accesible exacto `Ejecutar` y espere `href="/sesiones/<id>/ejecutar"`.
2. Ejecutar `npm.cmd test -- --run src/__tests__/components/SesionesListView.test.tsx`.
3. Esperar **FAIL** porque la tarjeta móvil actual omite la acción. Si pasa al encontrar la acción de escritorio, corregir el alcance de la consulta; no continuar con un falso positivo.
4. En `SesionesListView.tsx`, importar/reutilizar `Link` y el mismo icono de la acción de escritorio, y entregar mediante `MobileCardRow.actions` el enlace móvil mínimo bajo el gate existente `puedeMutar`.
5. Mantener la ruta interpolada exacta y no condicionar el enlace por estado, bloques u otra propiedad de sesión.
6. Ejecutar `npm.cmd test -- --run src/__tests__/components/SesionesListView.test.tsx`.
7. Esperar **PASS** para el contrato de enlace autorizado.

**Ciclo 2 — RED → GREEN: separar ejecución de edición**

1. Añadir una prueba que active el enlace móvil con `fireEvent` de Testing Library —o dispatch nativo mediante APIs ya instaladas si el contrato real lo exige— y compruebe mediante la interfaz renderizada que el editor no aparece/no queda abierto. Mantener además la aserción del `href`; no verificar callbacks privados ni la forma interna de props.
2. Añadir la variante de teclado relevante para el contrato real de `MobileCardRow` (al menos `Enter` sobre el enlace) y comprobar que la activación no llega al manejador de edición. No usar `preventDefault`, porque se debe conservar la navegación nativa.
3. Ejecutar `npm.cmd test -- --run src/__tests__/components/SesionesListView.test.tsx`.
4. Esperar **FAIL** si el evento sigue propagándose a `onRowClick`/al manejador de teclado de la tarjeta.
5. Aislar `click` y el evento de teclado en el límite de la acción móvil con `stopPropagation`, manteniendo el enlace enfocable y activable de forma nativa.
6. Aplicar las clases del proyecto para foco visible y un objetivo táctil de altura mínima `42px`; marcar el icono como decorativo (`aria-hidden`) y dejar `Ejecutar` como nombre accesible.
7. Ejecutar `npm.cmd test -- --run src/__tests__/components/SesionesListView.test.tsx`.
8. Esperar **PASS** y confirmar que el test fracasa si se retira el aislamiento de eventos.

**Ciclo 3 — guardas de autorización y estado**

1. Añadir una prueba observable con rol jugador que confirme que no existe un enlace móvil llamado `Ejecutar`.
2. Añadir una prueba con rol autorizado y sesión `Borrador` que confirme que sí existe y conserva el `href` exacto. Este caso protege explícitamente contra introducir filtros de estado; si ya pasa por el uso correcto de `puedeMutar`, conservarlo como guard de regresión y no fabricar un fallo artificial.
3. Ejecutar `npm.cmd test -- --run src/__tests__/components/SesionesListView.test.tsx`.
4. Esperar **PASS**. Si falla, corregir únicamente la reutilización del gate `puedeMutar`; no cambiar RBAC ni lógica del runner.
5. Revisar el diff de `SesionesListView.tsx`: la acción de escritorio debe permanecer byte-a-byte intacta salvo ajustes inevitables de imports/formato; no debe aparecer ninguna condición sobre `Borrador`, `Planificada`, `Realizada` o `NoRealizada`.
6. Ejecutar de nuevo `npm.cmd test -- --run src/__tests__/components/SesionesListView.test.tsx` y esperar **PASS**.

**Ciclo 4 — RED → GREEN de ronda 1: semántica compartida y regresión responsive**

1. En `src/__tests__/data-table.test.tsx`, escribir primero un caso con `onRowClick`, contenido móvil y una acción enlace. Afirmar que el enlace no tiene ningún ancestro `[role="button"]`, que el activador de edición conserva `role="button"`/foco y que ambos controles son regiones hermanas observables.
2. En el mismo caso, usar `fireEvent.click` y `fireEvent.keyDown` para verificar que click, `Enter` y espacio sobre el activador llaman a `onRowClick` con la fila; activar el enlace con click/`Enter` no debe llamar a `onRowClick`. No inspeccionar callbacks privados ni añadir dependencias.
3. Ejecutar `npm.cmd test -- --run src/__tests__/data-table.test.tsx` y esperar **FAIL** con el DOM actual de `DataTable.tsx:202`–`216`, porque el enlace queda dentro del wrapper `role="button"`.
4. Añadir a `DataTableProps<T>` la callback opcional mínima `mobileCardActions` (o nombre local equivalente). Cuando exista, renderizar un contenedor visual no interactivo con el activador de edición y la región de acciones como hermanos; mantener en el activador el tap, `tabIndex`, `Enter` y espacio actuales. Cuando no exista, preservar el camino actual para evitar cambios en otros consumidores.
5. En `SesionesListView.tsx`, retirar el enlace de `MobileCardRow.actions` y entregarlo mediante la nueva callback de `DataTable`, conservando `puedeMutar`, `href`, foco, objetivo táctil, icono decorativo y aislamiento de eventos. No tocar la acción de escritorio.
6. Ejecutar `npm.cmd test -- --run src/__tests__/data-table.test.tsx src/__tests__/components/SesionesListView.test.tsx` y esperar **PASS**.
7. En `src/__tests__/components/SesionEjecutarView.test.tsx:157`, sustituir la consulta singular por una consulta plural a los enlaces `Ejecutar`, esperar exactamente dos representaciones responsivas y comprobar que **cada** enlace conserva `href="/sesiones/sesion-1/ejecutar"`. Mantener intacta la posterior comprobación de que jugador no ve ninguno.
8. Ejecutar `npm.cmd test -- --run src/__tests__/components/SesionEjecutarView.test.tsx` y esperar **PASS**. La corrección no puede limitarse a escoger arbitrariamente el primer enlace ni eliminar la aserción del destino.
9. Ejecutar juntas las tres regresiones dirigidas: `npm.cmd test -- --run src/__tests__/data-table.test.tsx src/__tests__/components/SesionesListView.test.tsx src/__tests__/components/SesionEjecutarView.test.tsx`; esperar **PASS**.
10. Actualizar las dos incidencias de ronda 1 con causa, corrección aplicada y evidencia verde dirigida; mantenerlas en el historial como **RESUELTAS**, no borrarlas.

**Gate STANDARD antes de documentación:**

1. Encargar al verifier independiente una nueva ronda completa con perfil `standard`; no rebajarlo ni reutilizar resultados parciales de ronda 1.
2. Ejecutar `npm.cmd run lint` y esperar código 0 sin errores.
3. Ejecutar `npx.cmd tsc --noEmit` y esperar código 0 sin errores de tipos.
4. Ejecutar `npm.cmd test -- --run` y esperar toda la suite Vitest en verde.
5. Ejecutar `npm.cmd run build` y esperar build Next.js 16 correcto.
6. Si está disponible una sesión local autenticada, abrir la lista de sesiones a `375x667` y comprobar intencionadamente: la tarjeta sigue abriendo edición fuera de la acción; `Ejecutar` es visible, táctil, enfocable y abre el runner; ambos destinos se distinguen con claridad. Registrar evidencia breve. No crear ni ejecutar un E2E y no elevar a perfil `full` por esta inspección.
7. Si cualquier comando falla, no actualizar documentación: resolver dentro del alcance, repetir el gate completo y registrar solo incidencias major/critical en `## Incidencias de verificación`.

### Task 2 (final): Actualizar el seguimiento funcional tras verificación verde

**Skills:** `writing-plans` (Definición de Terminado; no aplica una skill de stack a documentación).

**Dependencia:** ejecutar esta tarea únicamente cuando el verifier haya dejado verde todo el gate STANDARD de Task 1.

**Files:**

- Modify: `docs/backlog.md` (entrada `B2-5`).
- Modify: `docs/crud-audit.md` (apartado de sesiones).

**Steps:**

1. Marcar `B2-5` como `[x]` en `docs/backlog.md`, preservando el texto y formato existentes.
2. Actualizar el apartado de sesiones en `docs/crud-audit.md` para dejar explícito que el acceso a `Ejecutar` está disponible tanto en escritorio como en móvil para roles autorizados, mientras la validación de ejecutabilidad sigue en el runner.
3. No modificar `docs/design-guides/`: el cambio no introduce una convención ni altera el stack.
4. No crear ni tocar `COMPLETADAS.md` ni inventar otras tareas/documentos.
5. Revisar que las dos ediciones documentales describen exactamente el comportamiento verificado y no declaran cambios de RBAC, estados o runner.

## Criterios de aceptación

- A `375x667`, una tarjeta de sesión muestra a un rol autorizado un enlace enfocable con nombre accesible `Ejecutar`, objetivo táctil de al menos 42 px y foco visible.
- Para la sesión de id `<id>`, el enlace tiene exactamente `/sesiones/<id>/ejecutar`.
- Click y activación por teclado del enlace no abren el editor de sesión; tocar el resto de la tarjeta conserva la edición.
- Un jugador no ve `Ejecutar` en la tarjeta móvil.
- Una sesión `Borrador` sí muestra la acción a un rol autorizado; la lista no filtra `Borrador`, `Planificada`, `Realizada` ni `NoRealizada` para decidir la visibilidad.
- El runner separado conserva la responsabilidad de rechazar/aceptar la ejecución según el estado real.
- La acción de escritorio conserva su comportamiento y gate actuales.
- No se modifica `SesionForm`, no hay cambios de datos/migraciones/RBAC y no se toca código compartido salvo la contingencia semántica documentada y previamente cubierta.
- Los cuatro comandos del perfil STANDARD terminan en verde y, si el entorno autenticado está disponible, queda registrada la inspección móvil intencionada.
- Solo después del verde se actualizan `docs/backlog.md` (`B2-5`) y `docs/crud-audit.md` (sesiones escritorio+móvil).
