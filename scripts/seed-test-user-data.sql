-- Datos demo para la sede del usuario de test (juansataz.devaws@gmail.com)
-- Sede: ebdd707a-c203-42fa-9c80-a67ef916da46 (Sede Central)
-- Usuario: 0137e467-3273-42dc-91ed-38a153602ee0

-- Equipos de la sede del usuario de test
INSERT INTO public.equipos (id, nombre, categoria, sede_id, created_at, updated_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Cadete A', 'Cadete', 'ebdd707a-c203-42fa-9c80-a67ef916da46', NOW(), NOW()),
  ('a1000000-0000-0000-0000-000000000002', 'Infantil B', 'Infantil', 'ebdd707a-c203-42fa-9c80-a67ef916da46', NOW(), NOW()),
  ('a1000000-0000-0000-0000-000000000003', 'Alevín A', 'Alevín', 'ebdd707a-c203-42fa-9c80-a67ef916da46', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Sesiones para los equipos de la sede del usuario de test
INSERT INTO public.sesiones (id, fecha, hora_inicio, duracion_estimada, equipo_id, entrenador_id, microciclo, periodo_temporada, objetivo_sesion, estado, created_at, updated_at)
VALUES
  ('b1000000-0000-0000-0000-000000000001', '2026-05-20', '09:00', 90, 'a1000000-0000-0000-0000-000000000001', '0137e467-3273-42dc-91ed-38a153602ee0', 35, 'Competición', 'Táctica defensiva', 'Planificada', NOW(), NOW()),
  ('b1000000-0000-0000-0000-000000000002', '2026-05-22', '10:30', 75, 'a1000000-0000-0000-0000-000000000002', '0137e467-3273-42dc-91ed-38a153602ee0', 35, 'Competición', 'Posesión y transiciones', 'Borrador', NOW(), NOW()),
  ('b1000000-0000-0000-0000-000000000003', '2026-05-18', '08:00', 60, 'a1000000-0000-0000-0000-000000000003', '0137e467-3273-42dc-91ed-38a153602ee0', 34, 'Competición', 'Finalización', 'Realizada', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Documentos para la sede del usuario de test
INSERT INTO public.documentos (id, titulo, categoria_doc, sede_id, created_at, updated_at)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Reglamento interno de la sede', 'Normativa', 'ebdd707a-c203-42fa-9c80-a67ef916da46', NOW(), NOW()),
  ('c1000000-0000-0000-0000-000000000002', 'Plan de temporada 2025-2026', 'Planificación', 'ebdd707a-c203-42fa-9c80-a67ef916da46', NOW(), NOW()),
  ('c1000000-0000-0000-0000-000000000003', 'Ficha médica jugadores', 'Médico', 'ebdd707a-c203-42fa-9c80-a67ef916da46', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
