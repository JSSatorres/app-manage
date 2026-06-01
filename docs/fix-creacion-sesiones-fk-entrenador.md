# Fix: error 23503 al crear sesiones (`sesiones_entrenador_id_fkey`)

> Documento de análisis y plan de resolución pensado para que una IA (o un dev)
> lo aplique de principio a fin. Incluye causa raíz, evidencia en el código,
> opciones de solución y los cambios concretos a realizar.

## 1. Síntoma

Al crear una sesión, el `POST` a `sesiones` devuelve **409 Conflict**:

```
POST .../rest/v1/sesiones?columns=...&select=...
409 Conflict
{
  "code": "23503",
  "details": "Key is not present in table \"usuarios\".",
  "hint": null,
  "message": "insert or update on table \"sesiones\" violates foreign key constraint \"sesiones_entrenador_id_fkey\""
}
```

`23503` = violación de **foreign key**. PostgreSQL rechaza el insert porque el
valor de `sesiones.entrenador_id` **no existe en la tabla `usuarios`**.

## 2. Causa raíz

Hay **dos modelos de datos distintos** para "entrenador" que se han cruzado:

| Concepto | Tabla | Origen |
|----------|-------|--------|
| Entrenador como **usuario auth** | `usuarios` (FK a `auth.users`) | migración `001_initial_schema.sql` |
| Entrenador como **entidad de dominio** | `entrenadores` | migración `013_entrenadores_jugadores.sql` |

El FK de la columna `sesiones.entrenador_id` apunta a la tabla **equivocada**:

- [`supabase/migrations/001_initial_schema.sql:102`](../supabase/migrations/001_initial_schema.sql#L102)
  ```sql
  entrenador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ```
  → genera el constraint `sesiones_entrenador_id_fkey` contra **`usuarios`**.

Pero la aplicación trabaja **siempre** con la tabla `entrenadores`:

- El selector de entrenadores del formulario se llena desde `entrenadores`:
  [`src/services/entrenadores-lookup.service.ts:25-31`](../src/services/entrenadores-lookup.service.ts#L25-L31)
  ```ts
  const { data, error } = await supabase
    .from("entrenadores")          // ← IDs de la tabla `entrenadores`
    .select("id,nombre,apellidos")
    .in("id", ids)
  ```

- Al crear la sesión se mete ese ID de `entrenadores` en la columna `entrenador_id`:
  [`src/services/sesiones.service.ts:139`](../src/services/sesiones.service.ts#L139)
  ```ts
  entrenador_id: input.entrenadorIds[0],   // ← un id de `entrenadores`, NO de `usuarios`
  ```

Resultado: `entrenadorIds[0]` es un UUID que existe en `entrenadores` pero
**no en `usuarios`** → el FK `sesiones_entrenador_id_fkey` (que valida contra
`usuarios`) falla con `23503`.

Además, la tabla pivote `sesion_entrenadores` (creada en
[`20260531130000_sesion_entrenadores.sql:16`](../supabase/migrations/20260531130000_sesion_entrenadores.sql#L16))
**sí** referencia `entrenadores(id)` correctamente. Es decir: la columna legacy
`sesiones.entrenador_id` quedó apuntando al modelo antiguo (`usuarios`) mientras
todo lo nuevo (pivote, lookup, formularios) usa `entrenadores`. La columna y su
FK están desincronizados con el resto del sistema.

### Por qué el insert llega siquiera a tocar la columna legacy

El servicio sigue escribiendo `entrenador_id` en la tabla `sesiones` "por
compatibilidad" (entrenador principal), tanto en create como en update y bulk:

- create: [`src/services/sesiones.service.ts:139`](../src/services/sesiones.service.ts#L139)
- update: [`src/services/sesiones.service.ts:167`](../src/services/sesiones.service.ts#L167)
- bulk:   [`src/services/sesiones.service.ts:195`](../src/services/sesiones.service.ts#L195)

Mientras la columna exista y tenga el FK contra `usuarios`, **cualquier** create/update
con un entrenador real de la app fallará.

## 3. Solución recomendada

Corregir el FK para que apunte a la tabla correcta (`entrenadores`). La columna
`sesiones.entrenador_id` debe referenciar `entrenadores(id)`, igual que la pivote.

### 3.1 Migración SQL (acción principal)

Crear una nueva migración (no editar las antiguas ya aplicadas). Nombre sugerido:
`supabase/migrations/20260601120000_fix_sesiones_entrenador_fk.sql`.

```sql
BEGIN;

-- ============================================================
-- FIX: sesiones.entrenador_id debe referenciar `entrenadores`,
-- no `usuarios`. Coherente con la pivote `sesion_entrenadores`
-- y con el lookup de la app (entrenadores-lookup.service.ts).
-- ============================================================

-- 1) Eliminar el FK incorrecto (contra usuarios).
ALTER TABLE public.sesiones
    DROP CONSTRAINT IF EXISTS sesiones_entrenador_id_fkey;

-- 2) Limpiar datos legacy que NO existan en `entrenadores`,
--    para que el nuevo FK pueda validarse sin romper.
--    (Si hay filas con entrenador_id que apunta a `usuarios`,
--    quedarían huérfanas respecto a `entrenadores`.)
--    Opción A: poner a NULL (requiere que la columna sea NULLABLE, ver paso 3).
UPDATE public.sesiones s
SET entrenador_id = NULL
WHERE s.entrenador_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.entrenadores e WHERE e.id = s.entrenador_id
  );

-- 3) Hacer la columna NULLABLE: la fuente de verdad pasa a ser la pivote
--    `sesion_entrenadores`. `entrenador_id` queda como "entrenador principal"
--    opcional. (Antes era NOT NULL por la migración 001.)
ALTER TABLE public.sesiones
    ALTER COLUMN entrenador_id DROP NOT NULL;

-- 4) Crear el FK correcto contra `entrenadores`.
ALTER TABLE public.sesiones
    ADD CONSTRAINT sesiones_entrenador_id_fkey
    FOREIGN KEY (entrenador_id)
    REFERENCES public.entrenadores(id)
    ON DELETE SET NULL;

COMMIT;
```

Notas:
- `ON DELETE SET NULL` (en vez de `CASCADE`) evita borrar sesiones enteras si se
  elimina un entrenador; la pivote ya tiene `ON DELETE CASCADE` para limpiar la
  relación N:M. Ajustar según la política de negocio deseada.
- Si negocio exige que toda sesión tenga al menos un entrenador, esa invariante
  debe garantizarse vía la **pivote** (no vía esta columna), idealmente en la capa
  de servicio o con un trigger.

### 3.2 Verificar/ajustar el servicio

Tras la migración, `entrenador_id` ya admite `NULL`. Revisar que el servicio no
asuma que `entrenadorIds[0]` siempre existe:

- [`src/services/sesiones.service.ts:139`](../src/services/sesiones.service.ts#L139),
  [`:167`](../src/services/sesiones.service.ts#L167),
  [`:195`](../src/services/sesiones.service.ts#L195)

`input.entrenadorIds[0]` es `undefined` si el array está vacío. Para insertar
`NULL` explícito en vez de `undefined`, usar:

```ts
entrenador_id: input.entrenadorIds[0] ?? null,
```

en los tres sitios (create, update, createSesionesBulk).

### 3.3 Validación en el schema (defensa en profundidad)

Confirmar que el formulario obliga (o no) a seleccionar al menos un entrenador en
[`src/schemas/sesion.schema.ts`](../src/schemas/sesion.schema.ts). Si negocio lo
exige, `entrenadorIds` debe ser `.min(1)`; si es opcional, permitir array vacío y
asegurarse de que el `?? null` del paso 3.2 esté en su sitio.

## 4. Pasos para aplicar y verificar

1. **Confirmar el FK actual** en la BD (Supabase SQL editor):
   ```sql
   SELECT conname, confrelid::regclass AS referenced_table
   FROM pg_constraint
   WHERE conrelid = 'public.sesiones'::regclass
     AND contype = 'f'
     AND conname = 'sesiones_entrenador_id_fkey';
   -- Esperado actual: referenced_table = usuarios  → confirma el bug
   ```
2. Crear la migración del paso 3.1 y aplicarla
   (`supabase db push` o el flujo de migraciones del proyecto).
3. Re-ejecutar la query de verificación: ahora debe devolver
   `referenced_table = entrenadores`.
4. Aplicar el `?? null` del paso 3.2 en el servicio.
5. Verificar tipos y lint:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm test -- --run
   ```
6. Verificación funcional (Playwright MCP o manual):
   - `npm run dev`
   - Ir a la página de sesiones, crear una sesión seleccionando un entrenador.
   - Debe crearse sin 409 y la pivote `sesion_entrenadores` debe contener la fila.
   - Editar la sesión y cambiar entrenadores → sin error.
   - Crear sesiones en bloque (bulk) si la UI lo permite → sin error.

## 5. Comprobaciones de regresión

- Confirmar que `regenerar` tipos de Supabase (`src/types/supabase.ts` /
  `database.types.ts`) refleje el FK nuevo si esos tipos se generan desde la BD.
- Revisar cualquier query que haga `select` con embedding del tipo
  `entrenador:usuarios(...)` a través de `sesiones.entrenador_id` — al cambiar el
  FK, un embed PostgREST que asumía `usuarios` dejaría de resolver. Buscar usos:
  ```
  grep -rn "entrenador" src/services/sesiones.service.ts
  grep -rn "sesiones" src/services
  ```
  (En el servicio actual `SELECT_COLS` solo trae columnas planas, sin embed, así
  que no debería haber regresión por este lado — confirmar de todas formas.)

## 6. Alternativa descartada (y por qué)

**Mantener el FK contra `usuarios` y mapear entrenador→usuario antes de insertar.**
Se descarta porque la app entera (lookup, pivote, formularios, tipos) ya usa la
tabla `entrenadores` como modelo de dominio. Forzar un mapeo a `usuarios` exigiría
que todo entrenador tenga cuenta auth, lo cual contradice el diseño explícito de
la migración 013 ("`entrenadores` y `jugadores` son tablas propias, no se mezclan
con `usuarios`"). La corrección correcta es alinear el FK con ese diseño.

## 7. Resumen ejecutivo

- **Qué falla:** insertar una sesión viola `sesiones_entrenador_id_fkey`.
- **Por qué:** la columna `sesiones.entrenador_id` referencia `usuarios`, pero la
  app guarda ahí un id de la tabla `entrenadores` (distinto modelo de datos).
- **Arreglo:** migración que reapunta el FK a `entrenadores(id)`, hace la columna
  nullable y limpia datos huérfanos; en el servicio, insertar `?? null`.
- **Archivos clave:**
  - `supabase/migrations/001_initial_schema.sql:102` (FK incorrecto, origen)
  - `supabase/migrations/20260531130000_sesion_entrenadores.sql:16` (modelo correcto)
  - `src/services/sesiones.service.ts:139,167,195` (insert de la columna legacy)
  - `src/services/entrenadores-lookup.service.ts:25` (origen de los IDs)
