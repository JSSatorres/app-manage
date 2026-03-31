CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- SEDES
-- ============================================
CREATE TABLE sedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    direccion TEXT,
    configuracion_visual JSONB DEFAULT '{}',
    responsable_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- USUARIOS
-- ============================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    nombre TEXT,
    rol TEXT NOT NULL CHECK (rol IN ('SuperAdmin', 'AdminSede', 'Entrenador')),
    sede_id UUID REFERENCES sedes(id) ON DELETE SET NULL,
    telefono TEXT,
    foto_perfil TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sedes
    ADD CONSTRAINT fk_sedes_responsable
    FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- ============================================
-- PARAMETROS_SISTEMA (Tablas Maestras)
-- ============================================
CREATE TABLE parametros_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria TEXT NOT NULL,
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    sede_id UUID REFERENCES sedes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(categoria, nombre, sede_id)
);

-- ============================================
-- EQUIPOS
-- ============================================
CREATE TABLE equipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT,
    sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    entrenador_principal_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    entrenador_adjunto_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EJERCICIOS (Biblioteca Central)
-- ============================================
CREATE TABLE ejercicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion_detallada TEXT,
    representacion_grafica TEXT,

    objetivo_principal TEXT,
    objetivos_secundarios TEXT[],
    contenido_tactico TEXT,
    contenido_tecnico TEXT,
    contenido_fisico TEXT,

    dimensiones_campo TEXT,
    numero_jugadores_min INTEGER,
    material_necesario TEXT[],

    drive_video_id TEXT,
    drive_image_id TEXT,

    sede_propietaria_id UUID REFERENCES sedes(id) ON DELETE SET NULL,
    sedes_ocultas UUID[],
    es_global BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SESIONES
-- ============================================
CREATE TABLE sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    hora_inicio TIME,
    duracion_estimada INTEGER,
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    entrenador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    microciclo INTEGER CHECK (microciclo >= 1 AND microciclo <= 52),
    periodo_temporada TEXT CHECK (periodo_temporada IN ('Pretemporada', 'Competición')),
    objetivo_sesion TEXT,
    observaciones_previas TEXT,
    feedback_post_entreno TEXT,
    estado TEXT NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'Planificada', 'Realizada')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SESION_DETALLE (Pivote sesión ↔ ejercicio)
-- ============================================
CREATE TABLE sesion_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    tiempo_ejecucion INTEGER,
    tiempo_descanso INTEGER,
    variante_aplicada TEXT,
    UNIQUE(sesion_id, orden)
);

-- ============================================
-- DOCUMENTOS
-- ============================================
CREATE TABLE documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    categoria_doc TEXT,
    drive_file_id TEXT,
    permisos_roles JSONB DEFAULT '[]',
    sede_id UUID REFERENCES sedes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX idx_usuarios_sede ON usuarios(sede_id);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_equipos_sede ON equipos(sede_id);
CREATE INDEX idx_ejercicios_sede_propietaria ON ejercicios(sede_propietaria_id);
CREATE INDEX idx_ejercicios_es_global ON ejercicios(es_global);
CREATE INDEX idx_sesiones_equipo ON sesiones(equipo_id);
CREATE INDEX idx_sesiones_entrenador ON sesiones(entrenador_id);
CREATE INDEX idx_sesiones_fecha ON sesiones(fecha);
CREATE INDEX idx_sesiones_estado ON sesiones(estado);
CREATE INDEX idx_sesion_detalle_sesion ON sesion_detalle(sesion_id);
CREATE INDEX idx_parametros_categoria ON parametros_sistema(categoria);
CREATE INDEX idx_documentos_sede ON documentos(sede_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sedes_updated_at
    BEFORE UPDATE ON sedes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_equipos_updated_at
    BEFORE UPDATE ON equipos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ejercicios_updated_at
    BEFORE UPDATE ON ejercicios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sesiones_updated_at
    BEFORE UPDATE ON sesiones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documentos_updated_at
    BEFORE UPDATE ON documentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS (Permisivas temporales - se endurecen en Task Auth)
-- ============================================
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametros_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesion_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_sedes" ON sedes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_parametros" ON parametros_sistema FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_equipos" ON equipos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ejercicios" ON ejercicios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sesiones" ON sesiones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sesion_detalle" ON sesion_detalle FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_documentos" ON documentos FOR ALL USING (true) WITH CHECK (true);
