# Documentos multifuente, cuotas y tutoriales — Implementation Plan

**Goal:** Convertir `/documentos` en un módulo con tres pestañas —YouTube, Google Drive y almacenamiento gestionado— que enseñe al club a configurar cada fuente cuando está vacía, muestre el contenido cuando ya existe y permita controlar/ampliar la cuota contratada.

**Architecture:** Se conserva `documentos` como entidad editorial y sus relaciones actuales, y se separa el activo técnico en un catálogo por proveedor. YouTube y Drive siguen siendo almacenamiento propiedad del club; solo los archivos del bucket privado de Supabase consumen cuota de la plataforma. La cuota y sus reservas se calculan de forma transaccional por workspace y la UI consume el dominio mediante servicios y hooks React Query, sin confiar en contadores del navegador.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript estricto, shadcn/ui, Tailwind CSS v4, React Hook Form + Zod, TanStack Query, Supabase PostgreSQL/Auth/Storage, Vitest + Testing Library, Playwright/`agent-browser`, Sentry.

## Perfil de verificación

- Nivel: `full`
- Motivo: modifica persistencia, RLS multi-tenant, políticas de Storage, reservas concurrentes, cuotas comerciales y un flujo crítico de subida/borrado.
- Comandos: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`; `npm run test:e2e -- e2e/documentos-multifuente.spec.ts`; pruebas SQL/RLS indicadas en la Task 3; recorrido visual con `agent-browser` en escritorio y 375×667.
- Evidencias esperadas: separación real entre dos workspaces; reserva concurrente sin sobrepasar la cuota; los tres proveedores se crean, filtran y abren correctamente; estados vacío/con datos/cargando/error verificados; subida bloqueada al 100 % sin bloquear lectura o borrado; precios y porcentaje correctos; build limpio y E2E verde contra development.

## Incidencias de verificación

<!-- Se rellena durante $exec/$auto solo para fallos major/critical. -->

- **Major resuelta · Ronda de remediación 3 · 09/08/2026**
  - **Capa:** autorización SQL, integridad comercial e idempotencia.
  - **Síntoma e impacto:** un gestor podía llamar al `INSERT` de `storage_upgrade_requests` desde PostgREST con precio, capacidad o actor manipulados; tampoco existía una restricción que impidiera dos solicitudes `pending` para el mismo catálogo/workspace bajo carrera.
  - **Causa:** la policy anterior comprobaba el rol y `requested_by`, pero dejaba el snapshot comercial y la deduplicación en el navegador.
  - **Corrección:** migración aditiva `20260809120000_secure_storage_upgrade_requests.sql`: índice único parcial de `pending`, RPC `SECURITY DEFINER` `request_storage_upgrade` con `auth.uid()` y rol gestor verificados en servidor, bloqueo del catálogo activo, snapshot atómico, recuperación de `unique_violation`, `search_path` seguro, revocación de `INSERT` directo y `EXECUTE` solo para `authenticated`. El servicio usa exclusivamente la RPC y los tipos se regeneraron desde el remoto.
  - **Evidencia GREEN y postchecks:** aplicada en development `rgmrqkoudyotkpqgezzv` mediante `npx.cmd supabase db query --linked -f`, reconciliada solo la versión `20260809120000` y confirmada en el historial remoto. `supabase/tests/storage_upgrades.sql` pasó dentro de `BEGIN`/`ROLLBACK`: gestor idempotente y snapshot, precio posterior inmutable, catálogo inactivo/no gestor rechazados, `INSERT` directo denegado, índice parcial presente y fixtures sin residuos. `src/__tests__/services/storage-upgrades.service.test.ts` pasó 5/5 y el lint dirigido terminó sin errores.

- **Major · Ronda de remediación 1 · 09/08/2026**
  - **Capa:** SQL / cuota transaccional.
  - **Síntoma e impacto:** `public.reserve_document_upload` fallaba con SQLSTATE `42702` antes de expirar reservas o calcular la cuota, por una referencia ambigua a `expires_at`; por ello una subida autorizada no podía reservar espacio ni liberar reservas vencidas.
  - **Evidencia RED:** la ejecución remota de `supabase/tests/documentos_storage_quota.sql`, aislada en `BEGIN`/`ROLLBACK`, reprodujo el error `column reference "expires_at" is ambiguous` en el CTE de expiración de la RPC. La limpieza posterior confirmó cero residuos.
  - **Causa:** el `RETURNS TABLE (..., expires_at)` crea un parámetro OUT PL/pgSQL homónimo de la columna sin calificar de `storage_reservations`.
  - **Corrección:** migración aditiva `20260809100000_fix_reserve_document_upload_expires_at.sql` que califica la columna como `public.storage_reservations.expires_at`, sin cambiar firma, semántica ni grants. Se aplicó exclusivamente con `npx.cmd supabase db query --linked -f supabase/migrations/20260809100000_fix_reserve_document_upload_expires_at.sql` y se reconcilió solo `20260809100000` con `npx.cmd supabase migration repair --linked --status applied 20260809100000`.
  - **Evidencia GREEN y postchecks:** la prueba dirigida dentro de `BEGIN`/`ROLLBACK` confirmó rechazo de 60 B sobre una reserva previa de 60 B con límite 100 B y, tras expirar esa reserva, aceptación de una nueva de 20 B con `reserved_bytes = 20`. La definición efectiva contiene la columna cualificada; conserva `SECURITY DEFINER`, `search_path=public, storage, pg_temp`, `EXECUTE` para `authenticated` y denegación para `anon`. El historial remoto contiene `20260809100000 fix_reserve_document_upload_expires_at`; el cleanup de ambos intentos devolvió 0 workspaces, usuarios, documentos, assets y reservas de fixture.
  - **Fallo independiente no corregido (fuera de alcance):** al reejecutar el archivo versionado `supabase/tests/documentos_storage_quota.sql` ya no apareció `expires_at`; se detuvo después con SQLSTATE `42702` en el propio bloque `DO`, por `SELECT reserved_bytes INTO reserved_bytes`. No se modificó la prueba ni se amplió el alcance: este error impide declarar verde la ejecución íntegra del archivo hasta una remediación separada.

- **Major · Ronda de remediación 2 · 09/08/2026**
  - **Capa:** SQL / cuota transaccional.
  - **Síntoma e impacto:** la prueba SQL versionada completa continuó deteniéndose con SQLSTATE `42702` al evaluar `reserved_bytes`, por lo que no pudo completar sus cinco aserciones de cuota.
  - **Evidencia RED y causa delimitada:** el remoto informó `CONTEXT: PL/pgSQL function inline_code_block line 17`; la consulta exacta fue `SELECT reserved_bytes FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id`. Esa referencia corresponde al primer bloque `DO` de `supabase/tests/documentos_storage_quota.sql`, que declara también la variable local `reserved_bytes`; no aparece en `public.reserve_document_upload`, cuyos únicos parámetros OUT son `asset_id`, `storage_path` y `expires_at`.
  - **Corrección aplicada a la RPC:** migración aditiva `20260809110000_fix_reserve_document_upload_out_parameter_ambiguity.sql`. Audita y cualifica todas las lecturas/actualizaciones de columnas en la función que podrían colisionar con parámetros OUT actuales o futuros (`documento.*`, `usage.*`, `reservation.*`, incluido `reservation.expires_at`), sin cambiar firma, semántica, `SECURITY DEFINER`, `search_path` ni grants. Se aplicó exclusivamente con `npx.cmd supabase db query --linked -f supabase/migrations/20260809110000_fix_reserve_document_upload_out_parameter_ambiguity.sql` y se reconcilió solo `20260809110000` con `npx.cmd supabase migration repair --linked --status applied 20260809110000`.
  - **Postchecks y cleanup:** validación estática verde; la definición remota conserva la cualificación de `reservation.expires_at` y `usage.reserved_bytes`, `SECURITY DEFINER`, `search_path=public, storage, pg_temp`, `EXECUTE` solo para `authenticated` y denegación para `anon`. El historial remoto contiene `20260809110000`; tras el test fallido no quedan workspace, usuario, documentos, assets ni reservas de los fixtures. No se modifica el test porque su expectativa funcional es correcta, aunque requiere cualificar su variable/columna local en una tarea separada antes de poder declarar su ejecución completa en verde.

- **Major · Ronda 1 · 08/08/2026**
  - **Capa:** normalización y validación Zod de enlaces externos.
  - **Síntoma:** `https://drive.google.com/` y `https://drive.google.com/open?foo=bar` se clasificaban como `google_drive` sin identificador de recurso.
  - **Impacto:** las nuevas altas podían persistir enlaces de Drive no utilizables, sin URL canónica de un archivo.
  - **Evidencia RED:** `npm.cmd test -- --run src/__tests__/lib/contentAssetLinks.test.ts` falló al esperar `null` para la raíz de Drive y recibir `google_drive` con `fileId: null`.
  - **Causa:** `normalizeGoogleDriveUrl` construía un enlace Drive genérico cuando `extractGoogleDriveFileId` no encontraba un identificador.
  - **Corrección:** el normalizador devuelve `null` sin identificador válido; las rutas `/file/d/:id`, `/open?id=:id` y `/uc?id=:id` continúan normalizándose a `https://drive.google.com/file/d/:id/view`.
  - **Evidencia GREEN:** `npm.cmd test -- --run src/__tests__/lib/contentAssetLinks.test.ts src/__tests__/schemas/content-asset.schema.test.ts` (2 archivos, 12 tests) y `npx.cmd eslint src/lib/contentAssetLinks.ts src/schemas/content-asset.schema.ts src/__tests__/lib/contentAssetLinks.test.ts src/__tests__/schemas/content-asset.schema.test.ts` finalizaron con código 0.

---

## Autorización de migración

- Entorno: `development`
- Estado: **AUTORIZADA**
- Decisión: a 08/08/2026 el usuario autorizó de forma inequívoca aplicar esta migración en Supabase development. Producción queda expresamente fuera de esta ejecución y continúa siendo manual.
- Comando previsto: aplicar `supabase/migrations/20260808180000_documentos_multifuente_cuotas.sql` mediante Supabase Management API y reconciliar después el historial con `supabase migration repair`; **no ejecutar `supabase db push`** por el drift documentado.
- Tablas/recursos: `documentos`, `content_assets`, `workspace_storage_usage`, `storage_reservations`, `workspace_entitlements`, `storage_upgrade_requests`, bucket privado `documentos`, `storage.objects`, funciones RPC y sus policies/grants.
- Operaciones: crear catálogo y tablas de cuota; añadir `documentos.content_asset_id`; backfill de filas existentes; crear constraints, índices, triggers/RPC; reproducir policies del bucket; sembrar catálogo de ampliaciones/entitlements iniciales.
- Riesgos: bloqueo breve durante backfill/índices, clasificación imperfecta de enlaces heredados, doble contabilización, objetos huérfanos, grants o RLS demasiado amplios y divergencia entre bytes registrados y `storage.objects`.
- Rollback/recuperación: copia lógica de filas afectadas; despliegue aditivo con `content_asset_id` nullable; no eliminar columnas actuales; desactivar nuevos writes, restaurar servicios antiguos, eliminar solo funciones/policies nuevas y conservar tablas de auditoría hasta reconciliar. Producción es una operación manual posterior con backup y ventana de despliegue.
- Gate: ningún `$exec*` puede aplicar esta migración mientras el estado siga `PENDIENTE`.

### Evidencia de ejecución · Task 2 · 08/08/2026

- Entorno: development (`rgmrqkoudyotkpqgezzv`). Producción no tocada.
- Inventario previo (solo lectura): `documentos` tiene las columnas heredadas esperadas; existen 4 documentos `file` con workspace y path, sin paths duplicados, y 2 workspaces. El bucket `documentos` ya es privado, pero sus cuatro policies de `storage.objects` conceden lectura/escritura/borrado a cualquier usuario autenticado. Las policies de `documentos` son `documentos_select` y `documentos_mutate`; el helper efectivo disponible es `public.current_user_ws_role(uuid)`.
- Método previsto: Management API de Supabase con Bearer leído solo en memoria desde Windows Credential Manager; comando de aplicación y cualquier token se mantienen redactados. No se ejecutó `supabase db push` ni `APPLY_NOW.sql`.
- Resultado: la aplicación de `20260808180000_documentos_multifuente_cuotas.sql` fue bloqueada antes de enviarse por la elevación del entorno, que requiere una confirmación visible del usuario para cambios persistentes de esquema, datos, RLS, Storage y permisos. No hubo cambios remotos.
- Postchecks: no ejecutados porque la migración no se aplicó. Pendientes al reanudar: regenerar `database.types.ts`, reparar solo versión `20260808180000`, comprobar historial/tablas/policies/grants/RPCs/seeds/backfill.
- Reanudación: 08/08/2026 Europe/Madrid. La validación estática local confirmó LF, transacción `BEGIN`/`COMMIT`, delimitadores PL/pgSQL balanceados, seis tablas nuevas con RLS, cuatro policies específicas para `storage.objects` y ausencia de `APPLY_NOW.sql` o DDL destructivo sobre `documentos`. La elevación para leer el PAT en Windows Credential Manager y enviar el SQL literal al único endpoint Management API autorizado fue denegada por el control de seguridad antes de ejecutarse. No se leyó ni expuso ningún PAT, no hubo llamada HTTP ni cambio remoto, y no se ejecutaron `migration repair`, regeneración de `database.types.ts` ni `db push`. Para reanudar hace falta una aprobación de elevación aceptada por el entorno; entonces aplicar el contenido exacto, postcomprobar y reconciliar únicamente `20260808180000`.

### Evidencia de postchecks · Task 2 · 09/08/2026

- Entorno remoto confirmado: `rgmrqkoudyotkpqgezzv` (único proyecto vinculado). `supabase migration list --linked` no pudo abrir el pooler por `LegacyDbConnectError`/`28P01`, pero la consulta de solo lectura a `supabase_migrations.schema_migrations` confirmó el historial aplicado: `20260808180000 documentos_multifuente_cuotas` y la posterior `20260808190000 clonar_sede`.
- Esquema comparado con la migración local: están las seis tablas (`content_assets`, `workspace_storage_usage`, `storage_reservations`, `workspace_entitlements`, `storage_upgrade_catalog`, `storage_upgrade_requests`), `documentos.content_asset_id`, sus columnas, checks, FKs, índices parciales y de búsqueda, cuatro triggers y RLS habilitado en las seis tablas. Las policies de `public` y las cuatro `documentos_workspace_*` de `storage.objects` coinciden con el SQL; el bucket `documentos` continúa privado.
- Permisos/RPC: los grants de tablas para `authenticated` y los `EXECUTE` de las ocho RPC públicas coinciden; `anon` no tiene `EXECUTE` sobre ninguna de las funciones comprobadas. Catálogo: cinco ampliaciones activas `extra_10_gib` a `extra_250_gib`, con importes y capacidades de la migración.
- Backfills: 2 workspaces, 2 filas de uso y 2 entitlements `base_storage_10_gib` de 10 GiB; 4 documentos con workspace enlazados a 4 `content_assets` `supabase_storage/ready` (1.465.722 bytes), sin documento huérfano ni cruce de workspace. La conciliación de `used_bytes`/`reserved_bytes` devolvió 0 discrepancias.
- Tipos regenerados mecánicamente desde el remoto con `npx.cmd supabase gen types --linked --lang typescript`: `src/types/database.types.ts`, UTF-8 sin BOM y LF (74.160 bytes). La superficie incluye las seis tablas y las RPC de cuota/documentos.
- Decisión: esquema, datos e historial son concluyentemente consistentes. No se reaplicó SQL, no se ejecutó `migration repair` y no se usó `supabase db push`; se conserva el drift histórico documentado.

## 1. Estudio y decisiones cerradas

### Situación actual

- `src/app/(dashboard)/documentos/page.tsx` renderiza `DocumentosListView`.
- `DocumentoForm.tsx` solo distingue **Archivo** y **Enlace**. `documentos.service.ts` sube al bucket `documentos`, persiste metadatos y abre archivos con URL firmada de una hora.
- `documentoLinks.ts` detecta YouTube/Vimeo, mientras Drive se guarda como URL genérica. `driveAdapter.ts` es un stub y no debe presentarse como integración funcional.
- No existen cuota por workspace, reserva atómica, indicador de uso, catálogo de ampliaciones ni pago. Tampoco hay una migración local fiable que reproduzca las policies reales de `storage.objects` para `documentos`.
- El listado no está paginado; los tests actuales cubren parcialmente el formulario y solo abren el CRUD en E2E.

### Tres fuentes y responsabilidad

| Pestaña | Propietario del almacenamiento | Consume cuota de la app | Alta V1 | Apertura/preview |
|---|---|---:|---|---|
| YouTube | Club/YouTube | 0 B | URL canónica `youtube.com`/`youtu.be` | `youtube-nocookie.com/embed/{id}` si el propietario permite embed |
| Google Drive | Club/Google | 0 B | enlace Drive validado; sin OAuth ni upload V1 | abrir/preview de Google respetando su ACL |
| Almacenamiento | Plataforma/Supabase | bytes reales + reservas | subida a bucket privado | URL firmada de 5–15 min tras autorización |

Decisiones no negociables:

1. **YouTube “no listado” no es privado.** Cualquiera con el enlace puede reenviarlo. Un vídeo privado o con embed desactivado puede no reproducirse dentro de la app; la UI debe ofrecer “Abrir en YouTube” y explicar el motivo. Fuente: [visibilidad de vídeos](https://support.google.com/youtube/answer/157177) e [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).
2. **Drive no se proxifica para saltar permisos.** El usuario que abre el recurso debe cumplir la ACL del club. V1 valida y normaliza enlaces; OAuth/Picker, webhooks y Shared Drives quedan como fase futura. Fuente: [permisos de Google Drive](https://developers.google.com/workspace/drive/api/guides/manage-sharing).
3. **Solo Supabase se factura por espacio.** Los externos muestran “Almacenado en YouTube/Google Drive · no consume espacio de tu plan”.
4. **No se borra ni oculta contenido heredado.** Los enlaces que no puedan clasificarse se muestran en un bloque “Enlaces anteriores” solo si existen; no se ofrece como cuarta vía de alta.
5. **Superar cuota bloquea nuevas subidas, nunca lectura ni borrado.** El club debe poder liberar espacio.

### Estados UX por pestaña

Cada pestaña implementa exactamente estos estados:

- `loading`: skeleton con altura estable y pestañas operables.
- `error`: mensaje específico, reintento y evento Sentry sin exponer URL/token.
- `empty-setup`: solo cuando el workspace jamás ha configurado esa fuente; muestra tutorial de tres pasos y CTA al primer alta.
- `empty-filtered`: existe contenido en el workspace pero el filtro/sede actual no devuelve filas; limpia filtros, no repite onboarding.
- `data`: contador, filtros, listado paginado, metadatos, estado del proveedor, preview/apertura y acciones permitidas por rol. El tutorial queda accesible en “Cómo funciona”, sin ocupar el contenido principal.

Los gestores ven tutoriales y CTA de creación. Un entrenador sin permiso de escritura ve el contenido permitido o “Aún no hay contenido disponible; contacta con un gestor”, nunca un CTA que no puede completar.

### Tutoriales y copy mínimo

- **YouTube:** “1. Crea o usa el canal del club. 2. Sube el vídeo y selecciona No listado solo si no contiene información sensible; comprueba que permite inserción. 3. Copia el enlace y pégalo aquí.” Añadir aviso: “No listado no significa privado”.
- **Drive:** “1. Sube el archivo al Drive del club. 2. Comparte con las personas o grupo correctos; evita Publicar en la Web para contenido interno. 3. Copia el enlace de Drive y pégalo aquí.” Añadir aviso de inicio de sesión/permisos.
- **Almacenamiento:** “1. Revisa espacio disponible y formatos permitidos. 2. Elige archivo, visibilidad y relaciones. 3. Sube; el archivo quedará privado y contará en tu cuota.” Mostrar tamaño máximo antes de elegir archivo.

## 2. Estudio económico y catálogo inicial

Supabase Pro/Team incluye actualmente 100 GB de Storage por organización; el exceso cuesta **$0.0213/GB-mes**. Tras la cuota de egress, el exceso cuesta **$0.09/GB origin** y **$0.03/GB cached**. Son referencias variables y deben guardarse como parámetros administrativos, no en JSX: [Storage pricing](https://supabase.com/docs/guides/storage/pricing) y [egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

Modelo conservador por workspace y mes:

```text
coste_bruto = gb_mes × 0,0213 USD
            + egress_origin_gb × 0,09 USD
            + egress_cached_gb × 0,03 USD
            + soporte + pasarela + margen_de_cambio
```

Con 1 GB de descarga origin por cada GB almacenado, el coste marginal aproximado es `$0.1113/GB-mes` antes de soporte. Cobrar `0,25 €/GB-mes` deja alrededor del 55 % de margen bruto usando paridad euro/dólar solo como aproximación; la app no debe presentar esa paridad como garantía.

Catálogo inicial recomendado:

| Ampliación | Precio mensual | Precio efectivo/GB | Uso previsto |
|---:|---:|---:|---|
| 10 GB incluidos | incluido en plan de pago | absorbido por plan base | documentos privados iniciales |
| +10 GB | 3 € | 0,30 € | club pequeño |
| +25 GB | 7 € | 0,28 € | uso documental habitual |
| +50 GB | 13 € | 0,26 € | imágenes y vídeos puntuales |
| +100 GB | 24 € | 0,24 € | archivo audiovisual medio |
| +250 GB | 55 € | 0,22 € | uso intensivo sujeto a revisión |

Reglas comerciales V1:

- La cuota se calcula por `workspace`, no por sede.
- Los GB son binarios en UI (`1 GB = 1.073.741.824 bytes`) y los bytes son la unidad persistida.
- Fair use inicial: transferencia mensual razonable de hasta 1× el espacio contratado; como las signed URLs actuales no atribuyen egress fiable por workspace, no se cobra automáticamente transferencia en V1.
- La futura bolsa de transferencia parte de `0,15 €/GB`, solo cuando exista telemetría verificable.
- “Solicitar ampliación” crea una solicitud auditable y deja el entitlement pendiente de activación manual. Stripe Checkout/webhook es una fase separada hasta decidir cuenta, impuestos, facturación y cancelaciones; no fingir cobro automático.
- El precio, GB, orden, moneda y estado activo viven en datos configurables. Los workspaces mantienen la tarifa aceptada; un cambio de catálogo no modifica retroactivamente un entitlement.

## 3. Contratos e invariantes

### Modelo lógico

- `documentos.content_asset_id uuid null`: enlace editorial al activo; se mantienen `source_type`, `external_url`, `storage_*` durante la transición/rollback.
- `content_assets`: `id`, `workspace_id`, `provider`, `status`, `original_url`, `external_resource_id`, `embed_url`, `storage_path`, `size_bytes`, `mime_type`, `checksum`, `created_by`, timestamps. `CHECK` por proveedor impide combinaciones incoherentes.
- `workspace_storage_usage`: una fila por workspace con `used_bytes`, `reserved_bytes`, `limit_bytes`, `updated_at`, `version`.
- `storage_reservations`: reserva previa con `asset_id`, bytes, estado y expiración; índice único evita dos reservas activas para el mismo activo.
- `workspace_entitlements`: plan/capacidad vigente, vigencia y origen manual/futuro billing.
- `storage_upgrade_requests`: ampliación solicitada, precio/capacidad congelados, estado `pending|approved|rejected|cancelled` y actor/fechas.

Estados:

```text
external: pending_validation -> ready | unavailable | rejected -> deleted
storage:  reserved -> uploading -> processing -> ready | failed -> deleting -> deleted
usage:    ok (<80%) | warning (>=80% y <100%) | limited (>=100%)
```

Invariantes:

- `used_bytes` solo suma activos `supabase_storage/ready`; `reserved_bytes` solo reservas activas no vencidas.
- `used_bytes + reserved_bytes + requested_bytes <= limit_bytes` se comprueba y actualiza bajo lock de la fila del workspace.
- Los paths son inmutables: `<workspace_id>/<asset_id>/<uuid-sin-nombre-usuario>`.
- El workspace se deriva de membresía/autorización, nunca se confía únicamente en el ID enviado por el cliente.
- Ninguna respuesta persiste signed URLs; se generan al abrir y expiran en 5–15 minutos.
- Borrar es idempotente. Un fallo físico deja `deleting` y una tarea reintenta; no se elimina primero la evidencia necesaria para reconciliar.
- Los normalizadores aceptan solo HTTPS y hosts exactos/variantes conocidas; nunca HTML/iframe del usuario ni coincidencia por sufijo insegura.

### Contratos de dominio

```ts
type ContentProvider = "youtube" | "google_drive" | "supabase_storage" | "external_legacy";
type ContentAssetStatus =
  | "pending_validation" | "reserved" | "uploading" | "processing"
  | "ready" | "unavailable" | "rejected" | "failed" | "deleting" | "deleted";

type StorageUsage = {
  usedBytes: number;
  reservedBytes: number;
  limitBytes: number;
  percent: number; // clamp visual 0..100; conservar valor real aparte si hay drift
  state: "ok" | "warning" | "limited";
};
```

RPCs sensibles propuestas:

- `reserve_document_upload(p_documento_id, p_size_bytes, p_mime_type)` → `{ asset_id, storage_path, expires_at }` o `QUOTA_EXCEEDED`.
- `complete_document_upload(p_asset_id)` → verifica `storage.objects`, convierte reserva a uso y devuelve activo.
- `cancel_document_upload(p_asset_id)` → libera reserva de forma idempotente.
- `mark_document_asset_deleting(p_asset_id)` / `complete_document_asset_delete(p_asset_id)` → decremento transaccional solo al confirmar borrado físico.
- `get_workspace_storage_usage()` → solo el workspace activo/autorizado; no acepta suplantación de tenant.

## 4. Plan de implementación

### Task 1: Fijar contratos y normalizadores multifuente

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`.

**Files:**
- Create: `src/types/content-assets.ts`
- Create: `src/schemas/content-asset.schema.ts`
- Create: `src/lib/contentAssetLinks.ts`
- Modify: `src/schemas/index.ts`
- Test: `src/__tests__/lib/contentAssetLinks.test.ts`
- Test: `src/__tests__/schemas/content-asset.schema.test.ts`

**Steps:**
1. Escribir tests fallidos para URLs YouTube largas/cortas/shorts, Drive válidas, HTTP, hosts engañosos, iframe/HTML y URLs genéricas heredadas.
2. Ejecutar `npx vitest run src/__tests__/lib/contentAssetLinks.test.ts src/__tests__/schemas/content-asset.schema.test.ts --reporter=dot`; esperado: FAIL.
3. Implementar tipos, discriminated unions y normalización canónica. Generar embed YouTube en `youtube-nocookie.com`; para Drive persistir `fileId` si puede extraerse y conservar la URL canónica.
4. Ejecutar el comando dirigido; esperado: PASS.

### Task 2: Diseñar migración aditiva, backfill y RLS

**Skills:** `tdd`, `sql-optimization-patterns`.

**Files:**
- Create: `supabase/migrations/20260808180000_documentos_multifuente_cuotas.sql`
- Modify: `src/types/database.types.ts` mediante regeneración, nunca edición manual

**Steps:**
1. Inventariar en development las policies reales de `documentos` y `storage.objects` y adjuntar el resultado a la evidencia de ejecución. No escribir si el gate sigue pendiente.
2. Escribir SQL aditivo para tablas, constraints, índices, foreign keys y RLS. Reutilizar el helper de membresía/rol efectivo ya presente en las migraciones del proyecto.
3. Crear bucket/policies privadas reproducibles para path por workspace y roles de lectura/escritura; evitar `FOR ALL USING (true)`.
4. Backfill: archivos → `supabase_storage`; YouTube/Drive detectables → proveedor correspondiente; resto → `external_legacy`. Conservar columnas antiguas.
5. Sembrar entitlement de 10 GB y catálogo de ampliaciones de forma idempotente.
6. Aplicar solo con autorización mediante Management API, regenerar tipos y ejecutar `supabase migration repair`; esperado: historial reconciliado sin `db push`.

### Task 3: Probar aislamiento, grants y concurrencia en PostgreSQL

**Skills:** `tdd`, `sql-optimization-patterns`.

**Files:**
- Create: `supabase/tests/documentos_multifuente_rls.sql`
- Create: `supabase/tests/documentos_storage_quota.sql`

**Steps:**
1. Escribir pruebas fallidas con dos workspaces, gestor, entrenador y usuario ajeno.
2. Cubrir SELECT/INSERT/UPDATE/DELETE cruzados, path manipulado, acceso a usage/entitlements, rol de solo lectura y grants directos.
3. Simular dos reservas concurrentes cuyo total supera el límite y comprobar que solo una se confirma.
4. Cubrir expiración/cancelación, complete idempotente, rollback si no existe objeto y decremento único al borrar.
5. Ejecutar `supabase test db`; esperado: PASS. Si el drift impide arrancar local, ejecutar las mismas assertions dentro de transacción aislada en development y registrar rollback/evidencia, sin tocar producción.

### Task 4: Implementar servicios de catálogo y paginación

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`.

**Files:**
- Create: `src/services/content-assets.service.ts`
- Create: `src/hooks/useContentAssets.ts`
- Modify: `src/services/documentos.service.ts`
- Modify: `src/hooks/useDocumentos.ts`
- Modify: `src/hooks/queryKeys.ts`
- Test: `src/__tests__/services/content-assets.service.test.ts`
- Test: `src/__tests__/hooks/useContentAssets.test.tsx`

**Steps:**
1. Escribir tests fallidos para filtrado por proveedor/workspace/sede, `.range()` y metadato `hasProviderDataInWorkspace` independiente del filtro actual.
2. Ejecutar tests dirigidos; esperado: FAIL.
3. Implementar mappers snake_case→camelCase, `SELECT_FIELDS` explícito, null-guard de Supabase, `{ data, error }`, paginación y query keys por workspace/proveedor/filtro.
4. Mantener adaptador de lectura para filas heredadas durante la transición.
5. Ejecutar tests; esperado: PASS.

### Task 5: Hacer atómica la subida, finalización y eliminación

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`.

**Files:**
- Create: `src/services/document-storage.service.ts`
- Modify: `src/services/documentos.service.ts`
- Test: `src/__tests__/services/document-storage.service.test.ts`

**Steps:**
1. Escribir tests fallidos para reservar→subir→completar, cuota insuficiente, upload fallido/cancelado, reintento y borrado físico fallido.
2. Validar tamaño máximo y allowlist MIME antes de reservar; volver a validar metadatos contra `storage.objects` al completar.
3. Implementar path inmutable, expiración de reserva y URL de apertura de 5–15 min.
4. Cambiar borrado a estado/outbox reintentable para no dejar objetos huérfanos ni descontar dos veces.
5. Ejecutar tests dirigidos; esperado: PASS.

### Task 6: Crear enlaces YouTube y Drive seguros

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`.

**Files:**
- Modify: `src/services/content-assets.service.ts`
- Modify: `src/schemas/documento.schema.ts`
- Test: `src/__tests__/services/content-assets.external.test.ts`

**Steps:**
1. Escribir tests fallidos para creación, duplicado, proveedor incorrecto, host no permitido, pérdida de acceso y embed no disponible.
2. Persistir solo URL/ID normalizados; no aceptar HTML de inserción.
3. Marcar enlaces `pending_validation`, `ready` o `unavailable` sin eliminar la fila editorial.
4. Mantener Vimeo/genéricos preexistentes como `external_legacy`, sin nueva alta.
5. Ejecutar tests; esperado: PASS.

### Task 7: Calcular uso, estado y catálogo comercial

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`.

**Files:**
- Create: `src/services/storage-usage.service.ts`
- Create: `src/hooks/useStorageUsage.ts`
- Create: `src/lib/storagePricing.ts`
- Test: `src/__tests__/lib/storagePricing.test.ts`
- Test: `src/__tests__/services/storage-usage.service.test.ts`

**Steps:**
1. Escribir tests fallidos para bytes→GB, 79,99/80/99,99/100/overage, reserva, límite cero, números grandes y catálogo inactivo.
2. Implementar cálculo con enteros en bytes; `percent` visual acotado y porcentaje real conservado para diagnóstico.
3. Leer catálogo/entitlement desde Supabase y exponer 10 GB incluidos + ampliaciones, sin precios hardcodeados en componentes.
4. Incluir función administrativa de coste/margen para documentación interna, no para promesas al cliente.
5. Ejecutar tests; esperado: PASS.

### Task 8: Implementar solicitud auditable de ampliación

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`.

**Files:**
- Create: `src/services/storage-upgrades.service.ts`
- Create: `src/hooks/useStorageUpgrades.ts`
- Create: `src/schemas/storage-upgrade.schema.ts`
- Test: `src/__tests__/services/storage-upgrades.service.test.ts`

**Steps:**
1. Escribir tests fallidos para snapshot de precio/GB, solicitud duplicada, catálogo inactivo, usuario no gestor y cambio posterior de precio.
2. Crear solicitud `pending` idempotente y auditable; no aumentar cuota desde el navegador.
3. Notificar por el mecanismo existente (Resend/Sentry si procede) sin convertir el envío de email en fuente de verdad.
4. Mostrar claramente “Solicitud enviada; la ampliación se activa tras confirmación”, sin simular checkout.
5. Ejecutar tests; esperado: PASS.

### Task 9: Construir shell de tres pestañas y estados vacíos contextuales

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`, `vercel-react-best-practices`.

**Files:**
- Create: `src/components/documentos/DocumentosProviderTabs.tsx`
- Create: `src/components/documentos/DocumentoProviderEmptyState.tsx`
- Create: `src/components/documentos/DocumentoProviderGuide.tsx`
- Test: `src/__tests__/components/DocumentosProviderTabs.test.tsx`
- Test: `src/__tests__/components/DocumentoProviderEmptyState.test.tsx`

**Steps:**
1. Escribir tests fallidos para las tres pestañas, selección por teclado, contadores y estados `loading/error/empty-setup/empty-filtered/data`.
2. Verificar copy tutorial exacto, aviso YouTube, permisos Drive y cuota Supabase.
3. Implementar Tabs shadcn con URL/query opcional para preservar pestaña, sin duplicar server state local.
4. Mostrar CTA solo si el rol puede escribir; mantener “Cómo funciona” disponible cuando hay datos.
5. Ejecutar tests; esperado: PASS.

### Task 10: Mostrar listados, metadatos y previews por proveedor

**Skills:** `tdd`, `javascript-testing-patterns`, `vercel-react-best-practices`.

**Files:**
- Create: `src/components/documentos/DocumentoProviderList.tsx`
- Create: `src/components/documentos/DocumentoPreviewDialog.tsx`
- Modify: `src/components/documentos/DocumentosListView.tsx`
- Test: `src/__tests__/components/DocumentoProviderList.test.tsx`
- Test: `src/__tests__/components/DocumentoPreviewDialog.test.tsx`

**Steps:**
1. Escribir tests fallidos para datos, paginación, badges de proveedor/estado, asociaciones, visibilidad y acciones por rol.
2. Renderizar YouTube con URL generada, `title`, lazy loading, referrer policy y sandbox/allow mínimo compatible; fallback “Abrir en YouTube”.
3. Para Drive, mostrar metadatos y abrir respetando ACL; tratar login/permisos/revocación como estado accionable.
4. Para Supabase, pedir signed URL solo al abrir; no dejarla en caché más allá de su expiración.
5. Añadir bloque “Enlaces anteriores” solo cuando exista legacy.
6. Ejecutar tests; esperado: PASS.

### Task 11: Crear medidor de cuota y selector de ampliación

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Files:**
- Create: `src/components/documentos/StorageUsageCard.tsx`
- Create: `src/components/documentos/StorageUpgradeDialog.tsx`
- Test: `src/__tests__/components/StorageUsageCard.test.tsx`
- Test: `src/__tests__/components/StorageUpgradeDialog.test.tsx`

**Steps:**
1. Escribir tests fallidos para “usado + reservado / contratado”, GB formateados, 80 %, 100 %, overage y error de carga.
2. Mostrar el medidor únicamente como cuota facturable en la pestaña Almacenamiento; YouTube/Drive muestran mensaje de proveedor externo.
3. Deshabilitar “Subir archivo” en `limited`, mantener abrir/borrar y ofrecer ampliación.
4. Listar planes activos con precio mensual y capacidad; confirmar solicitud y actualizar query keys.
5. Verificar focus trap, labels, lectura por screen reader y móvil.

### Task 12: Unificar formularios de alta sin ocultar el contenido existente

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Files:**
- Modify: `src/components/documentos/DocumentoForm.tsx`
- Modify: `src/components/documentos/DocumentosListView.tsx`
- Test: `src/__tests__/components/DocumentoForm.test.tsx`
- Test: `src/__tests__/components/DocumentosListView.test.tsx`

**Steps:**
1. Escribir tests fallidos para alta desde CTA de cada pestaña, validaciones específicas y retorno a la pestaña correcta.
2. Separar visualmente los tres flujos sin duplicar campos editoriales (nombre, visibilidad, sede/relaciones).
3. Si hay datos, renderizarlos inmediatamente; no sustituirlos por el tutorial. Si no hay, presentar tutorial + CTA.
4. Mostrar progreso de subida, cancelación y errores de cuota/proveedor en español.
5. Ejecutar tests dirigidos; esperado: PASS.

### Task 13: Reconciliación, expiración y observabilidad

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`.

**Files:**
- Create: `supabase/functions/reconcile-document-assets/index.ts`
- Create: `src/lib/documentAssetTelemetry.ts`
- Test: `src/__tests__/lib/documentAssetTelemetry.test.ts`

**Steps:**
1. Escribir tests para reservas vencidas, objeto huérfano, bytes divergentes, asset `deleting` y ejecución repetida.
2. Implementar reconciliación idempotente: liberar reservas, reintentar borrado, comparar Storage y registrar ajustes; nunca bajar cuota basándose solo en cliente.
3. Programar el job únicamente en development durante ejecución autorizada; documentar frecuencia horaria/diaria y límites.
4. Emitir breadcrumbs/eventos Sentry con workspace/asset opacos, proveedor, estado y error; no registrar URLs firmadas, nombres sensibles ni tokens.
5. Añadir panel/consulta operativa para solicitudes pendientes y drift de bytes.

### Task 14: Verificar Next.js 16, seguridad web y CSP

**Skills:** `tdd`, `javascript-testing-patterns`, `vercel-react-best-practices`.

**Files:**
- Read before changes: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Read before changes: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- Modify only if required: configuración CSP actual del proyecto
- Test: `src/__tests__/security/document-embeds.test.tsx`

**Steps:**
1. Confirmar la frontera cliente/servidor de Next.js 16 antes de añadir Route Handlers; preferir RPC + sesión Supabase existente si satisface auth/RLS.
2. Escribir tests para `frame-src` allowlisted, URL maliciosa, sandbox/referrer policy y ausencia de secret/service-role en bundle cliente.
3. Permitir solo orígenes exactos necesarios de YouTube/Drive; no usar `*` ni `dangerouslySetInnerHTML`.
4. Ejecutar tests, `npx tsc --noEmit` y `npm run build`; esperado: PASS.

### Task 15: E2E real de las tres pestañas y cuotas

**Skills:** `tdd`, `javascript-testing-patterns`; verificación por agente `testing` con `agent-browser`.

**Files:**
- Create: `e2e/documentos-multifuente.spec.ts`
- Create: `e2e/fixtures/documentos.ts`
- Modify if needed: `e2e/support/` para auth/fixtures reutilizables

**Steps:**
1. Preparar dos workspaces de development y datos desechables identificables; nunca usar producción.
2. Escribir E2E para empty tutorial de cada pestaña, alta de YouTube/Drive, subida Supabase y posterior estado `data`.
3. Cubrir embed/fallback, enlace Drive sin permiso, filtros sin resultado, paginación y legacy.
4. Cubrir medidor al 79/80/100 %, bloqueo de subida, lectura/borrado todavía disponible y solicitud de ampliación.
5. Probar rol gestor/entrenador y denegación cruzada entre workspaces.
6. Ejecutar `npm run test:e2e -- e2e/documentos-multifuente.spec.ts` en Chromium y Mobile Chrome; repetir recorrido con `agent-browser` a 1440×900 y 375×667 y guardar screenshots.
7. El plugin Google Drive es opcional para crear/inspeccionar un fixture real si el usuario decide conectarlo durante `$exec`; V1 puede verificarse con un enlace aportado por el usuario. No hay plugin YouTube requerido: iframe y URL se validan en navegador.

### Task 16: Verificación full y remediación

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`, `vercel-react-best-practices`.

**Files:**
- Modify only on major/critical failures: sección `## Incidencias de verificación` de este plan

**Steps:**
1. Ejecutar `npm run lint`; esperado: 0 errores.
2. Ejecutar `npx tsc --noEmit`; esperado: 0 errores.
3. Ejecutar `npm test -- --run`; esperado: suite completa verde.
4. Ejecutar pruebas SQL/RLS de Task 3; esperado: aislamiento y concurrencia verdes.
5. Ejecutar `npm run build`; esperado: build Next.js 16 verde.
6. Ejecutar E2E completo y cruzar BD↔servicio↔UI para bytes, proveedor, workspace y entitlement.
7. Remediar con executor fresco y repetir el perfil completo, máximo cinco rondas; registrar solo incidencias major/critical o minor repetidas.

### Task 17 (final): Actualizar documentación

**Skills:** `clean-code` solo para consistencia documental; sin código de producción.

**Files:**
- Modify: `docs/backlog.md`
- Modify: `docs/crud-audit.md`
- Create: `docs/adr/ADR-documentos-multifuente-y-cuotas.md` si el directorio/convenio ADR vigente lo permite; en caso contrario registrar la decisión en la ubicación de arquitectura existente
- Modify if conventions change: `docs/design-guides/frontend_styleguide.md`
- Modify if conventions change: `docs/design-guides/data_styleguide.md`
- Modify if commercial copy is exposed: `src/components/landing/PricingSection.tsx` y su test, como tarea separada dentro de la ejecución

**Steps:**
1. Marcar B1-2 Documentos y los ítems de Drive/Documentos realmente terminados; no cerrar OAuth Drive si V1 solo enlaza URLs.
2. Actualizar la matriz CRUD con proveedores, cuota, paginación, pruebas y limitación conocida de Drive V1.
3. Registrar por qué `documentos` permanece editorial, por qué solo Supabase consume cuota y cómo se versionan precios/entitlements.
4. Documentar RPC/reservas, paths Storage, reconciliación, nuevas convenciones UI y procedimiento manual de producción.
5. Ejecutar `git diff --check`; esperado: sin whitespace errors y LF conservado.

## Estado de ejecución al 09/08/2026

- Lint (0 errores), TypeScript, 555 tests unitarios y build pasan.
- La migración 20260809170000_schedule_document_asset_reconciliation.sql no se ha aplicado: el cron requiere aprobación explícita.
- El E2E de Documentos necesita autorización para fixtures de escritura en development y service_role; no se declara verde ni se cierra el flujo hasta completar ambos gates.
- Esta ejecución sustituye git diff --check por inspección de whitespace/LF de los archivos tocados, sin usar Git.
## 5. Criterios de aceptación finales

1. `/documentos` presenta exactamente tres pestañas primarias: YouTube, Google Drive y Almacenamiento.
2. Una fuente nunca configurada muestra su tutorial y CTA correcto; una fuente con datos muestra primero su información y deja la guía como ayuda secundaria.
3. “Sin resultados por filtros” no se confunde con “aún no configurado”.
4. YouTube y Drive no consumen cuota y explican propiedad/permisos; Supabase muestra bytes usados, reservados, límite, porcentaje y estado.
5. Al 80 % hay aviso; al 100 % no se puede iniciar otra subida, pero sí abrir y borrar.
6. Un gestor puede solicitar una ampliación con precio/GB congelados; la UI no afirma que está cobrada hasta activación manual.
7. Los enlaces se normalizan y los embeds no aceptan HTML/arbitrary hosts; las URLs firmadas son privadas y cortas.
8. Dos subidas concurrentes no superan la cuota y dos workspaces no pueden leer ni mutar activos/uso ajenos.
9. Los documentos y enlaces existentes siguen visibles, incluidos los heredados no clasificables.
10. Desktop y móvil cumplen navegación por teclado, foco, labels y mensajes en español.
11. Lint, typecheck, unit/integration, SQL/RLS, build y E2E están verdes con evidencia.
12. Backlog, auditoría CRUD y documentación de arquitectura quedan sincronizados.

## 6. Fuera de alcance de V1, pero preparado

- OAuth/Google Picker, subida/borrado dentro de Drive, Shared Drives y webhooks `changes.watch`.
- Subida automática al canal YouTube mediante Data API.
- Stripe Checkout/webhooks, facturas e impuestos; requiere decisión comercial y credenciales propias.
- Cobro automático de egress por workspace; requiere proxy/telemetría fiable y análisis de coste/rendimiento.
- DRM o garantía de privacidad sobre YouTube no listado.

## 7. Siguiente gate antes de ejecutar

Antes de `$exec`, el usuario debe responder de forma inequívoca si autoriza la migración en **Supabase development**. Si la autoriza, actualizar únicamente el bloque `## Autorización de migración` a `AUTORIZADA`, conservar la fecha/texto de aprobación y ejecutar el flujo Management API + `migration repair`. Producción seguirá siendo manual.
