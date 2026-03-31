BEGIN;

INSERT INTO sedes (id, nombre, direccion, configuracion_visual)
VALUES
  (gen_random_uuid(), 'Sede Central', 'Calle Principal 1', '{}'::jsonb),
  (gen_random_uuid(), 'Sede Norte', 'Avenida Norte 22', '{}'::jsonb);

WITH sedes_data AS (
  SELECT id, nombre FROM sedes WHERE nombre IN ('Sede Central', 'Sede Norte')
)
INSERT INTO parametros_sistema (categoria, nombre, activo, sede_id)
SELECT 'tipo_objetivo', v.nombre, true, NULL::uuid
FROM (VALUES
  ('Mejora técnica'),
  ('Toma de decisiones'),
  ('Finalización'),
  ('Transiciones')
) AS v(nombre)
UNION ALL
SELECT 'tipo_contenido', v.nombre, true, NULL::uuid
FROM (VALUES
  ('Táctico'),
  ('Técnico'),
  ('Físico')
) AS v(nombre)
UNION ALL
SELECT 'material', v.nombre, true, NULL::uuid
FROM (VALUES
  ('Conos'),
  ('Petos'),
  ('Porterías'),
  ('Balones')
) AS v(nombre)
UNION ALL
SELECT 'categoria_edad', v.nombre, true, NULL::uuid
FROM (VALUES
  ('Benjamín'),
  ('Alevín'),
  ('Infantil'),
  ('Cadete')
) AS v(nombre);

COMMIT;

