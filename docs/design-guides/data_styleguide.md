# Data styleguide — manage-sport-app

Cómo se escribe la **capa de datos**. Léela antes de tocar `src/services/`, `src/types/`,
`src/schemas/` o `supabase/`. Complementa (no repite) `AGENTS.md`.

## Stack

- **Supabase (PostgreSQL)** vía `@supabase/supabase-js`.
- **Zod** para validación (schemas compartidos con los formularios).
- **TypeScript estricto** — tipos de dominio a mano en `src/types/`, tipos de BD generados en
  `src/types/database.types.ts`.

## Estructura de carpetas

```
src/services/[dominio]s.service.ts    CRUD de un dominio (queries Supabase)
src/services/[dominio]-lookup.service.ts   Lecturas ligeras para selects/lookups
src/services/supabase.ts              getSupabaseClient() — cliente único, puede ser null
src/types/[dominio].ts                Tipos de dominio (camelCase)
src/types/database.types.ts           Tipos generados de la BD (snake_case) — no editar a mano
src/schemas/[dominio].schema.ts       Schema Zod + tipos inferidos
src/schemas/index.ts                  Barrel de schemas
supabase/migrations/NNN_*.sql         Migraciones SQL secuenciales
```

## Convenciones de naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Fichero de servicio | `[dominio]s.service.ts` (plural) | `sedes.service.ts` |
| Funciones CRUD | `fetch/create/update/delete` + Entidad | `fetchSedes`, `createSede` |
| Columnas de BD | **snake_case** | `responsable_id`, `workspace_id` |
| Campos de tipos de dominio | **camelCase** | `responsableId`, `workspaceId` |
| Tipos de dominio | PascalCase + sufijos `CreateInput`/`UpdateInput` | `Sede`, `SedeCreateInput` |
| Migraciones | `NNN_descripcion.sql` (secuencial, con cero-padding) | `010_sede_invitations.sql` |

**La BD habla snake_case; el dominio habla camelCase.** El servicio traduce entre ambos.

## Patrón de servicio (obligatorio)

Sigue `sedes.service.ts` al pie de la letra:

```typescript
import { getSupabaseClient } from "@/services/supabase";
import type { Sede, SedeCreateInput } from "@/types/sedes";

const SELECT_FIELDS = "id,nombre,direccion,responsable_id,workspace_id,created_at,updated_at";

// Row snake_case (BD) -> dominio camelCase
function mapSede(row: { id: string; nombre: string; responsable_id: string | null; /* … */ }): Sede {
  return { id: row.id, nombre: row.nombre, responsableId: row.responsable_id /* … */ };
}

export async function fetchSedes() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase.from("sedes").select(SELECT_FIELDS).order("nombre");
  return { data: data ? data.map(mapSede) : null, error };
}
```

Reglas:

- **Siempre** `getSupabaseClient()` primero y **null-guard** que devuelve `{ data: null, error }`.
  Nunca asumas que el cliente existe.
- **`SELECT_FIELDS` explícito** (no `select("*")`) + función `map[Entidad]` que convierte la fila
  snake_case al tipo de dominio camelCase.
- Toda función devuelve `{ data, error }`. El componente/hook decide qué hacer con el error.
- Filtra por `workspace_id` cuando el dominio pertenece a un workspace (multi-tenant).

### Activos técnicos, cuota y RPC

- documentos es editorial y enlaza el recurso técnico por content_asset_id; supabase_storage es el único proveedor facturable.
- Reserva, subida, borrado y ampliación usan RPC tipada: el navegador no calcula cuota, precio, capacidad ni actor.
- La RPC asigna paths inmutables; reserva antes de subir, completa/cancela ante error y genera URL firmada solo al abrir.
- Catálogo y entitlements viven en BD; la solicitud conserva snapshot de capacidad, precio menor y moneda, y se activa manualmente.
- La reconciliación es idempotente y solo se programa tras migración autorizada; hasta entonces se documenta como gate pendiente.
## Schemas (Zod)

- Uno por dominio en `src/schemas/[dominio].schema.ts`, exportado desde `src/schemas/index.ts`.
- Es la fuente de verdad de validación **compartida** con los formularios (`zodResolver`).
- Deriva los tipos de input con `z.infer` cuando aplique, alineados con `CreateInput`/`UpdateInput`.

## Migraciones y drift ⚠️

- Migraciones SQL secuenciales en `supabase/migrations/NNN_*.sql`.
- **NO uses `supabase db push`** en este proyecto: hay **drift** entre las migraciones locales y el
  estado real de la BD remota. Aplicar un push puede fallar o pisar cambios.
- Para aplicar un fix de esquema: hazlo vía **Supabase Management API** y luego marca la migración
  con **`supabase migration repair`** para reconciliar el historial. Nunca toques una BD con datos
  productivos.
- Al crear una migración nueva, respeta la numeración secuencial y describe el cambio en el nombre.

## Supabase CLI local

El proyecto fija `supabase@2.113.0` en `devDependencies`. Un chat nuevo debe usar ese binario local,
sin reinstalarlo ni depender de un CLI global:

```powershell
npx.cmd supabase --version
npx.cmd supabase migration list --linked
npx.cmd supabase migration repair <version> --status applied --linked
npx.cmd supabase gen types typescript --linked
```

Reglas operativas:

- En PowerShell usa `npx.cmd`, no `npx.ps1` (puede quedar bloqueado por la execution policy).
- El CLI escribe estado y telemetría en `C:\Users\juans\.supabase`. Si Codex recibe `EPERM`, debe
  solicitar la ejecución fuera del sandbox; no mover ese directorio al repo.
- Autentica con `npx.cmd supabase login`. El PAT debe permanecer en el almacén nativo del CLI o en
  memoria: nunca se imprime, documenta, commitea ni persiste en `.env`.
- El remoto canónico actual es el project ref `rgmrqkoudyotkpqgezzv`, rama `main`. El Dashboard la
  etiqueta `Production`, pero el propietario confirmó el 08/08/2026 que es la única BD y se usa
  exclusivamente en modo prueba. Verifica siempre el ref exacto antes de cualquier escritura; no
  extrapoles esta clasificación a otro proyecto o rama.
- El login del CLI y los comandos autenticados deben ejecutarse desde un contexto de Windows que
  pueda leer el mismo Credential Manager. Si el sandbox no comparte esa identidad, no copies el PAT
  a archivos: usa una sesión web ya autenticada o detente y registra el gate.
- Una sesión web autenticada puede ejecutar **exactamente** el archivo SQL autorizado en SQL Editor
  cuando el plan incluya autorización de migración. Antes de `Run`, comprueba ref/rama y que el texto
  del editor coincide íntegramente con el archivo local; después verifica tabla, constraints,
  policies, grants y RPC con consultas de solo lectura.
- `migration repair` reconcilia el historial después de aplicar SQL por Management API/SQL Editor.
  La generación de `src/types/database.types.ts` se hace desde el remoto verificado y debe conservar
  UTF-8 y LF. No edites el archivo generado a mano.

---

## Cómo verificar (contrato del `verifier`)

**Comandos por capa:**

```bash
npm run lint          # ESLint
npx tsc --noEmit      # Typecheck (crítico en la capa de datos: tipos BD <-> dominio)
npm test -- --run     # Unit (Vitest)
npm run build         # Build
```

**Acceso a la BD de desarrollo** (para cruzar que el E2E/los servicios traen lo esperado):

- Usa el **Supabase CLI** o la **Management API** con el `.env`/`.env.local` de **desarrollo**.
  Variables `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dev).
- **Nunca producción.** Solo lectura para verificar; ninguna escritura de verificación en remoto.

**Auth de test (E2E):** hay que hacer **un login en dev** para que el E2E entre. Orden:

1. **Reutilizar la sesión de Google** (patrón preferido, nunca se conduce la UI real de Google):
   ```bash
   npm i -g agent-browser && agent-browser install        # solo la 1ª vez
   agent-browser --state ./.auth/state.json --session e2e --restore open http://localhost:3000/login
   #  -> se abre el navegador -> login de Google A MANO -> cierras
   #  -> la sesión queda en .auth/state.json y se reutiliza
   ```
2. Si por Google no se puede → **usuario/contraseña de test** de un login **no-Google** en dev.

**Variables estándar** (crea `.env.test.local`, git-ignored, con valores reales de test; y
`.env.example` con solo los nombres — ver la raíz del repo):

```bash
E2E_BASE_URL=http://localhost:3000
E2E_TEST_USER=test@dev.local
E2E_TEST_PASSWORD=...
E2E_STORAGE_STATE=.auth/state.json   # opcional: sesión ya iniciada (cookies+token)
```

`.env.test.local` y `.auth/` están en `.gitignore`: el storage state contiene tokens vivos.

**E2E:** por defecto **`agent-browser`**; TestSprite solo si el prompt/contrato lo pide.

```bash
npm run test:e2e         # Playwright (Chromium + Mobile Chrome)
```

Si el E2E necesita fixtures de escritura o service_role, pide autorización explícita. Sin ella el gate sigue pendiente aunque los checks locales pasen.