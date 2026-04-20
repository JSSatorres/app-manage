-- =============================================================
-- SEED DEMO — manage-sport-app
-- Ejecutar en: Supabase Dashboard > SQL Editor
--
-- IMPORTANTE: Este seed asume que el workspace demo ya existe
-- con id = '00000000-0000-0000-0000-000000000001' (creado en 004_workspaces_google_invites.sql).
--
-- Los usuarios de la tabla `usuarios` NO están vinculados a
-- auth.users reales (no tienen login). Para verlos en la app
-- asegúrate de que tu usuario autenticado sea miembro del
-- workspace demo (workspace_members).
--
-- Orden de inserción respeta foreign keys:
--   workspaces → sedes → usuarios → equipos
--   → ejercicios → sesiones → sesion_detalle → documentos
--   → parametros_sistema
-- =============================================================

BEGIN;

-- ─────────────────────────────────────────────
-- 0. Constantes (workspace demo ya existe)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workspaces WHERE id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    INSERT INTO workspaces (id, name)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Club Deportivo Demo');
  ELSE
    UPDATE workspaces
    SET name = 'Club Deportivo Demo'
    WHERE id = '00000000-0000-0000-0000-000000000001';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 1. SEDES
-- ─────────────────────────────────────────────
INSERT INTO sedes (id, nombre, direccion, configuracion_visual, workspace_id)
VALUES
  ('10000000-0000-0000-0000-000000000001',
   'Sede Central',
   'Av. del Estadio 1, Madrid',
   '{"color_primario": "#1a56db", "color_secundario": "#e3f0ff"}'::jsonb,
   '00000000-0000-0000-0000-000000000001'),

  ('10000000-0000-0000-0000-000000000002',
   'Sede Norte',
   'Calle Pinares 45, Alcobendas',
   '{"color_primario": "#057a55", "color_secundario": "#e8f8f0"}'::jsonb,
   '00000000-0000-0000-0000-000000000001'),

  ('10000000-0000-0000-0000-000000000003',
   'Sede Sur',
   'Paseo de la Ribera 12, Getafe',
   '{"color_primario": "#c81e1e", "color_secundario": "#fde8e8"}'::jsonb,
   '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. USUARIOS (sin auth.users vinculado — datos de demo)
-- ─────────────────────────────────────────────
INSERT INTO usuarios (id, email, nombre, rol, sede_id, telefono)
VALUES
  -- SuperAdmin
  ('20000000-0000-0000-0000-000000000001',
   'director@clubdemo.es', 'Carlos Fernández Ruiz', 'SuperAdmin', NULL, '600 111 001'),

  -- AdminSede Central
  ('20000000-0000-0000-0000-000000000002',
   'admin.central@clubdemo.es', 'María López Sanz', 'AdminSede',
   '10000000-0000-0000-0000-000000000001', '600 111 002'),

  -- AdminSede Norte
  ('20000000-0000-0000-0000-000000000003',
   'admin.norte@clubdemo.es', 'Pedro Martínez Gil', 'AdminSede',
   '10000000-0000-0000-0000-000000000002', '600 111 003'),

  -- AdminSede Sur
  ('20000000-0000-0000-0000-000000000004',
   'admin.sur@clubdemo.es', 'Laura García Torres', 'AdminSede',
   '10000000-0000-0000-0000-000000000003', '600 111 004'),

  -- Entrenadores Central
  ('20000000-0000-0000-0000-000000000005',
   'entrenador1.central@clubdemo.es', 'Javier Romero Blanco', 'Entrenador',
   '10000000-0000-0000-0000-000000000001', '600 222 001'),

  ('20000000-0000-0000-0000-000000000006',
   'entrenador2.central@clubdemo.es', 'Ana Molina Vera', 'Entrenador',
   '10000000-0000-0000-0000-000000000001', '600 222 002'),

  -- Entrenadores Norte
  ('20000000-0000-0000-0000-000000000007',
   'entrenador1.norte@clubdemo.es', 'Sergio Navarro Cruz', 'Entrenador',
   '10000000-0000-0000-0000-000000000002', '600 333 001'),

  ('20000000-0000-0000-0000-000000000008',
   'entrenador2.norte@clubdemo.es', 'Elena Pardo Ríos', 'Entrenador',
   '10000000-0000-0000-0000-000000000002', '600 333 002'),

  -- Entrenadores Sur
  ('20000000-0000-0000-0000-000000000009',
   'entrenador1.sur@clubdemo.es', 'David Herrero Campos', 'Entrenador',
   '10000000-0000-0000-0000-000000000003', '600 444 001'),

  ('20000000-0000-0000-0000-000000000010',
   'entrenador2.sur@clubdemo.es', 'Isabel Moreno Lara', 'Entrenador',
   '10000000-0000-0000-0000-000000000003', '600 444 002')
ON CONFLICT (id) DO NOTHING;

-- Asignar responsables a sedes
UPDATE sedes SET responsable_id = '20000000-0000-0000-0000-000000000002'
WHERE id = '10000000-0000-0000-0000-000000000001';

UPDATE sedes SET responsable_id = '20000000-0000-0000-0000-000000000003'
WHERE id = '10000000-0000-0000-0000-000000000002';

UPDATE sedes SET responsable_id = '20000000-0000-0000-0000-000000000004'
WHERE id = '10000000-0000-0000-0000-000000000003';

-- ─────────────────────────────────────────────
-- 3. EQUIPOS
-- ─────────────────────────────────────────────
INSERT INTO equipos (id, nombre, categoria, sede_id, entrenador_principal_id, entrenador_adjunto_id)
VALUES
  -- Sede Central
  ('30000000-0000-0000-0000-000000000001',
   'Cadete A Central', 'Cadete',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000006'),

  ('30000000-0000-0000-0000-000000000002',
   'Infantil B Central', 'Infantil',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000006',
   NULL),

  ('30000000-0000-0000-0000-000000000003',
   'Alevín C Central', 'Alevín',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000005',
   NULL),

  -- Sede Norte
  ('30000000-0000-0000-0000-000000000004',
   'Cadete A Norte', 'Cadete',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000007',
   '20000000-0000-0000-0000-000000000008'),

  ('30000000-0000-0000-0000-000000000005',
   'Infantil A Norte', 'Infantil',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000008',
   NULL),

  ('30000000-0000-0000-0000-000000000006',
   'Benjamín B Norte', 'Benjamín',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000007',
   NULL),

  -- Sede Sur
  ('30000000-0000-0000-0000-000000000007',
   'Cadete B Sur', 'Cadete',
   '10000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000009',
   '20000000-0000-0000-0000-000000000010'),

  ('30000000-0000-0000-0000-000000000008',
   'Alevín A Sur', 'Alevín',
   '10000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000010',
   NULL)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 4. EJERCICIOS
-- ─────────────────────────────────────────────
INSERT INTO ejercicios (
  id, titulo, descripcion_detallada, objetivo_principal, objetivos_secundarios,
  contenido_tactico, contenido_tecnico, contenido_fisico,
  dimensiones_campo, numero_jugadores_min, material_necesario,
  sede_propietaria_id, es_global, workspace_id
)
VALUES
  -- Global (disponible en todo el workspace)
  ('40000000-0000-0000-0000-000000000001',
   'Rondo 4v2 clásico',
   'Cuatro jugadores en el exterior intentan mantener la posesión frente a dos defensores en el interior. Se intercambia al jugador que pierde el balón.',
   'Toma de decisiones',
   ARRAY['Mejora técnica', 'Transiciones'],
   'Superioridad numérica, presión tras pérdida',
   'Pase en corto, control orientado, pase entre líneas',
   'Cambio de ritmo, sprints cortos',
   '10x10 metros', 6,
   ARRAY['Balones', 'Conos', 'Petos'],
   NULL, true, '00000000-0000-0000-0000-000000000001'),

  ('40000000-0000-0000-0000-000000000002',
   'Posesión 5v5+2 comodines',
   'Dos equipos de 5 jugadores más 2 comodines que siempre juegan con el equipo en posesión. Objetivo: conservar el balón y progresar.',
   'Toma de decisiones',
   ARRAY['Transiciones', 'Finalización'],
   'Juego en apoyo, basculación defensiva, pressing organizado',
   'Control, pase al hueco, recepción dinámica',
   'Resistencia aeróbica, intensidad media-alta',
   '30x20 metros', 12,
   ARRAY['Balones', 'Petos', 'Conos'],
   NULL, true, '00000000-0000-0000-0000-000000000001'),

  ('40000000-0000-0000-0000-000000000003',
   'Finalización 3v2 con portería',
   'Tres atacantes contra dos defensores más portero. Los atacantes salen desde el medio campo y deben superar a los defensores para finalizar.',
   'Finalización',
   ARRAY['Toma de decisiones', 'Mejora técnica'],
   'Triangulaciones en zona de finalización, centros y remates',
   'Conducción bajo presión, disparo a puerta, pase de gol',
   'Velocidad de reacción, sprint en profundidad',
   '40x25 metros', 6,
   ARRAY['Balones', 'Porterías', 'Conos'],
   NULL, true, '00000000-0000-0000-0000-000000000001'),

  ('40000000-0000-0000-0000-000000000004',
   'Circuito técnico con balón',
   'Circuito de habilidad individual: conducción con cambio de dirección, pase a la pared, regate y disparo. Cada jugador lo completa en 45 segundos.',
   'Mejora técnica',
   ARRAY[]::text[],
   NULL,
   'Conducción, golpeo, regate 1v1, pase',
   'Coordinación, agilidad, velocidad de ejecución',
   '20x15 metros', 1,
   ARRAY['Balones', 'Conos', 'Petos'],
   NULL, true, '00000000-0000-0000-0000-000000000001'),

  -- Exclusivo Sede Central
  ('40000000-0000-0000-0000-000000000005',
   'Salida de presión alta desde portería',
   'El portero inicia con balón en la mano. Los defensores centrales se abren y los laterales suben. Se busca superar la primera línea de presión rival mediante combinación.',
   'Mejora técnica',
   ARRAY['Toma de decisiones', 'Transiciones'],
   'Salida de balón estructurada, posicionamiento, movimientos de desmarque',
   'Pase largo, pase en corto bajo presión, control de primera',
   'Intensidad alta en transiciones',
   'Mitad del campo', 10,
   ARRAY['Balones', 'Petos', 'Conos'],
   '10000000-0000-0000-0000-000000000001', false, '00000000-0000-0000-0000-000000000001'),

  -- Exclusivo Sede Norte
  ('40000000-0000-0000-0000-000000000006',
   'Pressing en bloque bajo 4-4-2',
   'Ejercicio táctico para practicar el pressing colectivo desde un bloque bajo 4-4-2. El equipo defensor presiona al unísono al activarse una señal del entrenador.',
   'Transiciones',
   ARRAY['Toma de decisiones'],
   'Organización defensiva, líneas compactas, activación del pressing',
   NULL,
   'Trabajo anaeróbico, recuperación rápida',
   'Campo completo', 14,
   ARRAY['Balones', 'Petos'],
   '10000000-0000-0000-0000-000000000002', false, '00000000-0000-0000-0000-000000000001'),

  -- Exclusivo Sede Sur
  ('40000000-0000-0000-0000-000000000007',
   'Juego de posición en espacio reducido',
   'Cuatro equipos de 3 en cuatro cuadrantes. El balón circula por los cuadrantes siguiendo el orden marcado; cuando hay pérdida se reorganiza el equipo poseedor.',
   'Toma de decisiones',
   ARRAY['Mejora técnica', 'Transiciones'],
   'Cambio de orientación, circulación de balón, pressing zonal',
   'Pase entre líneas, control, orientación del cuerpo',
   'Cambios de ritmo, aceleración',
   '25x25 metros', 12,
   ARRAY['Balones', 'Conos', 'Petos'],
   '10000000-0000-0000-0000-000000000003', false, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 5. SESIONES
-- ─────────────────────────────────────────────
INSERT INTO sesiones (
  id, fecha, hora_inicio, duracion_estimada,
  equipo_id, entrenador_id,
  microciclo, periodo_temporada,
  objetivo_sesion, observaciones_previas, feedback_post_entreno, estado
)
VALUES
  -- Cadete A Central
  ('50000000-0000-0000-0000-000000000001',
   '2026-04-07', '18:00', 90,
   '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000005',
   15, 'Competición',
   'Trabajo de posesión y transición ofensiva',
   'Partido el sábado, mantener intensidad media',
   'Buena respuesta del grupo, ritmo alto en posesión',
   'Realizada'),

  ('50000000-0000-0000-0000-000000000002',
   '2026-04-10', '18:00', 85,
   '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000005',
   15, 'Competición',
   'Finalización y juego en último tercio',
   'Revisar fallos de la jornada anterior en ataque',
   NULL,
   'Planificada'),

  ('50000000-0000-0000-0000-000000000003',
   '2026-04-14', '18:00', 80,
   '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000005',
   16, 'Competición',
   'Sesión de recuperación y técnica individual',
   NULL, NULL,
   'Borrador'),

  -- Infantil B Central
  ('50000000-0000-0000-0000-000000000004',
   '2026-04-08', '17:00', 75,
   '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000006',
   15, 'Competición',
   'Habilidad técnica y juego reducido',
   NULL, 'Muy buena actitud, mejorar orientación del cuerpo al recibir',
   'Realizada'),

  ('50000000-0000-0000-0000-000000000005',
   '2026-04-11', '17:00', 75,
   '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000006',
   15, 'Competición',
   'Juego de posición y pressing',
   NULL, NULL,
   'Planificada'),

  -- Alevín C Central
  ('50000000-0000-0000-0000-000000000006',
   '2026-04-09', '16:30', 60,
   '30000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000005',
   15, 'Competición',
   'Rondos y circuito técnico',
   'Sesión lúdica, mezclar ejercicios con juegos',
   'Muy buena energía del grupo',
   'Realizada'),

  -- Cadete A Norte
  ('50000000-0000-0000-0000-000000000007',
   '2026-04-07', '19:00', 90,
   '30000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000007',
   15, 'Competición',
   'Bloque defensivo y transiciones',
   'Rival fuerte el fin de semana, reforzar defensa',
   'Pressing bien ejecutado, mejorar salida de balón',
   'Realizada'),

  ('50000000-0000-0000-0000-000000000008',
   '2026-04-09', '19:00', 80,
   '30000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000007',
   15, 'Competición',
   'Posesión y cambios de orientación',
   NULL, NULL,
   'Planificada'),

  -- Infantil A Norte
  ('50000000-0000-0000-0000-000000000009',
   '2026-04-08', '18:00', 70,
   '30000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000008',
   15, 'Pretemporada',
   'Introducción a la posesión organizada',
   'Primera semana del bloque táctico',
   'Costó entender el concepto de comodín',
   'Realizada'),

  -- Benjamín B Norte
  ('50000000-0000-0000-0000-000000000010',
   '2026-04-10', '17:30', 55,
   '30000000-0000-0000-0000-000000000006',
   '20000000-0000-0000-0000-000000000007',
   15, 'Competición',
   'Juego libre y circuito de habilidad',
   'Semana de carga baja',
   NULL,
   'Planificada'),

  -- Cadete B Sur
  ('50000000-0000-0000-0000-000000000011',
   '2026-04-07', '18:30', 90,
   '30000000-0000-0000-0000-000000000007',
   '20000000-0000-0000-0000-000000000009',
   15, 'Competición',
   'Sistema 4-3-3 en ataque',
   'Ensayar posiciones fijas del nuevo sistema',
   'Buen entendimiento, falta automatizar movimientos sin balón',
   'Realizada'),

  ('50000000-0000-0000-0000-000000000012',
   '2026-04-12', '18:30', 85,
   '30000000-0000-0000-0000-000000000007',
   '20000000-0000-0000-0000-000000000009',
   16, 'Competición',
   'Acciones a balón parado ofensivas',
   'Penalti y córner, ensayar jugadas ensayadas',
   NULL,
   'Borrador'),

  -- Alevín A Sur
  ('50000000-0000-0000-0000-000000000013',
   '2026-04-09', '17:00', 65,
   '30000000-0000-0000-0000-000000000008',
   '20000000-0000-0000-0000-000000000010',
   15, 'Competición',
   'Finalización con portero',
   NULL,
   'Muchos goles encajados, trabajar cobertura central',
   'Realizada')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 6. SESION_DETALLE (ejercicios por sesión)
-- ─────────────────────────────────────────────
INSERT INTO sesion_detalle (id, sesion_id, ejercicio_id, orden, tiempo_ejecucion, tiempo_descanso, variante_aplicada)
VALUES
  -- Sesión 1: Cadete A Central (Realizada)
  ('60000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004',
   1, 15, 3, 'Calentamiento con balón individual'),
  ('60000000-0000-0000-0000-000000000002',
   '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   2, 20, 5, 'Rondo 4v2 sin límite de toques'),
  ('60000000-0000-0000-0000-000000000003',
   '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002',
   3, 30, 5, 'Comodines fijos en banda'),
  ('60000000-0000-0000-0000-000000000004',
   '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005',
   4, 15, 2, NULL),

  -- Sesión 2: Cadete A Central (Planificada)
  ('60000000-0000-0000-0000-000000000005',
   '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000004',
   1, 12, 3, NULL),
  ('60000000-0000-0000-0000-000000000006',
   '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003',
   2, 25, 5, '3v2 con portero y dos zonas de finalización'),
  ('60000000-0000-0000-0000-000000000007',
   '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002',
   3, 25, 5, NULL),

  -- Sesión 4: Infantil B Central (Realizada)
  ('60000000-0000-0000-0000-000000000008',
   '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004',
   1, 15, 2, NULL),
  ('60000000-0000-0000-0000-000000000009',
   '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001',
   2, 20, 5, 'Rondo 4v2 con máximo 2 toques'),
  ('60000000-0000-0000-0000-000000000010',
   '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003',
   3, 20, 3, NULL),

  -- Sesión 6: Alevín C Central (Realizada)
  ('60000000-0000-0000-0000-000000000011',
   '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000004',
   1, 20, 2, NULL),
  ('60000000-0000-0000-0000-000000000012',
   '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001',
   2, 15, 3, NULL),

  -- Sesión 7: Cadete A Norte (Realizada)
  ('60000000-0000-0000-0000-000000000013',
   '50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000006',
   1, 30, 5, 'Pressing al primer toque del portero'),
  ('60000000-0000-0000-0000-000000000014',
   '50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000002',
   2, 25, 5, NULL),
  ('60000000-0000-0000-0000-000000000015',
   '50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000003',
   3, 20, 3, NULL),

  -- Sesión 9: Infantil A Norte (Realizada)
  ('60000000-0000-0000-0000-000000000016',
   '50000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000001',
   1, 20, 5, NULL),
  ('60000000-0000-0000-0000-000000000017',
   '50000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000002',
   2, 25, 5, 'Con comodines en zona central'),

  -- Sesión 11: Cadete B Sur (Realizada)
  ('60000000-0000-0000-0000-000000000018',
   '50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000007',
   1, 25, 5, NULL),
  ('60000000-0000-0000-0000-000000000019',
   '50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000002',
   2, 25, 5, NULL),
  ('60000000-0000-0000-0000-000000000020',
   '50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000003',
   3, 20, 3, NULL),

  -- Sesión 13: Alevín A Sur (Realizada)
  ('60000000-0000-0000-0000-000000000021',
   '50000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000004',
   1, 15, 2, NULL),
  ('60000000-0000-0000-0000-000000000022',
   '50000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000003',
   2, 25, 3, '2v1 con portero pequeño')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 7. DOCUMENTOS
-- ─────────────────────────────────────────────
INSERT INTO documentos (id, titulo, categoria_doc, drive_file_id, permisos_roles, sede_id)
VALUES
  -- Sede Central
  ('70000000-0000-0000-0000-000000000001',
   'Reglamento interno del club', 'Normativa', NULL,
   '["SuperAdmin","AdminSede","Entrenador"]'::jsonb,
   '10000000-0000-0000-0000-000000000001'),

  ('70000000-0000-0000-0000-000000000002',
   'Plantilla de asistencia semanal', 'Plantilla', NULL,
   '["SuperAdmin","AdminSede","Entrenador"]'::jsonb,
   '10000000-0000-0000-0000-000000000001'),

  ('70000000-0000-0000-0000-000000000003',
   'Protocolo de actuación ante lesión', 'Normativa', NULL,
   '["SuperAdmin","AdminSede","Entrenador"]'::jsonb,
   '10000000-0000-0000-0000-000000000001'),

  ('70000000-0000-0000-0000-000000000004',
   'Consentimiento de imagen menores', 'Legal', NULL,
   '["SuperAdmin","AdminSede"]'::jsonb,
   '10000000-0000-0000-0000-000000000001'),

  -- Sede Norte
  ('70000000-0000-0000-0000-000000000005',
   'Calendario de competición 2025-2026', 'Planificación', NULL,
   '["SuperAdmin","AdminSede","Entrenador"]'::jsonb,
   '10000000-0000-0000-0000-000000000002'),

  ('70000000-0000-0000-0000-000000000006',
   'Normas de uso de las instalaciones', 'Normativa', NULL,
   '["SuperAdmin","AdminSede","Entrenador"]'::jsonb,
   '10000000-0000-0000-0000-000000000002'),

  ('70000000-0000-0000-0000-000000000007',
   'Ficha médica jugadores categoría cadete', 'Médico', NULL,
   '["SuperAdmin","AdminSede"]'::jsonb,
   '10000000-0000-0000-0000-000000000002'),

  -- Sede Sur
  ('70000000-0000-0000-0000-000000000008',
   'Plan de pretemporada 2026', 'Planificación', NULL,
   '["SuperAdmin","AdminSede","Entrenador"]'::jsonb,
   '10000000-0000-0000-0000-000000000003'),

  ('70000000-0000-0000-0000-000000000009',
   'Checklist partido día de competición', 'Plantilla', NULL,
   '["SuperAdmin","AdminSede","Entrenador"]'::jsonb,
   '10000000-0000-0000-0000-000000000003'),

  ('70000000-0000-0000-0000-000000000010',
   'Análisis táctico rival jornada 15', 'Análisis', NULL,
   '["SuperAdmin","AdminSede","Entrenador"]'::jsonb,
   '10000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 8. PARAMETROS_SISTEMA (categorías adicionales)
-- ─────────────────────────────────────────────
INSERT INTO parametros_sistema (categoria, nombre, activo, sede_id, workspace_id)
VALUES
  -- Tipo de objetivo (workspace-wide)
  ('tipo_objetivo', 'Juego de posición', true, NULL, '00000000-0000-0000-0000-000000000001'),
  ('tipo_objetivo', 'Presión tras pérdida', true, NULL, '00000000-0000-0000-0000-000000000001'),
  ('tipo_objetivo', 'Acciones a balón parado', true, NULL, '00000000-0000-0000-0000-000000000001'),
  ('tipo_objetivo', 'Velocidad y potencia', true, NULL, '00000000-0000-0000-0000-000000000001'),

  -- Material adicional
  ('material', 'Vallas de coordinación', true, NULL, '00000000-0000-0000-0000-000000000001'),
  ('material', 'Escaleras de agilidad', true, NULL, '00000000-0000-0000-0000-000000000001'),
  ('material', 'Bandas elásticas', true, NULL, '00000000-0000-0000-0000-000000000001'),
  ('material', 'Porterías pequeñas', true, NULL, '00000000-0000-0000-0000-000000000001'),

  -- Categorías de edad adicionales
  ('categoria_edad', 'Prebenjamín', true, NULL, '00000000-0000-0000-0000-000000000001'),
  ('categoria_edad', 'Juvenil', true, NULL, '00000000-0000-0000-0000-000000000001'),
  ('categoria_edad', 'Senior', true, NULL, '00000000-0000-0000-0000-000000000001'),

  -- Parámetros específicos de Sede Central
  ('tipo_objetivo', 'Salida desde portería', true,
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001'),

  -- Parámetros específicos de Sede Norte
  ('tipo_objetivo', 'Presión alta organizada', true,
   '10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001')
ON CONFLICT (categoria, nombre, sede_id) DO NOTHING;

COMMIT;

-- =============================================================
-- VERIFICACIÓN (ejecutar después del seed para confirmar datos)
-- =============================================================
-- SELECT 'workspaces'  AS tabla, count(*) FROM workspaces  WHERE id = '00000000-0000-0000-0000-000000000001'
-- UNION ALL SELECT 'sedes',       count(*) FROM sedes       WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
-- UNION ALL SELECT 'usuarios',    count(*) FROM usuarios
-- UNION ALL SELECT 'equipos',     count(*) FROM equipos
-- UNION ALL SELECT 'ejercicios',  count(*) FROM ejercicios  WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
-- UNION ALL SELECT 'sesiones',    count(*) FROM sesiones
-- UNION ALL SELECT 'sesion_detalle', count(*) FROM sesion_detalle
-- UNION ALL SELECT 'documentos',  count(*) FROM documentos
-- UNION ALL SELECT 'parametros',  count(*) FROM parametros_sistema WHERE workspace_id = '00000000-0000-0000-0000-000000000001';
