# Ejecución de sesiones por bloques Implementation Plan

**Goal:** Convertir cada sesión en una composición ordenada de bloques editables y ejecutables, con recursos consultables y un único cronómetro persistente que nunca se inicia automáticamente.

**Registro:** TASK-007 · **Tarea maestra:** `task/task-sesiones-bloques-ejecucion-08-08-2026.md`

**Architecture:** Una tabla nueva `sesion_bloques` conserva la identidad, orden y contenido de los bloques sin reinterpretar `sesion_detalle`; una RPC transaccional valida permisos, reemplaza la composición y recalcula `sesiones.duracion_estimada`. React Query mantiene la definición remota y un runner cliente aislado guarda únicamente el estado temporal en `localStorage`, separando `activeBlockId` de `viewedBlockId` y derivando el tiempo restante desde marcas de tiempo reales.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/PostgreSQL con RLS, React Query, React Hook Form + Zod, Vitest + Testing Library, Playwright y `agent-browser`.

## Perfil de verificación

- Nivel: `full`
- Motivo: introduce una migración, una RPC de escritura, RLS/grants, datos persistentes multi-tenant, cambios de autorización y un flujo operativo cuyo cronómetro debe sobrevivir recargas y coordinar pestañas.
- Comandos:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm test -- --run src/__tests__/schemas/sesion-bloques.schema.test.ts src/__tests__/lib/sesionBloques.test.ts src/__tests__/lib/sesionRunnerState.test.ts src/__tests__/services/sesion-bloques.service.test.ts src/__tests__/hooks/useSesionRunner.test.tsx src/__tests__/components/SesionBloquesEditor.test.tsx src/__tests__/components/SesionEjecutarView.test.tsx src/__tests__/components/SesionForm.test.tsx`
  - `npm test -- --run`
  - `npm run build`
  - `npm run test:e2e -- e2e/sesiones-ejecucion.spec.ts --project=chromium`
  - `npm run test:e2e -- e2e/sesiones-ejecucion.spec.ts --project="Mobile Chrome"`
  - `npx supabase migration list --linked`
  - consultas de verificación de tabla, constraints, grants, policies, RPC y suma de duración contra development mediante Management API
  - `agent-browser skills get core` antes del recorrido exploratorio de escritorio y 375×667
- Evidencias esperadas:
  - historial local/remoto de migraciones alineado y tipos regenerados desde development;
  - lectura y escritura autorizadas para `superadmin`, `admin`, `gerente_sede` y `entrenador`, con denegación real para `jugador`, anónimo y otro workspace;
  - reemplazo atómico de bloques, orden continuo y `duracion_estimada = SUM(duracion_minutos)` comprobados en BD y UI;
  - cronómetro sin autoplay, persistencia real tras cierre/recarga, previsualización independiente y convergencia entre pestañas;
  - suite completa, build, Chromium, Mobile Chrome y recorrido accesible sin incidencias `major`/`critical`.

## Incidencias de verificación

<!-- Se rellena durante /exec o /auto solo para fallos major/critical. -->

- Fecha: 09/08/2026 Europe/Madrid · Ronda: pre-verifier/Task8 · Severidad: **critical** · Capa: E2E/RBAC y persistencia remota. Síntoma: el entorno no proporciona estados autenticados ni credenciales para `admin`, `gerente_sede`, `entrenador` y `jugador`; faltan también una sesión fixture con bloques/recurso y una vía segura de lectura de BD. Impacto: no se puede certificar con identidades reales la autorización, el editor persistente, el runner, la convergencia entre pestañas, ni el cruce BD↔UI/ausencia de escrituras en `sesion_detalle`. Evidencia reproducible: con `npm.cmd run test:e2e -- e2e/sesiones-ejecucion.spec.ts --project=chromium` y `--project="Mobile Chrome"` fuera del sandbox, ambos resultados fueron `1 passed, 7 skipped`; los siete skips indican los cuatro roles ausentes. El primer intento dentro del sandbox falló en `e2e/support/clone-auth.ts` con `fetch failed`/`EACCES`, sin exponer secretos. Criterio de cierre: provisionar estados/credenciales de development para los cuatro roles, una fixture limpia con al menos dos bloques y Documento, y acceso de solo lectura autorizado para comparar BD; repetir Task 8 completo.

- Fecha: 09/08/2026 Europe/Madrid · Ronda: remediación 1/Task8 · Severidad: **critical (continúa)** · Capa: E2E/RBAC y fixtures. Causa corregida: `e2e/support/auth.ts` solo leía `E2E_TEST_*`, aunque la identidad de prueba autorizada está configurada como `TEST_USER_*`; además la spec no reutilizaba los estados temporales ya generados por el bootstrap para los roles reales. Corrección: fallback en memoria a `TEST_USER_*` y consumo de `E2E_CLONE_STORAGE_STATE` (`admin`) y `E2E_CLONE_NON_MANAGER_STORAGE_STATE` (`entrenador`), sin escribir secretos ni estados versionados. Evidencia: el bootstrap autenticó esa única identidad y resolvió solo los roles reales `admin` y `entrenador`; `gerente_sede` y `jugador` continúan sin identidad y sus skips se mantienen explícitos. Bloqueo actual: Chromium dirigido fuera del sandbox aborta antes de ejecutar la spec con `Clone E2E bootstrap failed at manager source sede with equipos`; falta la fixture de sede requerida por la clonación, por lo que todavía no puede generarse el estado temporal ni ejecutarse cobertura autenticada, editor, runner o Mobile. Criterio de cierre sin cambios: habilitar la fixture autorizada y las identidades/fixtures restantes, luego repetir Task 8 completo.

- Fecha: 09/08/2026 Europe/Madrid · Ronda: remediación 2/Task8 · Severidad: **critical (continúa)** · Capa: infraestructura E2E/RBAC. Causa: `playwright.config.ts` registraba `clone-auth.ts` como `globalSetup` para cualquier invocación, por lo que el comando dirigido de sesiones ejecutaba obligatoriamente el bootstrap de clonación y abortaba en la fixture ajena `manager source sede with equipos`. Corrección: una invocación cuya ruta exacta es `e2e/sesiones-ejecucion.spec.ts` omite únicamente ese `globalSetup`; las demás invocaciones, incluida la suite de clonación, mantienen el bootstrap estricto. La spec de sesiones autentica cada página de `admin` y `entrenador` contra la identidad autorizada, resuelve una membership real y coloca solo el token de sesión y workspace en el contexto efímero del navegador; la contraseña no se escribe ni se persiste. `gerente_sede` y `jugador` permanecen omitidos sin suplantación. Evidencia pendiente de la única ejecución Chromium dirigida de esta ronda. Bloqueo de cobertura: sigue faltando una identidad real para ambos roles y una fixture de sesión autorizada con bloques/recurso para editor y runner.

- Fecha: 09/08/2026 Europe/Madrid · Ronda: remediacion 3/Task8 · Severidad: **critical (continua)** · Capa: E2E/RBAC y fixtures. Causa del primer Chromium: dos expectativas de la spec no coincidieron con la UI real; el encabezado `/sesiones/i` resolvia tambien el empty state y el CTA accesible es `Nueva`, no `Nueva sesion`. Correccion minima: selectores exactos semanticos en `e2e/sesiones-ejecucion.spec.ts`, sin modificar producto, autenticacion ni fixture. Evidencia: Chromium inicial `1 passed, 2 failed, 5 skipped`; Chromium post-correccion `3 passed, 5 skipped`; Mobile Chrome `3 passed, 5 skipped`. Los tres pass cubren la denegacion anonima y la lista/CTA de `admin` y `entrenador` autenticados reales en ambos proyectos. Los cinco skips siguen explicitos: no existe `E2E_SESIONES_FIXTURE_ID` con bloques/recurso para los dos runners y faltan identidades reales de `gerente_sede` y `jugador`. Aislamiento: `npx.cmd playwright test e2e/sede-clone.spec.ts --list` no ejecuto clonacion y falla porque conserva los storage states que debe crear su bootstrap; la exencion de `globalSetup` sigue limitada a la ruta exacta de sesiones. Lint dirigido PASS. Bloqueo actual: provisionar fixture autorizada y las dos identidades faltantes; no se marca resuelta.

- Fecha: 09/08/2026 Europe/Madrid · Ronda: 1/5, nueva autorización E2E · Estado: **en progreso** · Alcance autorizado: se creó el workspace inequívoco `E2E Sesiones Bloques 09-08-2026`, cuatro usuarios sintéticos auto-confirmados con roles efectivos `admin`, `entrenador`, `gerente_sede` y `jugador`, y la fixture propia (sede, equipo, ejercicio repetible, Documento de enlace seguro, sesión y tres bloques 10/20/5). Preflight y postflight en `rgmrqkoudyotkpqgezzv/main`: 4 usuarios/4 IDs distintos/4 confirmados; 1 workspace/4 membresías/4 perfiles; 1 sede/equipo/ejercicio/documento/sesión; 3 bloques, duración 35 y 0 filas de `sesion_detalle`. IDs y credenciales quedan exclusivamente en `.env.test.local` ignorado. Chromium dirigido post-fix: `4 passed, 4 failed, 0 skipped`; las cuatro identidades iniciaron sesión y la lista/CTA autorizada pasó. Incidencia abierta: las cuatro pruebas que navegan al runner fallan por `page.goto` abortado/timeout en `/sesiones/<fixture>/ejecutar`, no por Auth/RBAC. No se ejecutaron Mobile ni recorrido `agent-browser` por este fallo; los storage states por rol siguen pendientes. La incidencia previa no se marca resuelta hasta cerrar runner, persistencia y cobertura completa.

- Fecha: 09/08/2026 Europe/Madrid · Ronda: 4/5 · Capa: runner cliente/UI. Causa: una clave de `localStorage` ausente se trataba como payload inválido; el aviso resultante hacía que `SKIP` y `PLAY` devolvieran el estado sin mutar. La vista sí emitía el mensaje live de salto, por lo que el temporizador y el estado quedaban en el bloque anterior. Corrección: ausencia (`null`/`undefined`) hidrata un estado fresco sin aviso; un payload presente inválido conserva la invalidación. La etiqueta del activo detenido es `Preparado`; solo activo y corriendo es `En curso`, y un visto distinto es `Previsualizando`. Evidencia local: `21/21` tests state/hook/view, ESLint dirigido y `npx.cmd tsc --noEmit` PASS. E2E Chromium no inició: el build externo resolvió las fuentes pero falló en el artefacto generado `.next/dev/types/routes.d.ts:60` (`ister": {}`), ajeno a esta corrección. No quedó servidor ni listener en los puertos 3000/3100.

- Fecha: 09/08/2026 Europe/Madrid · Ronda: diagnóstico aislado posterior al verifier · Clasificación: **incidencia transitoria/no reproducida** · Síntoma informado: el runner del rol `jugador` caía en el error boundary únicamente en Mobile Chrome. Reproducción: `npm run build` PASS en Next.js 16.2.1 y servidor de producción aislado en `3103`; el caso móvil del jugador renderizó «No tienes permiso para ejecutar esta sesión.», sin `pageerror` ni stack. La única consola/red fue el 404 no bloqueante de `/_vercel/insights/script.js` (`net::ERR_ABORTED`). Evidencia de regresión: `e2e/sesiones-ejecucion.spec.ts` completo, `Mobile Chrome` `8 passed, 0 skipped` (26.1 s) y `chromium` `8 passed, 0 skipped` (29.7 s), ambos contra la misma build aislada. Conclusión: no hay causa ni corrección de producto sustentadas y no se modificó producción; el fallo previo se clasifica como estado/servidor E2E transitorio. Se eliminaron los tests/configuración de diagnóstico temporales y se cerró el servidor `3103`.

- Fecha: 09/08/2026 Europe/Madrid · Cierre factual Task 8/Task 9 · Estado: **PASS**. Las incidencias critical históricas quedan resueltas: se cubrieron identidades y fixture de prueba autorizadas, se corrigieron el aislamiento del `globalSetup`, los selectores E2E y la hidratación de una clave `localStorage` ausente. Evidencia: lint y `tsc` PASS; 51 pruebas dirigidas y 546 de Vitest completas PASS; build PASS; fixture e invariantes de BD PASS; E2E gestionado `chromium` 8/8 y `Mobile Chrome` 8/8, ambos sin skips. La incidencia móvil posterior no se reprodujo en build aislada y se mantiene como transitoria, no como defecto de producto. No se incluyen secretos, identificadores, correos ni datos personales.

## Registro de ejecución Task 1

- Fecha: 08/08/2026 17:21:21 Europe/Madrid (UTC+02:00).
- Método/comandos: `npx.cmd --yes supabase@2.113.0 --version`; `npx.cmd supabase migration list --linked`; preflight de solo lectura mediante `Invoke-RestMethod` al endpoint Management API de development, con `SUPABASE_DEV_PROJECT_REF` y `SUPABASE_ACCESS_TOKEN` sin imprimir sus valores.
- Resultado: CLI 2.113.0 disponible. `migration list --linked` no pudo cargar `.env` (`LegacyDbConfigLoadError`, sintaxis no válida en la línea 14). El proceso no tenía las dos variables requeridas; la credencial `SUPABASE_ACCESS_TOKEN` localizada sin exponerla fue rechazada por la API (`JWT could not be decoded`).
- Comprobaciones posteriores: no se creó ni aplicó DDL, no se ejecutó `migration repair`, y quedan sin evidencia el preflight remoto, RED de esquema, lint SQL, RBAC/atomicidad/duración, regeneración de tipos y `tsc`. Bloqueado antes de toda escritura remota hasta disponer de credenciales válidas de development y un `.env` que el CLI pueda leer.

- Reanudación: 08/08/2026 17:27:45 Europe/Madrid (UTC+02:00). Tras el login de Supabase CLI, el gate local mantiene `.env` línea 14 como una entrada sin separador `=`; no se pueden cargar las variables de development ni confirmar la identidad del proyecto. El primer intento de CLI también quedó bloqueado por la ejecución de `npx.ps1`; queda pendiente reintento seguro con `npx.cmd`. No se ha escrito remoto ni se ha modificado `.env`.

- Reanudación: 08/08/2026 17:52:36 Europe/Madrid (UTC+02:00). `.env` valida sintácticamente, `SUPABASE_DEV_PROJECT_REF` coincide exactamente con `rgmrqkoudyotkpqgezzv` y `SUPABASE_ACCESS_TOKEN` está vacío. `npx.cmd supabase --version` y su variante sin instalación no terminaron dentro de 30 s; no hay binario ni paquete Supabase local. La inspección no sensible de Windows Credential Manager para este proceso no encontró ninguna credencial almacenada, por lo que no se leyó ningún PAT, no se construyó ningún header Bearer y no se llamó a endpoint alguno. Se creó y pasó la comprobación estructural local (LF, contrato DDL/RLS/RPC/grants y ausencia de DML sobre `sesion_detalle`) `supabase/migrations/20260808090000_sesion_bloques_ejecucion.sql`; no hay parser PostgreSQL local. Quedan bloqueados el preflight/RED remoto, aplicación, reconciliación canónica, verificaciones remotas, regeneración de tipos y `tsc` hasta que el PAT autorizado sea accesible para este proceso exclusivamente mediante Windows Credential Manager.


- Reanudación/cierre estructural: 08/08/2026 19:50:21 Europe/Madrid (UTC+02:00). Método: sesión autenticada de `Supabase Dashboard SQL Editor`, exclusivamente en project ref `rgmrqkoudyotkpqgezzv`, rama `main`. Aclaración factual posterior del propietario: «da igual solo hay una base de datos y estamos en modo prueba así que da igual podemos seguir con main»; aunque el Dashboard la etiqueta `Production`, se usó solo bajo la autorización de prueba existente y no se navegó a otro ref/rama. `.env` validó sintaxis y ref sin exponer valores; `npx.cmd supabase --version` confirmó 2.113.0 sin PAT/red. Preflight RED: tabla/RPC/versión ausentes; columnas/FKs de `sesiones`, `ejercicios`, `documentos` y `sesion_detalle`, helpers, policies y grants inspeccionados. El DDL inicialmente cargado coincidió con el archivo local tras la normalización exclusiva LF→CRLF del editor (SHA-256 `76A3661BB7E911375CCD4E2DA61E645970A1F3DE43F817C98B169AA8FC3589AB`) y devolvió `Success. No rows returned`. Postflight detectó grants heredados `TRUNCATE`/`REFERENCES`/`TRIGGER` para `authenticated`; corrección estrictamente necesaria aplicada en la migración (`REVOKE ALL` también para `authenticated`) y en remoto, sin tocar `sesion_detalle`. La reconciliación canónica registró/actualizó `20260808090000` (`sesion_bloques_ejecucion`); su contenido normalizado coincide con el archivo final (MD5 `6089539ef36d966b03dcba1230a749f6`, SHA-256 local `DFEC02C0F18DED7BD835CB8BE9556B1D4849081BA75314690D2DFB64DC49EA5C`). Postflight final: tabla/8 columnas, FKs, checks, PK/unique, los dos índices, RLS, policy SELECT de los cuatro roles, RPC `SECURITY DEFINER` con `search_path=public, pg_temp`, execute solo para `authenticated`, y sin privilegios directos `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`/`REFERENCES`/`TRIGGER`; `sesion_detalle` conserva exactamente sus siete columnas. `npx.cmd tsc --noEmit` PASS. No se falsificó `auth.uid()` ni se crearon fixtures, por lo que RBAC real por identidad, atomicidad/rollback y suma 10+20+5 siguen sin evidencia de ejecución. La regeneración de `src/types/database.types.ts` queda bloqueada: el Dashboard no expuso una exportación de tipos y `supabase gen types --linked` requeriría una credencial/endpoint CLI prohibido por este alcance; no se editó manualmente el generado.

- Reanudación RBAC/tipos: 08/08/2026 20:02 Europe/Madrid (UTC+02:00). Método: sesión autenticada del Dashboard en el mismo ref/rama; SQL Editor con transacciones `BEGIN`/`ROLLBACK`, `SET LOCAL ROLE authenticated` y `request.jwt.claim.sub` establecido exclusivamente con identidades reales, sin exponer identificadores. El inventario agregado halló solo `admin` y `entrenador`; faltan `superadmin`, `gerente_sede` y `jugador`. Para ambos roles disponibles, la RPC válida devolvió lectura RLS, orden `1,2,3`, suma y `duracion_estimada` `10+20+5=35`; un payload inválido fue rechazado y preservó los tres bloques dentro de la transacción. Un administrador contra una sesión de otro workspace tuvo SELECT y RPC denegados. Todas las escrituras se revirtieron; no se dejaron datos. Las denegaciones de anónimo siguen cubiertas por grants/postflight estructural y los tres roles ausentes se difieren a Task 8; no se inventaron identidades.

  Tipos: la UI actual del Dashboard no expone Generate/Download en Data API Docs, Settings, Database ni Table Editor. La ruta GET oficial de tipos con la sesión normal fue bloqueada por el cliente (`ERR_BLOCKED_BY_CLIENT`) sin inspeccionar cookies ni tokens. El modal Connect confirmó host/usuario/puerto de conexión directa, pero la generación local autorizada con `PGPASSWORD` solo en memoria y sin secreto en argumentos no produjo salida, también fuera del sandbox; no se probaron poolers ni variantes. Al cierre, el archivo compartido sí contiene `sesion_bloques` y `replace_sesion_bloques`, pero este executor no puede atribuirlo a una generación oficial de esta ejecución; no lo editó manualmente. `npx.cmd tsc --noEmit` PASS. Veredicto Task 1: **BLOCKED** exclusivamente por falta de evidencia de regeneración oficial de tipos; no es incidencia major nueva porque no existe desviación del esquema remoto.

- Cierre factual: 08/08/2026 Europe/Madrid. La migración `20260808090000_sesion_bloques_ejecucion` quedó aplicada y reconciliada en el único entorno de prueba `rgmrqkoudyotkpqgezzv`, rama `main`, mediante SQL Editor; el postflight completo quedó verde, con `authenticated` limitado a `SELECT` y `anon` sin grants. `sesion_detalle` permaneció intacto y el contenido local/remoto coincide. El archivo actual de tipos contiene `sesion_bloques` (`Row`/`Insert`/`Update`/`Relationships`) de ocho columnas y la RPC `replace_sesion_bloques` coherente; `npx.cmd tsc --noEmit` PASS. Su procedencia concurrente no puede determinarse: se registra como limitación de trazabilidad, sin atribuir autoría, y no como fallo funcional.

- RBAC y atomicidad: con `BEGIN`/`ROLLBACK`, las identidades reales disponibles de `admin` y `entrenador` quedaron permitidas; otro workspace quedó denegado. Se verificaron `10+20+5=35`, orden `1..3` y que un payload inválido no borra los bloques; no persistieron datos. No había identidades reales de `superadmin`, `gerente_sede` ni `jugador`; esa cobertura real se difiere explícitamente a la Task 8 E2E, que ya la exige, sin afirmar que esos roles fueran probados.

- Veredicto Task 1: **PASS funcional**, con las limitaciones de trazabilidad y cobertura real de roles documentadas y diferidas a Task 8; no queda un fallo funcional abierto en el contrato de datos, RLS, grants, RPC, atomicidad o tipos actuales.

---

## Autorización de migración

- Entorno: `development`
- Estado: `AUTORIZADA`
- Decisión: «Sí, autorizo la migración en development» — respuesta inequívoca del usuario registrada el 08/08/2026, Europe/Madrid.
- Comando previsto:
  1. `npx supabase --version`
  2. `npx supabase migration list --linked`
  3. crear `supabase/migrations/20260808090000_sesion_bloques_ejecucion.sql` mediante edición quirúrgica;
  4. enviar el contenido del archivo a `https://api.supabase.com/v1/projects/$env:SUPABASE_DEV_PROJECT_REF/database/query` con `Invoke-RestMethod`, `Authorization: Bearer $env:SUPABASE_ACCESS_TOKEN` y cuerpo JSON `{ "query": "<SQL>" }`, sin imprimir credenciales;
  5. `npx supabase migration repair 20260808090000 --status applied --linked`;
  6. `npx supabase migration list --linked`;
  7. `npx supabase gen types typescript --linked` para regenerar `src/types/database.types.ts`.
- Tablas/recursos: nueva `public.sesion_bloques`; FKs de solo referencia a `public.sesiones`, `public.ejercicios` y `public.documentos`; actualización de `sesiones.duracion_estimada`; función `public.replace_sesion_bloques(uuid,jsonb)`; RLS, policies, índices y grants asociados.
- Operaciones: preflight del esquema/policies remotos; creación de tabla y constraints; `ENABLE ROW LEVEL SECURITY`; lectura multi-tenant; revocación de DML directo; RPC atómica con autorización explícita por rol/workspace, validación de Documento y actualización de duración; sin backfill ni cambios en `sesion_detalle`.
- Riesgos: drift remoto ya documentado; policy demasiado amplia o restrictiva; locks breves de DDL; bloqueo de borrado de ejercicios referenciados; definición de sesión visible mientras otra pestaña edita; pérdida del progreso local al cambiar bloques; divergencia entre la duración nueva y el valor histórico.
- Rollback/recuperación: antes de escrituras reales, revocar y eliminar RPC/policies/tabla mediante una migración forward; después de guardar bloques, desactivar la ruta/editor y conservar o exportar `sesion_bloques`, nunca hacer `DROP` destructivo. El código anterior puede volver a leer `sesion_detalle`, que permanece intacta; cualquier restauración de `duracion_estimada` se hará desde backup/auditoría, no por una fórmula inventada.
- Producción: fuera de esta autorización. La promoción y su rollback serán una operación humana manual tras verificar development.

## Hallazgos que condicionan la implementación

- `sesion_detalle` ya tiene `id`, `sesion_id`, `ejercicio_id`, `orden`, `tiempo_ejecucion`, `tiempo_descanso` y `variante_aplicada`, pero no título ni recurso por fila. El servicio actual hace `delete + insert` no transaccional.
- `SesionForm` permite ordenar al añadir/eliminar y editar tiempos, pero no reordenar libremente; el selector evita repetir ejercicio. La nueva composición elimina esa restricción.
- `documentos` ya discrimina archivo frente a enlace externo. YouTube y Google Drive se almacenan como URL; no se crean proveedores nuevos.
- La matriz UI de `src/lib/permisos.ts` ya reconoce `superadmin`, `admin`, `gerente_sede` y `entrenador` para Sesiones. Las policies históricas muestran drift, por lo que el SQL remoto se audita antes de aplicar y no se copia a ciegas desde `APPLY_NOW.sql`.
- La sección B2 de `docs/backlog.md` se solapa con esta feature y está desactualizada respecto al servicio/formulario existente. TASK-007 la absorbe; no se abre un segundo alcance paralelo.
- No existe dependencia ni componente drag-and-drop. Subir/Bajar cubre reordenación con teclado y evita ampliar dependencias.
- Next.js 16 exige `params: Promise<{ sesionId: string }>` y `await params` en la nueva Server Page; la carga autenticada existente sigue en el cliente mediante hooks.

## Contratos cerrados

### Modelo persistente

| Campo | Contrato |
|---|---|
| `id` | UUID generado por BD, identidad estable hasta la siguiente edición de la composición |
| `sesion_id` | FK obligatoria, `ON DELETE CASCADE` |
| `titulo` | texto recortado, 1–120 caracteres |
| `duracion_minutos` | entero `> 0`, sin máximo artificial |
| `ejercicio_id` | FK obligatoria; un ejercicio se puede reutilizar en varios bloques; `ON DELETE RESTRICT` |
| `documento_id` | FK nullable y singular; `ON DELETE SET NULL` |
| `orden` | entero 1-based, continuo y único dentro de la sesión |

- El editor exige al menos un bloque al guardar.
- La RPC recibe el array completo, bloquea la fila de sesión, valida acceso y payload, reemplaza todos los bloques en una sola transacción y actualiza `duracion_estimada` con la suma.
- El cliente autenticado tiene `SELECT` según RLS, pero no DML directo. Solo la RPC puede mutar; debe fijar `search_path`, comprobar `auth.uid()`, workspace y rol antes de operar.
- Si `documento_id` está presente, la RPC comprueba que el Documento pertenece al alcance visible de la sesión. No basta con que la FK exista.
- `sesion_detalle` no se toca. Si `sesion_bloques` está vacío, el servicio puede leer el legado y devolver `source: "legacy-draft"`; tras el primer guardado, la nueva tabla pasa a ser la fuente activa.

Justificación del snippet: DDL, FKs y límites de autorización son el contrato crítico de persistencia; el cuerpo rutinario de la RPC se deja al executor, pero no puede cambiar estas garantías.

```sql
create table public.sesion_bloques (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  duracion_minutos integer not null check (duracion_minutos > 0),
  ejercicio_id uuid not null references public.ejercicios(id) on delete restrict,
  documento_id uuid references public.documentos(id) on delete set null,
  orden integer not null check (orden >= 1),
  created_at timestamptz not null default now(),
  unique (sesion_id, orden)
);

create index idx_sesion_bloques_ejercicio
  on public.sesion_bloques (ejercicio_id);
create index idx_sesion_bloques_documento
  on public.sesion_bloques (documento_id)
  where documento_id is not null;
```

La migración debe cerrar con estas garantías verificables:

- `REVOKE INSERT, UPDATE, DELETE ON public.sesion_bloques FROM anon, authenticated`;
- `GRANT SELECT ON public.sesion_bloques TO authenticated` y policy de lectura solo para los cuatro roles autorizados en el workspace de la sesión;
- `REVOKE ALL ON FUNCTION public.replace_sesion_bloques(uuid,jsonb) FROM PUBLIC, anon` y `GRANT EXECUTE ... TO authenticated`;
- la RPC deniega `jugador`, otro workspace, sesión inexistente, array vacío, órdenes duplicados/no continuos, campos extraños y Documento fuera de alcance;
- la RPC devuelve los bloques persistidos ordenados para que el cliente no haga una segunda escritura.

### Importación del legado

- Ordenar `sesion_detalle` por `orden`.
- Por fila: `titulo = ejercicio.titulo`, `duracionMinutos = tiempo_ejecucion`, mismo `ejercicioId`, `documentoId = null`.
- `tiempo_descanso`, `variante_aplicada` y fechas del detalle no se inventan ni se borran; quedan en la tabla antigua y fuera del nuevo bloque.
- Si falta ejercicio/título/duración positiva, marcar el borrador incompleto, mostrar el campo y bloquear Guardar/Ejecutar hasta corregirlo.
- No insertar el borrador al abrir el modal. Solo una acción Guardar confirmada llama a la RPC.

### Estado local del ejecutor

Clave canónica:

```text
sportapp:sesion-runner:v1:<userId>:<workspaceId>:<sesionId>
```

Payload versionado —contrato, no implementación literal—:

```ts
type PersistedSesionRunnerV1 = {
  version: 1
  userId: string
  workspaceId: string
  sesionId: string
  blocksSignature: string
  viewedBlockId: string
  activeBlockId: string | null
  remainingMsByBlockId: Record<string, number>
  running: boolean
  startedAtEpochMs: number | null
  completedBlockIds: string[]
  skippedBlockIds: string[]
  revision: number
  writerTabId: string
  updatedAtEpochMs: number
}
```

Justificación del snippet: la persistencia sobrevive versiones, usuarios y pestañas; fijar el payload evita estados incompatibles o exposición accidental de recursos.

Invariantes del reducer/store:

- `viewedBlockId` cambia con Anterior/Siguiente o selección directa sin tocar ningún campo del cronómetro.
- `Play(viewedBlockId)` materializa primero el restante del activo; si cambia de bloque, congela el anterior y usa el restante guardado del elegido. Si el elegido estaba a cero, lo reinicia a su duración completa.
- `Pause` solo opera sobre el activo y persiste el restante materializado.
- Mientras `running`, el restante efectivo es `max(0, baseRemaining - max(0, now - startedAt))`; el intervalo solo repinta, no descuenta ni escribe un segundo cada tick.
- Al alcanzar cero se persiste una sola transición: activo completado, siguiente `activeBlockId` preparado, `running=false`, `startedAt=null`. Nunca se encadena Play.
- `Skip` marca el activo, lo lleva a cero y prepara el siguiente parado. No equivale a navegar la previsualización.
- Si termina el último, el activo queda a cero y la ejecución queda completada/parada.
- Al hidratar, identidad o versión distintas descartan el payload. Una `blocksSignature` distinta reinicia todo el runner con aviso en español.
- Si `Date.now()` retrocede por debajo de la última marca, nunca se aumenta el restante: se congela y se avisa de cambio de reloj. Los saltos hacia delante se materializan normalmente.
- Cada acción relee la revisión almacenada, incrementa `revision` y escribe una vez. El evento `storage` adopta una revisión mayor; empate se resuelve por `updatedAtEpochMs` y después `writerTabId`. La última acción explícita válida converge en todas las pestañas.
- `beforeunload` no es necesario para exactitud: `startedAtEpochMs` ya permite reconstruir el transcurso real.

### UI, accesibilidad y movimiento

- La lista mantiene el orden de acciones `Editar`, `Ejecutar`, `Eliminar` y usa un `Link` para navegación.
- El editor muestra suma calculada, bloque numerado, título, minutos, ejercicio, Documento opcional, Abrir recurso, Subir, Bajar y Eliminar. Los controles inválidos se describen con mensajes en español.
- La ejecución diferencia visual y semánticamente `En curso`/`Preparado` de `Previsualizando`. El temporizador tiene `role="timer"`; no anuncia cada segundo y usa una región `aria-live="polite"` solo para pausa, cambio, agotado, salto y errores.
- Los botones tienen nombre accesible, foco visible, estado disabled correcto y área táctil mínima. El orden del DOM sirve tanto a móvil como escritorio.
- No se añade movimiento necesario. Cualquier transición de opacidad/posición se desactiva con `prefers-reduced-motion`; el tiempo lógico nunca depende de animaciones.
- Abrir Documento usa `getDocumentoOpenUrl`, una pestaña segura con `noopener,noreferrer`, y no dispara Play ni autoplay de medios.

## Estrategia TDD

- Ejecutar vertical slices: un comportamiento observable RED → implementación mínima GREEN → refactor con la prueba verde.
- Preferir interfaces públicas: schema, servicio, editor y runner; no afirmar detalles privados ni contar llamadas salvo en el borde Supabase/storage.
- Usar temporizadores falsos y un reloj inyectable en unitarias. E2E valida tiempo real solo con intervalos cortos y tolerancia explícita.
- No mockear el reducer dentro de la vista: los tests de componente deben activar controles accesibles y observar estado visible.
- No crear todas las pruebas antes de toda la implementación; cada Task mantiene ciclos pequeños.
- Este flujo es `/spec`/`/exec` sin git: se omiten pasos de commit y no se crea rama.

### Task 1: Crear y aplicar el contrato PostgreSQL autorizado

**Skills:** `tdd`, `sql-optimization-patterns`

**Files:**
- Create: `supabase/migrations/20260808090000_sesion_bloques_ejecucion.sql`
- Modify (generado): `src/types/database.types.ts`

**Step 1: Comprobar CLI y drift remoto** — Run: `npx supabase --version` y `npx supabase migration list --linked` · Expected: proyecto development enlazado e historial legible; si no coincide con local, registrar incidencia `major` y resolver antes del DDL.

**Step 2: Ejecutar preflight de solo lectura** — Consultar mediante Management API columnas/FKs de `sesiones`, `ejercicios`, `documentos`, helpers de roles, `pg_policies`, grants y existencia de la función/tabla objetivo · Expected: nombres remotos confirmados y ningún objeto objetivo previo; no imprimir tokens.

**Step 3: Escribir la comprobación RED de esquema** — Ejecutar una query que busque `public.sesion_bloques`, sus constraints, policies y RPC · Expected: FAIL controlado porque la relación aún no existe.

**Step 4: Crear el DDL mínimo** — Añadir tabla, índices, RLS, policy SELECT, revocación de DML directo, RPC atómica y grants según los contratos anteriores. La función debe fijar `search_path`, bloquear la sesión, validar rol/workspace/Documento/payload y no tocar `sesion_detalle`.

**Step 5: Revisar SQL local** — Run: `npx supabase db lint --linked --level error` si la versión instalada lo soporta; si no, validar el archivo con el parser/flujo SQL existente · Expected: sin errores SQL ni avisos de funciones inseguras.

**Step 6: Aplicar solo en development** — Enviar exactamente el archivo de migración por Management API con las variables `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DEV_PROJECT_REF` ya configuradas · Expected: respuesta satisfactoria; no usar `supabase db push`.

**Step 7: Reconciliar el historial** — Run: `npx supabase migration repair 20260808090000 --status applied --linked` y luego `npx supabase migration list --linked` · Expected: versión local/remota `20260808090000` marcada aplicada.

**Step 8: Verificar seguridad y atomicidad** — Ejecutar casos SQL/RPC como admin, gerente_sede, entrenador, jugador y otro workspace: lectura, replace válido, Documento ajeno, payload inválido y rollback por error · Expected: solo los tres roles pedidos más superadmin pueden gestionar; no queda borrado parcial.

**Step 9: Verificar duración e integridad** — Reemplazar una composición de prueba 10+20+5, consultar bloques/sesión y provocar fallo en una fila · Expected: orden 1..3, duración 35 y rollback completo ante el fallo.

**Step 10: Regenerar tipos** — Run: `npx supabase gen types typescript --linked` guardando la salida en `src/types/database.types.ts`, seguido de `npx tsc --noEmit` · Expected: tipos incluyen `sesion_bloques` y RPC sin edición manual.

### Task 2: Definir bloques, suma e importación legado

**Skills:** `tdd`, `javascript-testing-patterns`

**Files:**
- Create: `src/types/sesion-bloques.ts`
- Create: `src/schemas/sesion-bloques.schema.ts`
- Create: `src/lib/sesionBloques.ts`
- Create: `src/__tests__/schemas/sesion-bloques.schema.test.ts`
- Create: `src/__tests__/lib/sesionBloques.test.ts`

**Step 1: RED del bloque mínimo** — Probar título recortado, duración entera positiva, ejercicio obligatorio y Documento nullable · Run: `npm test -- --run src/__tests__/schemas/sesion-bloques.schema.test.ts` · Expected: FAIL por módulos inexistentes.

**Step 2: GREEN del bloque mínimo** — Añadir tipos DTO/domain y Zod compartido, sin importar tipos generados dentro de componentes · Run: mismo comando · Expected: PASS del primer caso.

**Step 3: RED de composición** — Añadir un caso para mínimo un bloque, órdenes 1-based continuos, ejercicios repetibles y suma 35 para 10+20+5 · Expected: FAIL.

**Step 4: GREEN de composición** — Implementar normalización de orden y `sumarDuracionBloques` como función pura; no almacenar una segunda duración en estado de formulario · Expected: PASS.

**Step 5: RED de legado** — Probar orden conservado, título desde ejercicio, duración desde `tiempoEjecucion`, Documento nulo y borrador inválido cuando falta duración · Run: `npm test -- --run src/__tests__/lib/sesionBloques.test.ts` · Expected: FAIL.

**Step 6: GREEN de legado** — Implementar `mapSesionDetalleToBloquesDraft` sin escribir BD y sin mezclar descanso/variante · Expected: PASS.

**Step 7: RED/GREEN de firma** — Probar firma estable para mismos `id/orden/duración` y distinta ante añadir, eliminar, reordenar o cambiar minutos; implementar la mínima función determinista · Expected: PASS.

**Step 8: Refactor y verificación** — Run: ambos tests dirigidos y `npx tsc --noEmit` · Expected: PASS sin `any`, duplicación ni reglas de UI dentro del dominio.

### Task 3: Implementar servicio y hook React Query de bloques

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`

**Files:**
- Create: `src/services/sesion-bloques.service.ts`
- Create: `src/hooks/useSesionBloques.ts`
- Modify: `src/hooks/queryKeys.ts`
- Create: `src/__tests__/services/sesion-bloques.service.test.ts`

**Step 1: RED de lectura nueva** — Probar SELECT explícito ordenado con joins mínimos de ejercicio y Documento, mapper snake_case→camelCase y `{ data, error }` cuando no hay cliente · Expected: FAIL.

**Step 2: GREEN de lectura nueva** — Implementar `fetchSesionBloques(sesionId)` con `getSupabaseClient()`, filtro de sesión y sin `select('*')` · Run: `npm test -- --run src/__tests__/services/sesion-bloques.service.test.ts` · Expected: PASS.

**Step 3: RED del fallback legado** — Con cero filas nuevas, devolver borrador legado ordenado; con al menos una fila nueva, no consultar/mezclar `sesion_detalle` · Expected: FAIL.

**Step 4: GREEN del fallback** — Reutilizar `fetchSesionDetalle` y el mapper puro; exponer `source: "blocks" | "legacy-draft"` e `isExecutable` · Expected: PASS.

**Step 5: RED de reemplazo** — Probar payload camel→snake, llamada única a `replace_sesion_bloques`, propagación de error y bloques devueltos ordenados · Expected: FAIL.

**Step 6: GREEN de reemplazo** — Implementar `replaceSesionBloques` sin delete/insert cliente ni doble escritura legado · Expected: PASS.

**Step 7: RED/GREEN de cache** — Añadir `queryKeys.sesiones.bloques(sesionId)` y hook query/mutation; al guardar invalidar bloques, detalle/lista de sesión y Documentos relevantes, sin duplicar server state en Zustand · Expected: PASS en test de servicio y typecheck.

**Step 8: Verificar** — Run: `npm test -- --run src/__tests__/services/sesion-bloques.service.test.ts` y `npx tsc --noEmit` · Expected: PASS.

### Task 4: Sustituir el selector plano por el editor de bloques

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`

**Files:**
- Create: `src/components/sesiones/SesionBloquesEditor.tsx`
- Create: `src/components/sesiones/SesionBloqueResourcePicker.tsx`
- Modify: `src/components/sesiones/SesionForm.tsx`
- Create: `src/__tests__/components/SesionBloquesEditor.test.tsx`
- Modify: `src/__tests__/components/SesionForm.test.tsx`

**Step 1: RED de alta de bloque** — Renderizar el editor, añadir un bloque y exigir título/minutos/ejercicio con mensajes semánticos en español · Expected: FAIL.

**Step 2: GREEN de alta** — Implementar un bloque controlado compatible con el estado/formulario vecino y botones accesibles · Run: `npm test -- --run src/__tests__/components/SesionBloquesEditor.test.tsx` · Expected: PASS.

**Step 3: RED/GREEN de edición y borrado** — Probar edición independiente, repetición de ejercicio, borrado, bloqueo de eliminar el último sin reemplazo y renumeración 1-based · Expected: PASS tras la implementación mínima.

**Step 4: RED/GREEN de reordenación** — Probar Subir/Bajar por nombre accesible, límites disabled y que mover no cambia identidad/contenido · Expected: PASS; no añadir DnD.

**Step 5: RED/GREEN de Documento** — Probar ninguno/uno, selección visible, quitar y Abrir recurso seguro antes de Play; reutilizar servicios/tipos de Documentos, no el pivote de sesión · Expected: PASS.

**Step 6: RED de integración con SesionForm** — Editar una sesión legacy muestra borradores, bloquea duración ausente y muestra `Duración total: N min`; crear/repetir sesiones aplica la misma composición y suma a todas · Expected: FAIL.

**Step 7: GREEN de integración** — Sustituir `ejerciciosLineas`/selector plano por bloques, quitar edición manual de `duracionEstimada`, llamar a la mutation tras obtener cada sesión creada y no llamar `upsertSesionDetalle` · Expected: PASS.

**Step 8: Cubrir fallo parcial de series** — Si crear varias sesiones concluye pero falla guardar bloques en una, mostrar qué sesión falló y no anunciar éxito total; no ocultar ni reintentar destructivamente · Expected: PASS.

**Step 9: Verificar** — Run: `npm test -- --run src/__tests__/components/SesionBloquesEditor.test.tsx src/__tests__/components/SesionForm.test.tsx` y `npx tsc --noEmit` · Expected: PASS.

### Task 5: Construir la máquina de estados persistente del cronómetro

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`

**Files:**
- Create: `src/lib/sesionRunnerState.ts`
- Create: `src/__tests__/lib/sesionRunnerState.test.ts`

**Step 1: RED de inicialización** — Probar `activeBlockId` preparado, `viewedBlockId` inicial, todos los restantes completos y `running=false` · Expected: FAIL.

**Step 2: GREEN de inicialización** — Implementar estado y reducer puros con reloj inyectable · Run: `npm test -- --run src/__tests__/lib/sesionRunnerState.test.ts` · Expected: PASS.

**Step 3: RED/GREEN de previsualización** — Navegar a otro bloque conserva activo, `running`, `startedAt` y restantes; implementar solo `VIEW_BLOCK` · Expected: PASS.

**Step 4: RED/GREEN de Play/Pausa** — Play inicia solo el elegido; Pause materializa restante; Play en otro congela el anterior y reanuda el nuevo; no existen dos activos · Expected: PASS con timers falsos.

**Step 5: RED/GREEN de agotado** — Al llegar a cero preparar siguiente parado, mover vista solo si coincidía con el agotado y completar el último sin autoplay · Expected: PASS.

**Step 6: RED/GREEN de salto y reinicio** — Saltar marca activo a cero y prepara siguiente; Play sobre agotado/saltado restaura duración completa antes de arrancar · Expected: PASS.

**Step 7: RED/GREEN de serialización** — Clave aislada, payload V1 sin URLs, hidratación tras recarga/cierre y descuento por `startedAtEpochMs` · Expected: PASS.

**Step 8: RED/GREEN de invalidación** — Versión/identidad/firma distinta descarta estado y devuelve un motivo mostrable · Expected: PASS.

**Step 9: RED/GREEN de clock skew** — Reloj hacia atrás nunca aumenta tiempo y solicita pausa/aviso; salto hacia delante agota como máximo el activo y no arranca siguiente · Expected: PASS.

**Step 10: RED/GREEN multi-tab** — Probar revisión mayor, empate determinista y última acción explícita; ignorar eventos de otra clave/usuario/workspace/sesión · Expected: PASS.

**Step 11: Refactor y verificar** — Run: test dirigido con fake timers y `npx tsc --noEmit` · Expected: PASS sin acceso a React/Supabase desde el módulo puro.

### Task 6: Integrar almacenamiento, reloj y sincronización en React

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`

**Files:**
- Create: `src/hooks/useSesionRunner.ts`
- Create: `src/__tests__/hooks/useSesionRunner.test.tsx`

**Step 1: RED de hidratación cliente** — Probar que SSR no toca `window`, que el primer efecto lee la clave scoped y que un payload válido continúa por tiempo real · Expected: FAIL.

**Step 2: GREEN de hidratación** — Implementar el hook sobre el reducer/store puro, obteniendo usuario/workspace/sesión de sus interfaces públicas · Run: `npm test -- --run src/__tests__/hooks/useSesionRunner.test.tsx` · Expected: PASS.

**Step 3: RED/GREEN de tick eficiente** — Probar repintado del restante y transición única al límite sin escribir localStorage cada segundo · Expected: PASS.

**Step 4: RED/GREEN de acciones** — Exponer `view`, `play`, `pause`, `skip`, `previousPreview`, `nextPreview` y comprobar una sola escritura por transición · Expected: PASS.

**Step 5: RED/GREEN de pestañas** — Disparar `StorageEvent`, adoptar revisión ganadora y reflejar activo/vista/restantes sin iniciar un segundo reloj · Expected: PASS.

**Step 6: RED/GREEN de visibilidad y cleanup** — Al volver de background materializar tiempo real; desmontar listeners/intervalos sin perder estado · Expected: PASS.

**Step 7: Verificar** — Run: tests del hook + estado y `npx tsc --noEmit` · Expected: PASS sin actualizaciones después de unmount.

### Task 7: Añadir la ruta y experiencia Ejecutar

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`

**Files:**
- Create: `src/components/sesiones/SesionEjecutarView.tsx`
- Create: `src/components/sesiones/SesionBloqueRecurso.tsx`
- Create: `src/app/(dashboard)/sesiones/[sesionId]/ejecutar/page.tsx`
- Modify: `src/components/sesiones/SesionesListView.tsx`
- Create: `src/__tests__/components/SesionEjecutarView.test.tsx`

**Step 1: RED de acción y ruta** — Probar que `Ejecutar` enlaza a `/sesiones/<id>/ejecutar`, respeta permisos y la página espera `params` de Next.js 16 · Expected: FAIL.

**Step 2: GREEN de navegación** — Añadir el tercer botón entre Editar/Eliminar y la Server Page mínima que pasa `sesionId` a la vista cliente · Expected: PASS.

**Step 3: RED de estados remotos** — Probar carga, error, sesión no encontrada, sin bloques/incompleta y acceso denegado; no montar el runner hasta tener firma válida · Expected: FAIL.

**Step 4: GREEN de estados remotos** — Integrar sesión, bloques y permisos con hooks existentes/nuevo · Expected: PASS.

**Step 5: RED/GREEN de separación visual** — Mostrar lista completa, etiquetas `En curso`/`Preparado`/`Previsualizando`, timer del activo y contenido del visto; cambiar vista no cambia timer · Expected: PASS.

**Step 6: RED/GREEN de controles** — Accionar Play/Pausa, previsualización anterior/siguiente y Saltar; observar que solo Play cambia el activo y ningún cambio autoarranca · Expected: PASS.

**Step 7: RED/GREEN de recurso** — Mostrar metadatos y `Abrir recurso` del visto antes de Play, con apertura segura y sin iframe/autoplay · Expected: PASS.

**Step 8: RED/GREEN de accesibilidad** — Probar nombres, foco, disabled, `role=timer`, región live no ruidosa, orden DOM y reduced motion · Expected: PASS.

**Step 9: Verificar** — Run: `npm test -- --run src/__tests__/components/SesionEjecutarView.test.tsx` y `npx tsc --noEmit` · Expected: PASS.

### Task 8: Ejecutar verificación full y E2E real

**Skills:** `tdd`, `javascript-testing-patterns`, `agent-browser` — ejecución por subagente `testing`

**Files:**
- Create: `e2e/sesiones-ejecucion.spec.ts`
- Modify only if required by existing fixtures: `e2e/support/auth.ts`
- Modify on major/critical findings only: `docs/plans/2026-08-08-sesiones-bloques-ejecucion.md` (`## Incidencias de verificación`)

**Step 1: Preparar identidades sin secretos** — Usar estados autenticados/credenciales de development para admin, gerente_sede, entrenador y jugador según `E2E_TESTING.md`; no commitear `.auth` ni valores de entorno · Expected: los cuatro contextos abren el workspace de prueba.

**Step 2: RED E2E de RBAC** — Añadir casos que esperan acción/editor/ejecución para los tres roles pedidos y denegación para jugador/anónimo · Run: Chromium dirigido · Expected: FAIL antes del wiring completo o si RLS sigue amplia.

**Step 3: GREEN E2E del editor** — Crear una sesión de prueba, añadir bloques con ejercicio repetido y Documento, reordenar, guardar y comprobar suma/orden tras recarga · Expected: PASS.

**Step 4: Cruzar BD↔UI** — Consultar development con la identidad de prueba/Management API y verificar filas, orden, Documento, suma y ausencia de escritura en `sesion_detalle` · Expected: valores idénticos a la UI.

**Step 5: E2E del runner** — Comprobar entrada parada, recurso previo, preview independiente mientras corre, cambio de activo solo con Play, Pausa, Salto, cero→siguiente parado y último completado · Expected: PASS con tolerancia temporal documentada.

**Step 6: E2E de persistencia** — Arrancar, recargar y reabrir contexto conservando localStorage; abrir segunda pestaña, ejecutar una acción y comprobar convergencia sin dos activos · Expected: restante compatible con tiempo real y revisión compartida.

**Step 7: Chromium y Mobile Chrome** — Run: los dos comandos E2E del perfil · Expected: PASS a escritorio y Pixel 5/375×667, sin overflow ni controles inaccesibles.

**Step 8: Verificación estática y suite** — Run: `npm run lint`, `npx tsc --noEmit`, tests dirigidos, `npm test -- --run` y `npm run build` · Expected: todo PASS.

**Step 9: Recorrido con agent-browser** — El subagente `testing` carga `agent-browser skills get core`, abre lista/editor/ejecutor, inspecciona árbol accesible y capturas a escritorio/375×667, incluyendo reduced motion · Expected: jerarquía clara, foco visible, timer activo distinguible del preview y ninguna regresión visual importante.

**Step 10: Remediación** — Si hay fallo `major`/`critical`, registrarlo con ronda/evidencia, enviar a executor fresco y repetir el perfil `full` completo; máximo 5 rondas · Expected: cero fallos abiertos.

### Task 9 (final): Actualizar documentación y trazabilidad

**Skills:** ninguna; es una tarea exclusivamente documental.

**Files:**
- Modify: `docs/plans/2026-08-08-sesiones-bloques-ejecucion.md` (evidencia factual de Task 8 y cierre de Task 9)
- Modify: `docs/backlog.md`
- Modify: `docs/crud-audit.md`
- Modify: `docs/design-guides/frontend_styleguide.md`
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-sesiones-bloques-ejecucion-08-08-2026.md`

**Step 1: Actualizar backlog** — Marcar los ítems B2 realmente cubiertos, reemplazar afirmaciones obsoletas y enlazar TASK-007/este plan; no marcar trabajo no verificado · Expected: un único alcance canónico para detalle/ejecución de Sesiones.

**Step 2: Actualizar auditoría CRUD** — Documentar `sesion_bloques`, RPC, RLS, recurso singular, importación legado, duración derivada y ruta Ejecutar con evidencia verificada · Expected: `docs/crud-audit.md` refleja BD y UI reales.

**Step 3: Registrar la convención local** — Añadir a frontend styleguide el patrón de localStorage versionado/scoped, reloj basado en timestamps, invalidación por firma y sincronización `storage`; no generalizar más allá de lo implementado · Expected: futuros runners siguen el mismo contrato.

**Step 4: Sincronizar la tarea** — Al iniciar `/exec`, pasar TASK-007 a `en_progreso`; al terminar pruebas, marcar checkboxes técnicos. No usar `finalizada` sin confirmación humana, fecha de cierre y rama; este flujo sin git no puede inventarlas · Expected: registro y tarea maestra concuerdan.

**Step 5: Verificar documentación** — Comprobar rutas, enlaces, estados, fecha Europe/Madrid, LF y ausencia de contradicciones; volver a ejecutar `npm run lint` solo si se tocó código durante correcciones · Expected: cierre documental coherente y sin cambios ajenos.

## Orden de ejecución y checkpoints

1. Task 1 — esquema/RLS/RPC y types generados.
2. Task 2 — contratos puros y legado.
3. Task 3 — servicio/hook remoto.
4. Task 4 — editor y duración derivada.
5. Task 5 — reducer/store persistente.
6. Task 6 — hook React y multi-tab.
7. Task 7 — acción, ruta y UI Ejecutar.
8. Task 8 — full verification + E2E/agent-browser.
9. Task 9 — documentación final.

No adelantar UI antes de cerrar el contrato de datos ni aplicar la migración fuera de development. `/exec` usa un executor fresco por tarea y no hace commits en la rama actual.
