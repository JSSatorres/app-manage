BEGIN;

-- ============================================================
-- MIGRACIÓN 011: Entrenadores y Jugadores con relaciones N:M
-- ============================================================
-- Modelo:
--   * `entrenadores` y `jugadores` son tablas propias (no se mezclan con `usuarios`).
--   * Un entrenador / jugador puede pertenecer a MUCHAS sedes y MUCHOS equipos
--     simultáneamente → tablas pivote.
--   * Se mantiene compatibilidad con `equipos.entrenador_principal_id` / `_adjunto_id`
--     que apuntaban a `usuarios`. Esos campos siguen existiendo (login de entrenador
--     como usuario auth queda como caso separado).
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: entrenadores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entrenadores (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       TEXT NOT NULL,
    apellidos    TEXT,
    email        TEXT,
    telefono     TEXT,
    fecha_nacimiento DATE,
    titulacion   TEXT,
    foto_url     TEXT,
    notas        TEXT,
    user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entrenadores_nombre ON public.entrenadores(nombre);
CREATE INDEX IF NOT EXISTS idx_entrenadores_email  ON public.entrenadores(lower(email));

CREATE TRIGGER trg_entrenadores_updated_at
    BEFORE UPDATE ON public.entrenadores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- Tabla: jugadores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jugadores (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       TEXT NOT NULL,
    apellidos    TEXT,
    email        TEXT,
    telefono     TEXT,
    fecha_nacimiento DATE,
    dorsal       INTEGER,
    posicion     TEXT,
    pie_dominante TEXT CHECK (pie_dominante IS NULL OR pie_dominante IN ('Diestro','Zurdo','Ambidiestro')),
    foto_url     TEXT,
    notas        TEXT,
    tutor_nombre TEXT,
    tutor_telefono TEXT,
    user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jugadores_nombre ON public.jugadores(nombre);
CREATE INDEX IF NOT EXISTS idx_jugadores_email  ON public.jugadores(lower(email));

CREATE TRIGGER trg_jugadores_updated_at
    BEFORE UPDATE ON public.jugadores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLAS PIVOTE — Entrenadores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entrenador_sedes (
    entrenador_id UUID NOT NULL REFERENCES public.entrenadores(id) ON DELETE CASCADE,
    sede_id       UUID NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
    rol           TEXT NOT NULL DEFAULT 'Entrenador',
    created_at    TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (entrenador_id, sede_id)
);

CREATE INDEX IF NOT EXISTS idx_entrenador_sedes_sede ON public.entrenador_sedes(sede_id);

CREATE TABLE IF NOT EXISTS public.entrenador_equipos (
    entrenador_id UUID NOT NULL REFERENCES public.entrenadores(id) ON DELETE CASCADE,
    equipo_id     UUID NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
    rol           TEXT NOT NULL DEFAULT 'Entrenador' CHECK (rol IN ('Principal','Adjunto','Entrenador','Preparador')),
    created_at    TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (entrenador_id, equipo_id)
);

CREATE INDEX IF NOT EXISTS idx_entrenador_equipos_equipo ON public.entrenador_equipos(equipo_id);

-- ============================================================
-- TABLAS PIVOTE — Jugadores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.jugador_sedes (
    jugador_id UUID NOT NULL REFERENCES public.jugadores(id) ON DELETE CASCADE,
    sede_id    UUID NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (jugador_id, sede_id)
);

CREATE INDEX IF NOT EXISTS idx_jugador_sedes_sede ON public.jugador_sedes(sede_id);

CREATE TABLE IF NOT EXISTS public.jugador_equipos (
    jugador_id UUID NOT NULL REFERENCES public.jugadores(id) ON DELETE CASCADE,
    equipo_id  UUID NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
    dorsal     INTEGER,
    posicion   TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (jugador_id, equipo_id)
);

CREATE INDEX IF NOT EXISTS idx_jugador_equipos_equipo ON public.jugador_equipos(equipo_id);

-- ============================================================
-- RLS — abierto a usuarios autenticados, filtrado por sede vía pivote
-- ============================================================
ALTER TABLE public.entrenadores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugadores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrenador_sedes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrenador_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugador_sedes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugador_equipos    ENABLE ROW LEVEL SECURITY;

-- Helpers: si la BD tiene `current_user_rol()` y `current_user_sede_id()` (migración APPLY_NOW)
-- las usamos; si no, caemos a comprobación inline. Aquí asumimos modelo simple `sede_id`
-- en `usuarios`. Para el modelo workspace-based, ajustar policies más adelante.

-- Entrenadores: SuperAdmin ve todos; el resto ve los que comparten sede con él.
CREATE POLICY "entrenadores_select" ON public.entrenadores FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.entrenador_sedes es
        WHERE es.entrenador_id = entrenadores.id
          AND es.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
    )
);

CREATE POLICY "entrenadores_mutate" ON public.entrenadores FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede'))
);

-- Jugadores
CREATE POLICY "jugadores_select" ON public.jugadores FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.jugador_sedes js
        WHERE js.jugador_id = jugadores.id
          AND js.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
    )
);

CREATE POLICY "jugadores_mutate" ON public.jugadores FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede','Entrenador'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede','Entrenador'))
);

-- Pivotes: cualquier usuario autenticado de la sede puede leer; solo Admin/SuperAdmin escriben.
CREATE POLICY "entrenador_sedes_select" ON public.entrenador_sedes FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);
CREATE POLICY "entrenador_sedes_mutate" ON public.entrenador_sedes FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede'))
);

CREATE POLICY "entrenador_equipos_select" ON public.entrenador_equipos FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.equipos eq
        WHERE eq.id = entrenador_equipos.equipo_id
          AND eq.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
    )
);
CREATE POLICY "entrenador_equipos_mutate" ON public.entrenador_equipos FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede'))
);

CREATE POLICY "jugador_sedes_select" ON public.jugador_sedes FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);
CREATE POLICY "jugador_sedes_mutate" ON public.jugador_sedes FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede','Entrenador'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede','Entrenador'))
);

CREATE POLICY "jugador_equipos_select" ON public.jugador_equipos FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
    OR EXISTS (
        SELECT 1 FROM public.equipos eq
        WHERE eq.id = jugador_equipos.equipo_id
          AND eq.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
    )
);
CREATE POLICY "jugador_equipos_mutate" ON public.jugador_equipos FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede','Entrenador'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede','Entrenador'))
);

COMMIT;
