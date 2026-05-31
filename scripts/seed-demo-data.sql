-- ============================================================
-- SEED DEMO DATA para workspace "liones der"
-- workspace_id : 4b92a025-6074-4550-bba4-6706cfea9b24
-- sede canarias: 2147d568-8247-4fda-aaab-17b00d6d3099
-- sede otra    : 601d2f5d-b48e-49d7-96ab-861d74d7b8d2
-- user_id      : 5f980418-23dd-4742-8bee-9f296735f564
-- ============================================================

-- ── EQUIPOS ──────────────────────────────────────────────────
INSERT INTO public.equipos (id, nombre, categoria, sede_id, created_at, updated_at) VALUES
  -- sede canarias (ya existe grupo 1, añadir más)
  ('a1000001-0000-0000-0000-000000000001', 'Alevines A',    'Alevines', '2147d568-8247-4fda-aaab-17b00d6d3099', now(), now()),
  ('a1000001-0000-0000-0000-000000000002', 'Infantil B',    'Infantil',  '2147d568-8247-4fda-aaab-17b00d6d3099', now(), now()),
  ('a1000001-0000-0000-0000-000000000003', 'Cadete A',      'Cadete',    '2147d568-8247-4fda-aaab-17b00d6d3099', now(), now()),
  ('a1000001-0000-0000-0000-000000000004', 'Juvenil Norte', 'Juvenil',   '2147d568-8247-4fda-aaab-17b00d6d3099', now(), now()),
  -- sede otra sede
  ('a1000001-0000-0000-0000-000000000005', 'Prebenjamín C', 'Prebenjamín','601d2f5d-b48e-49d7-96ab-861d74d7b8d2', now(), now()),
  ('a1000001-0000-0000-0000-000000000006', 'Benjamín A',    'Benjamín',  '601d2f5d-b48e-49d7-96ab-861d74d7b8d2', now(), now()),
  ('a1000001-0000-0000-0000-000000000007', 'Fútbol Sala Senior','Senior', '601d2f5d-b48e-49d7-96ab-861d74d7b8d2', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── PARÁMETROS DEL SISTEMA ────────────────────────────────────
INSERT INTO public.parametros_sistema (id, categoria, nombre, activo, sede_id, workspace_id, created_at) VALUES
  -- Periodos de temporada
  ('b2000001-0000-0000-0000-000000000001', 'periodo_temporada', 'Pretemporada',          true, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  ('b2000001-0000-0000-0000-000000000002', 'periodo_temporada', 'Preparación física',    true, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  ('b2000001-0000-0000-0000-000000000003', 'periodo_temporada', 'Competición',           true, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  ('b2000001-0000-0000-0000-000000000004', 'periodo_temporada', 'Recuperación',          true, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  -- Objetivos de sesión
  ('b2000001-0000-0000-0000-000000000005', 'objetivo_sesion',   'Técnica individual',    true, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  ('b2000001-0000-0000-0000-000000000006', 'objetivo_sesion',   'Táctica ofensiva',      true, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  ('b2000001-0000-0000-0000-000000000007', 'objetivo_sesion',   'Táctica defensiva',     true, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  ('b2000001-0000-0000-0000-000000000008', 'objetivo_sesion',   'Físico - resistencia',  true, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  ('b2000001-0000-0000-0000-000000000009', 'objetivo_sesion',   'Rondos y posesión',     true, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  -- Mismos para otra sede
  ('b2000001-0000-0000-0000-000000000010', 'periodo_temporada', 'Competición',           true, '601d2f5d-b48e-49d7-96ab-861d74d7b8d2', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  ('b2000001-0000-0000-0000-000000000011', 'objetivo_sesion',   'Técnica individual',    true, '601d2f5d-b48e-49d7-96ab-861d74d7b8d2', '4b92a025-6074-4550-bba4-6706cfea9b24', now()),
  ('b2000001-0000-0000-0000-000000000012', 'objetivo_sesion',   'Juego en superioridad', true, '601d2f5d-b48e-49d7-96ab-861d74d7b8d2', '4b92a025-6074-4550-bba4-6706cfea9b24', now())
ON CONFLICT (id) DO NOTHING;

-- ── EJERCICIOS ───────────────────────────────────────────────
INSERT INTO public.ejercicios (id, titulo, descripcion_detallada, objetivo_principal, contenido_tecnico, contenido_tactico, contenido_fisico, numero_jugadores_min, sede_propietaria_id, workspace_id, es_global, created_at, updated_at) VALUES
  ('c3000001-0000-0000-0000-000000000001',
   'Rondo 4x1 básico',
   'Cuatro jugadores en círculo mantienen posesión contra un defensor central. Énfasis en el primer toque y orientación corporal.',
   'Mantener posesión bajo presión',
   'Control orientado, pase al hueco',
   'Apoyos, líneas de pase, presión',
   'Velocidad de reacción, explosividad',
   5, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', false, now(), now()),

  ('c3000001-0000-0000-0000-000000000002',
   'Circuito de conducción con cambio de dirección',
   'Los jugadores conducen el balón sorteando conos con cambios de dirección a ritmo creciente.',
   'Dominio del balón en conducción',
   'Conducción interior/exterior, dribles básicos',
   null,
   'Agilidad, coordinación',
   8, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', false, now(), now()),

  ('c3000001-0000-0000-0000-000000000003',
   'Pressing coordinado 4-4',
   'Bloque de 4 jugadores aplica pressing organizado sobre el equipo contrario en su propio campo.',
   'Recuperación rápida del balón',
   null,
   'Líneas de pressing, coberturas, basculación',
   'Resistencia anaeróbica láctica',
   8, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', false, now(), now()),

  ('c3000001-0000-0000-0000-000000000004',
   'Juego de posición 5x5 + 2 comodines',
   'Dos equipos de 5 jugadores más 2 comodines que juegan siempre con el equipo en posesión.',
   'Superioridad numérica y control del juego',
   'Pase y desmarque',
   'Triángulos, apoyos interiores/exteriores',
   'Resistencia aeróbica, sprints cortos',
   12, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', false, now(), now()),

  ('c3000001-0000-0000-0000-000000000005',
   'Finalización tras centro lateral',
   'Atacante recibe centro desde banda y remata a puerta. Variantes: primer toque, ajuste de pie contrario.',
   'Eficacia en el remate',
   'Remate de cabeza, de volea, primer toque',
   'Timing de llegada al área',
   null,
   6, '601d2f5d-b48e-49d7-96ab-861d74d7b8d2', '4b92a025-6074-4550-bba4-6706cfea9b24', false, now(), now()),

  ('c3000001-0000-0000-0000-000000000006',
   'Salida de balón desde portero 3-2',
   'El portero inicia la jugada con los centrales y mediocentros formando un triángulo de salida ante la presión rival.',
   'Construcción desde atrás',
   'Control, pase al pie',
   'Romper líneas, salida por dentro o por fuera',
   null,
   8, '601d2f5d-b48e-49d7-96ab-861d74d7b8d2', '4b92a025-6074-4550-bba4-6706cfea9b24', false, now(), now()),

  ('c3000001-0000-0000-0000-000000000007',
   'Defensa en bloque bajo 4-4-2',
   'Dos líneas de 4+2 defienden el espacio entre líneas, trabajo de coberturas y permutas.',
   'Solidez defensiva organizada',
   null,
   'Bloque defensivo, basculación, achique',
   'Resistencia, velocidad de desplazamiento lateral',
   11, '2147d568-8247-4fda-aaab-17b00d6d3099', '4b92a025-6074-4550-bba4-6706cfea9b24', false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── SESIONES ─────────────────────────────────────────────────
INSERT INTO public.sesiones (id, fecha, hora_inicio, duracion_estimada, equipo_id, entrenador_id, microciclo, periodo_temporada, objetivo_sesion, estado, created_at, updated_at) VALUES
  -- Alevines A - canarias (completadas)
  ('d4000001-0000-0000-0000-000000000001', '2026-05-05', '10:00', 90,
   'a1000001-0000-0000-0000-000000000001', '5f980418-23dd-4742-8bee-9f296735f564',
   1, 'Pretemporada', 'Técnica individual', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000002', '2026-05-07', '10:00', 90,
   'a1000001-0000-0000-0000-000000000001', '5f980418-23dd-4742-8bee-9f296735f564',
   1, 'Pretemporada', 'Físico - resistencia', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000003', '2026-05-10', '10:30', 90,
   'a1000001-0000-0000-0000-000000000001', '5f980418-23dd-4742-8bee-9f296735f564',
   2, 'Competición', 'Táctica ofensiva', 'Realizada', now(), now()),

  -- Infantil B - canarias (mix completadas + planificadas)
  ('d4000001-0000-0000-0000-000000000004', '2026-05-06', '17:00', 75,
   'a1000001-0000-0000-0000-000000000002', '5f980418-23dd-4742-8bee-9f296735f564',
   1, 'Competición', 'Rondos y posesión', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000005', '2026-05-13', '17:00', 75,
   'a1000001-0000-0000-0000-000000000002', '5f980418-23dd-4742-8bee-9f296735f564',
   2, 'Competición', 'Táctica defensiva', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000006', '2026-05-20', '17:00', 75,
   'a1000001-0000-0000-0000-000000000002', '5f980418-23dd-4742-8bee-9f296735f564',
   3, 'Competición', 'Táctica ofensiva', 'Planificada', now(), now()),

  -- Cadete A - canarias
  ('d4000001-0000-0000-0000-000000000007', '2026-05-08', '19:00', 100,
   'a1000001-0000-0000-0000-000000000003', '5f980418-23dd-4742-8bee-9f296735f564',
   1, 'Competición', 'Táctica ofensiva', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000008', '2026-05-15', '19:00', 100,
   'a1000001-0000-0000-0000-000000000003', '5f980418-23dd-4742-8bee-9f296735f564',
   2, 'Competición', 'Táctica defensiva', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000009', '2026-05-22', '19:00', 100,
   'a1000001-0000-0000-0000-000000000003', '5f980418-23dd-4742-8bee-9f296735f564',
   3, 'Competición', 'Rondos y posesión', 'Planificada', now(), now()),

  -- Juvenil Norte - canarias
  ('d4000001-0000-0000-0000-000000000010', '2026-05-09', '20:00', 105,
   'a1000001-0000-0000-0000-000000000004', '5f980418-23dd-4742-8bee-9f296735f564',
   1, 'Competición', 'Pressing coordinado', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000011', '2026-05-16', '20:00', 105,
   'a1000001-0000-0000-0000-000000000004', '5f980418-23dd-4742-8bee-9f296735f564',
   2, 'Competición', 'Táctica ofensiva', 'Borrador', now(), now()),

  -- Benjamín A - otra sede
  ('d4000001-0000-0000-0000-000000000012', '2026-05-07', '09:30', 60,
   'a1000001-0000-0000-0000-000000000006', '5f980418-23dd-4742-8bee-9f296735f564',
   1, 'Competición', 'Técnica individual', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000013', '2026-05-14', '09:30', 60,
   'a1000001-0000-0000-0000-000000000006', '5f980418-23dd-4742-8bee-9f296735f564',
   2, 'Competición', 'Técnica individual', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000014', '2026-05-21', '09:30', 60,
   'a1000001-0000-0000-0000-000000000006', '5f980418-23dd-4742-8bee-9f296735f564',
   3, 'Competición', 'Juego en superioridad', 'Planificada', now(), now()),

  -- Fútbol Sala Senior - otra sede
  ('d4000001-0000-0000-0000-000000000015', '2026-05-11', '21:00', 90,
   'a1000001-0000-0000-0000-000000000007', '5f980418-23dd-4742-8bee-9f296735f564',
   1, 'Competición', 'Táctica ofensiva', 'Realizada', now(), now()),

  ('d4000001-0000-0000-0000-000000000016', '2026-05-18', '21:00', 90,
   'a1000001-0000-0000-0000-000000000007', '5f980418-23dd-4742-8bee-9f296735f564',
   2, 'Competición', 'Táctica defensiva', 'Planificada', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── DETALLES DE SESIÓN (ejercicios en cada sesión) ────────────
INSERT INTO public.sesion_detalle (id, sesion_id, ejercicio_id, orden, tiempo_ejecucion, tiempo_descanso) VALUES
  -- Sesión 1: Alevines A - técnica individual
  ('e5000001-0000-0000-0000-000000000001', 'd4000001-0000-0000-0000-000000000001', 'c3000001-0000-0000-0000-000000000002', 1, 20, 5),
  ('e5000001-0000-0000-0000-000000000002', 'd4000001-0000-0000-0000-000000000001', 'c3000001-0000-0000-0000-000000000001', 2, 25, 5),
  ('e5000001-0000-0000-0000-000000000003', 'd4000001-0000-0000-0000-000000000001', 'c3000001-0000-0000-0000-000000000004', 3, 30, 10),

  -- Sesión 3: Alevines A - táctica ofensiva
  ('e5000001-0000-0000-0000-000000000004', 'd4000001-0000-0000-0000-000000000003', 'c3000001-0000-0000-0000-000000000001', 1, 20, 5),
  ('e5000001-0000-0000-0000-000000000005', 'd4000001-0000-0000-0000-000000000003', 'c3000001-0000-0000-0000-000000000004', 2, 35, 5),
  ('e5000001-0000-0000-0000-000000000006', 'd4000001-0000-0000-0000-000000000003', 'c3000001-0000-0000-0000-000000000005', 3, 20, 10),

  -- Sesión 4: Infantil B - rondos
  ('e5000001-0000-0000-0000-000000000007', 'd4000001-0000-0000-0000-000000000004', 'c3000001-0000-0000-0000-000000000001', 1, 20, 5),
  ('e5000001-0000-0000-0000-000000000008', 'd4000001-0000-0000-0000-000000000004', 'c3000001-0000-0000-0000-000000000004', 2, 30, 5),

  -- Sesión 7: Cadete A - táctica ofensiva
  ('e5000001-0000-0000-0000-000000000009', 'd4000001-0000-0000-0000-000000000007', 'c3000001-0000-0000-0000-000000000006', 1, 20, 5),
  ('e5000001-0000-0000-0000-000000000010', 'd4000001-0000-0000-0000-000000000007', 'c3000001-0000-0000-0000-000000000004', 2, 35, 5),
  ('e5000001-0000-0000-0000-000000000011', 'd4000001-0000-0000-0000-000000000007', 'c3000001-0000-0000-0000-000000000005', 3, 25, 10),

  -- Sesión 8: Cadete A - táctica defensiva
  ('e5000001-0000-0000-0000-000000000012', 'd4000001-0000-0000-0000-000000000008', 'c3000001-0000-0000-0000-000000000003', 1, 30, 5),
  ('e5000001-0000-0000-0000-000000000013', 'd4000001-0000-0000-0000-000000000008', 'c3000001-0000-0000-0000-000000000007', 2, 40, 10),

  -- Sesión 10: Juvenil Norte
  ('e5000001-0000-0000-0000-000000000014', 'd4000001-0000-0000-0000-000000000010', 'c3000001-0000-0000-0000-000000000003', 1, 25, 5),
  ('e5000001-0000-0000-0000-000000000015', 'd4000001-0000-0000-0000-000000000010', 'c3000001-0000-0000-0000-000000000007', 2, 35, 5),
  ('e5000001-0000-0000-0000-000000000016', 'd4000001-0000-0000-0000-000000000010', 'c3000001-0000-0000-0000-000000000004', 3, 30, 10),

  -- Sesión 15: Fútbol Sala Senior
  ('e5000001-0000-0000-0000-000000000017', 'd4000001-0000-0000-0000-000000000015', 'c3000001-0000-0000-0000-000000000006', 1, 15, 5),
  ('e5000001-0000-0000-0000-000000000018', 'd4000001-0000-0000-0000-000000000015', 'c3000001-0000-0000-0000-000000000004', 2, 30, 5),
  ('e5000001-0000-0000-0000-000000000019', 'd4000001-0000-0000-0000-000000000015', 'c3000001-0000-0000-0000-000000000005', 3, 25, 10)
ON CONFLICT (id) DO NOTHING;
