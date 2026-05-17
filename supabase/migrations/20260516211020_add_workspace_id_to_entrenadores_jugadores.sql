-- ============================================================
-- Añadir workspace_id a entrenadores y jugadores
-- + reescribir RLS para aislamiento por workspace
-- + validar que sus pivotes con sedes / equipos cuelguen del mismo workspace
-- ============================================================

BEGIN;

-- 1) Columnas (primero NULL para poder backfill, luego NOT NULL)
ALTER TABLE public.entrenadores
    ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.jugadores
    ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 2) Backfill: deducir workspace_id desde las sedes a las que pertenecen
UPDATE public.entrenadores e
SET workspace_id = sub.workspace_id
FROM (
    SELECT es.entrenador_id, s.workspace_id
    FROM public.entrenador_sedes es
    JOIN public.sedes s ON s.id = es.sede_id
    GROUP BY es.entrenador_id, s.workspace_id
) sub
WHERE e.id = sub.entrenador_id
  AND e.workspace_id IS NULL;

UPDATE public.jugadores j
SET workspace_id = sub.workspace_id
FROM (
    SELECT js.jugador_id, s.workspace_id
    FROM public.jugador_sedes js
    JOIN public.sedes s ON s.id = js.sede_id
    GROUP BY js.jugador_id, s.workspace_id
) sub
WHERE j.id = sub.jugador_id
  AND j.workspace_id IS NULL;

-- 3) Limpiar huérfanos (entrenadores/jugadores sin sede asociada → sin workspace deducible)
DELETE FROM public.entrenadores WHERE workspace_id IS NULL;
DELETE FROM public.jugadores    WHERE workspace_id IS NULL;

-- 4) NOT NULL
ALTER TABLE public.entrenadores ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.jugadores    ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entrenadores_workspace ON public.entrenadores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_workspace    ON public.jugadores(workspace_id);

-- 5) Trigger: impedir vincular un entrenador/jugador a una sede o equipo
--    que pertenezca a otro workspace
CREATE OR REPLACE FUNCTION public.assert_entrenador_sede_same_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_ent_ws uuid;
    v_sede_ws uuid;
BEGIN
    SELECT workspace_id INTO v_ent_ws  FROM public.entrenadores WHERE id = NEW.entrenador_id;
    SELECT workspace_id INTO v_sede_ws FROM public.sedes        WHERE id = NEW.sede_id;
    IF v_ent_ws IS DISTINCT FROM v_sede_ws THEN
        RAISE EXCEPTION 'Entrenador y sede pertenecen a workspaces distintos';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_entrenador_equipo_same_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_ent_ws uuid;
    v_eq_ws  uuid;
BEGIN
    SELECT workspace_id INTO v_ent_ws FROM public.entrenadores WHERE id = NEW.entrenador_id;
    SELECT s.workspace_id INTO v_eq_ws
    FROM public.equipos e JOIN public.sedes s ON s.id = e.sede_id
    WHERE e.id = NEW.equipo_id;
    IF v_ent_ws IS DISTINCT FROM v_eq_ws THEN
        RAISE EXCEPTION 'Entrenador y equipo pertenecen a workspaces distintos';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_jugador_sede_same_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_j_ws uuid;
    v_s_ws uuid;
BEGIN
    SELECT workspace_id INTO v_j_ws FROM public.jugadores WHERE id = NEW.jugador_id;
    SELECT workspace_id INTO v_s_ws FROM public.sedes     WHERE id = NEW.sede_id;
    IF v_j_ws IS DISTINCT FROM v_s_ws THEN
        RAISE EXCEPTION 'Jugador y sede pertenecen a workspaces distintos';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_jugador_equipo_same_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_j_ws  uuid;
    v_eq_ws uuid;
BEGIN
    SELECT workspace_id INTO v_j_ws FROM public.jugadores WHERE id = NEW.jugador_id;
    SELECT s.workspace_id INTO v_eq_ws
    FROM public.equipos e JOIN public.sedes s ON s.id = e.sede_id
    WHERE e.id = NEW.equipo_id;
    IF v_j_ws IS DISTINCT FROM v_eq_ws THEN
        RAISE EXCEPTION 'Jugador y equipo pertenecen a workspaces distintos';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_entrenador_sede   ON public.entrenador_sedes;
DROP TRIGGER IF EXISTS trg_assert_entrenador_equipo ON public.entrenador_equipos;
DROP TRIGGER IF EXISTS trg_assert_jugador_sede      ON public.jugador_sedes;
DROP TRIGGER IF EXISTS trg_assert_jugador_equipo    ON public.jugador_equipos;

CREATE TRIGGER trg_assert_entrenador_sede
    BEFORE INSERT OR UPDATE ON public.entrenador_sedes
    FOR EACH ROW EXECUTE FUNCTION public.assert_entrenador_sede_same_workspace();

CREATE TRIGGER trg_assert_entrenador_equipo
    BEFORE INSERT OR UPDATE ON public.entrenador_equipos
    FOR EACH ROW EXECUTE FUNCTION public.assert_entrenador_equipo_same_workspace();

CREATE TRIGGER trg_assert_jugador_sede
    BEFORE INSERT OR UPDATE ON public.jugador_sedes
    FOR EACH ROW EXECUTE FUNCTION public.assert_jugador_sede_same_workspace();

CREATE TRIGGER trg_assert_jugador_equipo
    BEFORE INSERT OR UPDATE ON public.jugador_equipos
    FOR EACH ROW EXECUTE FUNCTION public.assert_jugador_equipo_same_workspace();

-- ============================================================
-- 6) RLS por workspace_id (vía workspace_members)
-- ============================================================

DROP POLICY IF EXISTS "entrenadores_select" ON public.entrenadores;
DROP POLICY IF EXISTS "entrenadores_mutate" ON public.entrenadores;
DROP POLICY IF EXISTS "jugadores_select"    ON public.jugadores;
DROP POLICY IF EXISTS "jugadores_mutate"    ON public.jugadores;
DROP POLICY IF EXISTS "entrenador_sedes_select"   ON public.entrenador_sedes;
DROP POLICY IF EXISTS "entrenador_sedes_mutate"   ON public.entrenador_sedes;
DROP POLICY IF EXISTS "entrenador_equipos_select" ON public.entrenador_equipos;
DROP POLICY IF EXISTS "entrenador_equipos_mutate" ON public.entrenador_equipos;
DROP POLICY IF EXISTS "jugador_sedes_select"      ON public.jugador_sedes;
DROP POLICY IF EXISTS "jugador_sedes_mutate"      ON public.jugador_sedes;
DROP POLICY IF EXISTS "jugador_equipos_select"    ON public.jugador_equipos;
DROP POLICY IF EXISTS "jugador_equipos_mutate"    ON public.jugador_equipos;

-- ENTRENADORES
CREATE POLICY "entrenadores_select" ON public.entrenadores FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid() AND wm.workspace_id = entrenadores.workspace_id
    )
);

CREATE POLICY "entrenadores_mutate" ON public.entrenadores FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.workspace_id = entrenadores.workspace_id
          AND wm.role IN ('admin','owner')
    )
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.workspace_id = entrenadores.workspace_id
          AND wm.role IN ('admin','owner')
    )
);

-- JUGADORES
CREATE POLICY "jugadores_select" ON public.jugadores FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid() AND wm.workspace_id = jugadores.workspace_id
    )
);

CREATE POLICY "jugadores_mutate" ON public.jugadores FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.workspace_id = jugadores.workspace_id
          AND wm.role IN ('admin','owner')
    )
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.workspace_id = jugadores.workspace_id
          AND wm.role IN ('admin','owner')
    )
);

-- PIVOTES: heredan acceso del entrenador / jugador
CREATE POLICY "entrenador_sedes_select" ON public.entrenador_sedes FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.entrenadores e WHERE e.id = entrenador_sedes.entrenador_id)
);
CREATE POLICY "entrenador_sedes_mutate" ON public.entrenador_sedes FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.entrenadores e
        JOIN public.workspace_members wm ON wm.workspace_id = e.workspace_id
        WHERE e.id = entrenador_sedes.entrenador_id
          AND wm.user_id = auth.uid()
          AND (wm.role IN ('admin','owner')
               OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.entrenadores e
        JOIN public.workspace_members wm ON wm.workspace_id = e.workspace_id
        WHERE e.id = entrenador_sedes.entrenador_id
          AND wm.user_id = auth.uid()
          AND (wm.role IN ('admin','owner')
               OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin'))
    )
);

CREATE POLICY "entrenador_equipos_select" ON public.entrenador_equipos FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.entrenadores e WHERE e.id = entrenador_equipos.entrenador_id)
);
CREATE POLICY "entrenador_equipos_mutate" ON public.entrenador_equipos FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.entrenadores e
        JOIN public.workspace_members wm ON wm.workspace_id = e.workspace_id
        WHERE e.id = entrenador_equipos.entrenador_id
          AND wm.user_id = auth.uid()
          AND (wm.role IN ('admin','owner')
               OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.entrenadores e
        JOIN public.workspace_members wm ON wm.workspace_id = e.workspace_id
        WHERE e.id = entrenador_equipos.entrenador_id
          AND wm.user_id = auth.uid()
          AND (wm.role IN ('admin','owner')
               OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin'))
    )
);

CREATE POLICY "jugador_sedes_select" ON public.jugador_sedes FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.jugadores j WHERE j.id = jugador_sedes.jugador_id)
);
CREATE POLICY "jugador_sedes_mutate" ON public.jugador_sedes FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.jugadores j
        JOIN public.workspace_members wm ON wm.workspace_id = j.workspace_id
        WHERE j.id = jugador_sedes.jugador_id
          AND wm.user_id = auth.uid()
          AND (wm.role IN ('admin','owner')
               OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.jugadores j
        JOIN public.workspace_members wm ON wm.workspace_id = j.workspace_id
        WHERE j.id = jugador_sedes.jugador_id
          AND wm.user_id = auth.uid()
          AND (wm.role IN ('admin','owner')
               OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin'))
    )
);

CREATE POLICY "jugador_equipos_select" ON public.jugador_equipos FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.jugadores j WHERE j.id = jugador_equipos.jugador_id)
);
CREATE POLICY "jugador_equipos_mutate" ON public.jugador_equipos FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.jugadores j
        JOIN public.workspace_members wm ON wm.workspace_id = j.workspace_id
        WHERE j.id = jugador_equipos.jugador_id
          AND wm.user_id = auth.uid()
          AND (wm.role IN ('admin','owner')
               OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.jugadores j
        JOIN public.workspace_members wm ON wm.workspace_id = j.workspace_id
        WHERE j.id = jugador_equipos.jugador_id
          AND wm.user_id = auth.uid()
          AND (wm.role IN ('admin','owner')
               OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin'))
    )
);

COMMIT;
