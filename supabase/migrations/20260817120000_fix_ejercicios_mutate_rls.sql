-- Reemplaza solo la policy histórica de mutación de ejercicios.
-- SELECT, grants, helpers, pivotes y Realtime quedan fuera de alcance.

BEGIN;

DROP POLICY IF EXISTS "ejercicios_mutate" ON public.ejercicios;
DROP POLICY IF EXISTS "ejercicios_insert_role_scope" ON public.ejercicios;
DROP POLICY IF EXISTS "ejercicios_update_role_scope" ON public.ejercicios;
DROP POLICY IF EXISTS "ejercicios_delete_role_scope" ON public.ejercicios;

CREATE POLICY "ejercicios_insert_role_scope" ON public.ejercicios FOR INSERT TO authenticated
WITH CHECK (
  (
    public.current_user_rol() = 'SuperAdmin'
    OR (
      public.current_user_rol() IN ('AdminSede', 'Entrenador')
      AND es_global IS NOT TRUE
      AND sede_propietaria_id = public.current_user_sede_id()
    )
    OR (
      public.current_user_rol() = 'AdminSede'
      AND public.current_user_ws_role(workspace_id) = 'admin'
      AND es_global IS TRUE
      AND sede_propietaria_id IS NULL
    )
  )
  AND (
    (es_global IS TRUE AND sede_propietaria_id IS NULL)
    OR (
      es_global IS NOT TRUE
      AND sede_propietaria_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sedes
        WHERE sedes.id = ejercicios.sede_propietaria_id
          AND sedes.workspace_id = ejercicios.workspace_id
      )
    )
  )
);

CREATE POLICY "ejercicios_update_role_scope" ON public.ejercicios FOR UPDATE TO authenticated
USING (
  (
    public.current_user_rol() = 'SuperAdmin'
    OR (
      public.current_user_rol() IN ('AdminSede', 'Entrenador')
      AND es_global IS NOT TRUE
      AND sede_propietaria_id = public.current_user_sede_id()
    )
    OR (
      public.current_user_rol() = 'AdminSede'
      AND public.current_user_ws_role(workspace_id) = 'admin'
      AND es_global IS TRUE
      AND sede_propietaria_id IS NULL
    )
  )
  AND (
    (es_global IS TRUE AND sede_propietaria_id IS NULL)
    OR (
      es_global IS NOT TRUE
      AND sede_propietaria_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sedes
        WHERE sedes.id = ejercicios.sede_propietaria_id
          AND sedes.workspace_id = ejercicios.workspace_id
      )
    )
  )
)
WITH CHECK (
  (
    public.current_user_rol() = 'SuperAdmin'
    OR (
      public.current_user_rol() IN ('AdminSede', 'Entrenador')
      AND es_global IS NOT TRUE
      AND sede_propietaria_id = public.current_user_sede_id()
    )
    OR (
      public.current_user_rol() = 'AdminSede'
      AND public.current_user_ws_role(workspace_id) = 'admin'
      AND es_global IS TRUE
      AND sede_propietaria_id IS NULL
    )
  )
  AND (
    (es_global IS TRUE AND sede_propietaria_id IS NULL)
    OR (
      es_global IS NOT TRUE
      AND sede_propietaria_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sedes
        WHERE sedes.id = ejercicios.sede_propietaria_id
          AND sedes.workspace_id = ejercicios.workspace_id
      )
    )
  )
);

CREATE POLICY "ejercicios_delete_role_scope" ON public.ejercicios FOR DELETE TO authenticated
USING (
  (
    public.current_user_rol() = 'SuperAdmin'
    OR (
      public.current_user_rol() IN ('AdminSede', 'Entrenador')
      AND es_global IS NOT TRUE
      AND sede_propietaria_id = public.current_user_sede_id()
    )
    OR (
      public.current_user_rol() = 'AdminSede'
      AND public.current_user_ws_role(workspace_id) = 'admin'
      AND es_global IS TRUE
      AND sede_propietaria_id IS NULL
    )
  )
  AND (
    (es_global IS TRUE AND sede_propietaria_id IS NULL)
    OR (
      es_global IS NOT TRUE
      AND sede_propietaria_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sedes
        WHERE sedes.id = ejercicios.sede_propietaria_id
          AND sedes.workspace_id = ejercicios.workspace_id
      )
    )
  )
);

/*
Rollback literal de supabase/migrations/021_rls_por_rol.sql:47-62:

DROP POLICY IF EXISTS "ejercicios_mutate" ON public.ejercicios;
CREATE POLICY "ejercicios_mutate" ON public.ejercicios FOR ALL TO authenticated
USING (
  public.current_user_rol() IN ('SuperAdmin','AdminSede','Entrenador')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_propietaria_id = public.current_user_sede_id()
  )
)
WITH CHECK (
  public.current_user_rol() IN ('SuperAdmin','AdminSede','Entrenador')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_propietaria_id = public.current_user_sede_id()
  )
);
*/

COMMIT;
