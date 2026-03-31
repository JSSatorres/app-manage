BEGIN;

WITH sedes_data AS (
  SELECT id, nombre
  FROM sedes
  WHERE nombre IN ('Sede Central', 'Sede Norte')
),
u AS (
  INSERT INTO usuarios (id, email, nombre, rol, sede_id, telefono, foto_perfil)
  SELECT
    gen_random_uuid(),
    v.email,
    v.nombre,
    v.rol,
    s.id,
    v.telefono,
    NULL
  FROM (VALUES
    ('superadmin@sportapp.test', 'Super Admin', 'SuperAdmin', NULL),
    ('admin.central@sportapp.test', 'Admin Central', 'AdminSede', '600000001'),
    ('trainer.central@sportapp.test', 'Entrenador Central', 'Entrenador', '600000002'),
    ('admin.norte@sportapp.test', 'Admin Norte', 'AdminSede', '600000003'),
    ('trainer.norte@sportapp.test', 'Entrenador Norte', 'Entrenador', '600000004')
  ) AS v(email, nombre, rol, telefono)
  LEFT JOIN sedes_data s
    ON (v.email LIKE '%.central.%' AND s.nombre = 'Sede Central')
    OR (v.email LIKE '%.norte.%' AND s.nombre = 'Sede Norte')
    OR (v.email LIKE 'superadmin%' AND s.nombre = 'Sede Central')
  RETURNING id, email, rol, sede_id
),
teams AS (
  INSERT INTO equipos (id, nombre, categoria, sede_id, entrenador_principal_id, entrenador_adjunto_id)
  SELECT
    gen_random_uuid(),
    v.nombre,
    v.categoria,
    s.id,
    ep.id,
    NULL
  FROM (VALUES
    ('Equipo A - Central', 'Cadete', 'Sede Central', 'trainer.central@sportapp.test'),
    ('Equipo B - Central', 'Infantil', 'Sede Central', 'trainer.central@sportapp.test'),
    ('Equipo A - Norte', 'Alevín', 'Sede Norte', 'trainer.norte@sportapp.test'),
    ('Equipo B - Norte', 'Benjamín', 'Sede Norte', 'trainer.norte@sportapp.test')
  ) AS v(nombre, categoria, sede_nombre, entrenador_email)
  JOIN sedes_data s ON s.nombre = v.sede_nombre
  JOIN u ep ON ep.email = v.entrenador_email
  RETURNING id, nombre, sede_id, entrenador_principal_id
),
ex AS (
  INSERT INTO ejercicios (
    id,
    titulo,
    objetivo_principal,
    numero_jugadores_min,
    material_necesario,
    sede_propietaria_id,
    es_global
  )
  SELECT
    gen_random_uuid(),
    v.titulo,
    v.objetivo,
    v.jugadores_min,
    v.material::text[],
    CASE WHEN v.es_global THEN NULL ELSE s.id END,
    v.es_global
  FROM (VALUES
    ('Rondo 4v2', 'Toma de decisiones', 6, ARRAY['Balones','Conos'], true,  'Sede Central'),
    ('Finalización 2v1', 'Finalización', 5, ARRAY['Balones','Porterías'], false, 'Sede Central'),
    ('Salida de presión', 'Mejora técnica', 8, ARRAY['Petos','Conos','Balones'], false, 'Sede Norte'),
    ('Posesión 5v5', 'Táctico', 10, ARRAY['Petos','Balones'], true, 'Sede Norte')
  ) AS v(titulo, objetivo, jugadores_min, material, es_global, sede_nombre)
  LEFT JOIN sedes_data s ON s.nombre = v.sede_nombre
  RETURNING id, titulo
)
INSERT INTO sesiones (
  id,
  fecha,
  hora_inicio,
  duracion_estimada,
  equipo_id,
  entrenador_id,
  microciclo,
  periodo_temporada,
  objetivo_sesion,
  observaciones_previas,
  estado
)
SELECT
  gen_random_uuid(),
  v.fecha::date,
  v.hora_inicio,
  v.duracion,
  t.id,
  t.entrenador_principal_id,
  v.microciclo,
  v.periodo,
  v.objetivo,
  v.obs,
  v.estado
FROM (VALUES
  ('2026-03-30', '18:00', 90, 1, 'Pretemporada', 'Sesión de carga', 'Trabajo técnico + físico', 'Borrador',  'Equipo A - Central'),
  ('2026-04-01', '19:00', 75, 1, 'Pretemporada', 'Finalización', 'Enfoque en último pase', 'Planificada','Equipo B - Central'),
  ('2026-03-31', '18:30', 80, 2, 'Pretemporada', 'Posesión', 'Conservación y presión tras pérdida', 'Borrador','Equipo A - Norte'),
  ('2026-04-02', '19:15', 70, 2, 'Competición', 'Velocidad', 'Bloques cortos', 'Planificada','Equipo B - Norte')
) AS v(fecha, hora_inicio, duracion, microciclo, periodo, objetivo, obs, estado, equipo_nombre)
JOIN teams t ON t.nombre = v.equipo_nombre;

INSERT INTO documentos (id, titulo, categoria_doc, drive_file_id, permisos_roles, sede_id)
SELECT
  gen_random_uuid(),
  v.titulo,
  v.categoria_doc,
  NULL,
  '{}'::jsonb,
  s.id
FROM (VALUES
  ('Reglamento interno', 'Normativa', 'Sede Central'),
  ('Plantilla asistencia', 'Plantilla', 'Sede Central'),
  ('Protocolo lesión', 'Normativa', 'Sede Norte'),
  ('Checklist partido', 'Plantilla', 'Sede Norte')
) AS v(titulo, categoria_doc, sede_nombre)
JOIN sedes_data s ON s.nombre = v.sede_nombre;

COMMIT;

