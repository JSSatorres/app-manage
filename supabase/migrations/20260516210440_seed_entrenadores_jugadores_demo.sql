-- ============================================================
-- SEED demo: entrenadores y jugadores para el AdminSede
--   juansataz.dev@gmail.com (id: 5f980418-23dd-4742-8bee-9f296735f564)
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_user_id        uuid := '5f980418-23dd-4742-8bee-9f296735f564';
    v_workspace_id   uuid;
    v_sede_a         uuid;
    v_sede_b         uuid;
    v_equipo_a1      uuid;
    v_equipo_a2      uuid;
    v_equipo_b1      uuid;
    v_e1 uuid := '11111111-aaaa-4aaa-aaaa-000000000001';
    v_e2 uuid := '11111111-aaaa-4aaa-aaaa-000000000002';
    v_e3 uuid := '11111111-aaaa-4aaa-aaaa-000000000003';
    v_e4 uuid := '11111111-aaaa-4aaa-aaaa-000000000004';
    v_e5 uuid := '11111111-aaaa-4aaa-aaaa-000000000005';
    v_j1 uuid := '22222222-bbbb-4bbb-bbbb-000000000001';
    v_j2 uuid := '22222222-bbbb-4bbb-bbbb-000000000002';
    v_j3 uuid := '22222222-bbbb-4bbb-bbbb-000000000003';
    v_j4 uuid := '22222222-bbbb-4bbb-bbbb-000000000004';
    v_j5 uuid := '22222222-bbbb-4bbb-bbbb-000000000005';
    v_j6 uuid := '22222222-bbbb-4bbb-bbbb-000000000006';
    v_j7 uuid := '22222222-bbbb-4bbb-bbbb-000000000007';
    v_j8 uuid := '22222222-bbbb-4bbb-bbbb-000000000008';
    v_j9 uuid := '22222222-bbbb-4bbb-bbbb-000000000009';
    v_j10 uuid := '22222222-bbbb-4bbb-bbbb-000000000010';
BEGIN
    -- Resolver workspace del usuario (modelo workspaces activo en remoto)
    SELECT wm.workspace_id INTO v_workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = v_user_id
    ORDER BY wm.created_at LIMIT 1;

    -- Resolver sede "canarias" dentro de ese workspace
    IF v_workspace_id IS NOT NULL THEN
        SELECT id INTO v_sede_a FROM public.sedes
        WHERE workspace_id = v_workspace_id AND lower(nombre) LIKE '%canarias%'
        ORDER BY created_at LIMIT 1;

        IF v_sede_a IS NULL THEN
            SELECT id INTO v_sede_a FROM public.sedes
            WHERE workspace_id = v_workspace_id
            ORDER BY created_at LIMIT 1;
        END IF;
    END IF;

    -- Fallback: usar sede_id de usuarios si existe
    IF v_sede_a IS NULL THEN
        SELECT sede_id INTO v_sede_a FROM public.usuarios WHERE id = v_user_id;
    END IF;

    -- Si aún no hay workspace, abortar avisando
    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'El usuario % no tiene workspace asignado', v_user_id;
    END IF;

    -- Crear sede A si no existe
    IF v_sede_a IS NULL THEN
        INSERT INTO public.sedes (nombre, direccion, responsable_id, workspace_id)
        VALUES ('Sede Canarias (demo)', 'Las Palmas', v_user_id, v_workspace_id)
        RETURNING id INTO v_sede_a;
    END IF;

    UPDATE public.usuarios SET sede_id = v_sede_a WHERE id = v_user_id AND sede_id IS NULL;

    -- Segunda sede demo para mostrar N:M
    SELECT id INTO v_sede_b FROM public.sedes
    WHERE nombre = 'Sede Norte (demo)' AND workspace_id = v_workspace_id LIMIT 1;
    IF v_sede_b IS NULL THEN
        INSERT INTO public.sedes (nombre, direccion, responsable_id, workspace_id)
        VALUES ('Sede Norte (demo)', 'Madrid Norte', v_user_id, v_workspace_id)
        RETURNING id INTO v_sede_b;
    END IF;

    -- Equipos
    SELECT id INTO v_equipo_a1 FROM public.equipos WHERE sede_id = v_sede_a AND nombre = 'Senior A (demo)' LIMIT 1;
    IF v_equipo_a1 IS NULL THEN
        INSERT INTO public.equipos (nombre, categoria, sede_id)
        VALUES ('Senior A (demo)', 'Senior', v_sede_a)
        RETURNING id INTO v_equipo_a1;
    END IF;

    SELECT id INTO v_equipo_a2 FROM public.equipos WHERE sede_id = v_sede_a AND nombre = 'Juvenil B (demo)' LIMIT 1;
    IF v_equipo_a2 IS NULL THEN
        INSERT INTO public.equipos (nombre, categoria, sede_id)
        VALUES ('Juvenil B (demo)', 'Juvenil', v_sede_a)
        RETURNING id INTO v_equipo_a2;
    END IF;

    SELECT id INTO v_equipo_b1 FROM public.equipos WHERE sede_id = v_sede_b AND nombre = 'Senior Norte (demo)' LIMIT 1;
    IF v_equipo_b1 IS NULL THEN
        INSERT INTO public.equipos (nombre, categoria, sede_id)
        VALUES ('Senior Norte (demo)', 'Senior', v_sede_b)
        RETURNING id INTO v_equipo_b1;
    END IF;

    -- ENTRENADORES
    INSERT INTO public.entrenadores (id, nombre, apellidos, email, telefono, titulacion, notas)
    VALUES
      (v_e1, 'Carlos',  'García López',     'carlos.garcia@demo.com',  '+34 600 111 001', 'UEFA Pro',   'Entrenador principal Senior'),
      (v_e2, 'Marta',   'Fernández Ruiz',   'marta.fernandez@demo.com','+34 600 111 002', 'UEFA A',     'Especialista en preparación física'),
      (v_e3, 'Javier',  'Martín Soler',     'javier.martin@demo.com',  '+34 600 111 003', 'UEFA B',     'Entrenador adjunto'),
      (v_e4, 'Lucía',   'Pérez Domínguez',  'lucia.perez@demo.com',    '+34 600 111 004', 'Monitor',    'Categorías inferiores'),
      (v_e5, 'Andrés',  'Sánchez Vidal',    'andres.sanchez@demo.com', '+34 600 111 005', 'UEFA A',     'Itinera entre sedes')
    ON CONFLICT (id) DO UPDATE
      SET nombre = EXCLUDED.nombre,
          apellidos = EXCLUDED.apellidos,
          email = EXCLUDED.email,
          telefono = EXCLUDED.telefono,
          titulacion = EXCLUDED.titulacion,
          notas = EXCLUDED.notas;

    DELETE FROM public.entrenador_sedes WHERE entrenador_id IN (v_e1,v_e2,v_e3,v_e4,v_e5);
    INSERT INTO public.entrenador_sedes (entrenador_id, sede_id, rol) VALUES
      (v_e1, v_sede_a, 'Principal'),
      (v_e2, v_sede_a, 'Preparador'),
      (v_e3, v_sede_a, 'Adjunto'),
      (v_e4, v_sede_a, 'Entrenador'),
      (v_e5, v_sede_a, 'Entrenador'),
      (v_e1, v_sede_b, 'Entrenador'),
      (v_e5, v_sede_b, 'Principal');

    DELETE FROM public.entrenador_equipos WHERE entrenador_id IN (v_e1,v_e2,v_e3,v_e4,v_e5);
    INSERT INTO public.entrenador_equipos (entrenador_id, equipo_id, rol) VALUES
      (v_e1, v_equipo_a1, 'Principal'),
      (v_e2, v_equipo_a1, 'Preparador'),
      (v_e3, v_equipo_a1, 'Adjunto'),
      (v_e4, v_equipo_a2, 'Principal'),
      (v_e5, v_equipo_a2, 'Adjunto'),
      (v_e1, v_equipo_b1, 'Principal'),
      (v_e5, v_equipo_b1, 'Entrenador');

    -- JUGADORES
    INSERT INTO public.jugadores (id, nombre, apellidos, email, telefono, dorsal, posicion, pie_dominante, notas)
    VALUES
      (v_j1,  'Iker',   'Romero Castro',    'iker.romero@demo.com',    '+34 600 222 001',  1, 'Portero',       'Diestro',     'Capitán'),
      (v_j2,  'Diego',  'Vega Moreno',      'diego.vega@demo.com',     '+34 600 222 002',  4, 'Defensa',       'Diestro',     NULL),
      (v_j3,  'Pablo',  'Núñez Torres',     'pablo.nunez@demo.com',    '+34 600 222 003',  5, 'Defensa',       'Zurdo',       NULL),
      (v_j4,  'Hugo',   'Cano Iglesias',    'hugo.cano@demo.com',      '+34 600 222 004',  8, 'Centrocampista','Diestro',     'Polivalente'),
      (v_j5,  'Adrián', 'Ortega Herrera',   'adrian.ortega@demo.com',  '+34 600 222 005', 10, 'Centrocampista','Ambidiestro', NULL),
      (v_j6,  'Mario',  'Reyes Aguilar',    'mario.reyes@demo.com',    '+34 600 222 006',  7, 'Extremo',       'Zurdo',       NULL),
      (v_j7,  'Álex',   'Gil Serrano',      'alex.gil@demo.com',       '+34 600 222 007',  9, 'Delantero',     'Diestro',     'Goleador'),
      (v_j8,  'Bruno',  'Carrasco Méndez',  'bruno.carrasco@demo.com', '+34 600 222 008', 11, 'Delantero',     'Diestro',     NULL),
      (v_j9,  'Marc',   'Lara Bravo',       'marc.lara@demo.com',      '+34 600 222 009', 14, 'Centrocampista','Zurdo',       NULL),
      (v_j10, 'Nico',   'Bermúdez Pinto',   'nico.bermudez@demo.com',  '+34 600 222 010', 21, 'Defensa',       'Diestro',     'Juvenil promoción')
    ON CONFLICT (id) DO UPDATE
      SET nombre = EXCLUDED.nombre,
          apellidos = EXCLUDED.apellidos,
          email = EXCLUDED.email,
          telefono = EXCLUDED.telefono,
          dorsal = EXCLUDED.dorsal,
          posicion = EXCLUDED.posicion,
          pie_dominante = EXCLUDED.pie_dominante,
          notas = EXCLUDED.notas;

    DELETE FROM public.jugador_sedes WHERE jugador_id IN (v_j1,v_j2,v_j3,v_j4,v_j5,v_j6,v_j7,v_j8,v_j9,v_j10);
    INSERT INTO public.jugador_sedes (jugador_id, sede_id) VALUES
      (v_j1, v_sede_a), (v_j2, v_sede_a), (v_j3, v_sede_a), (v_j4, v_sede_a),
      (v_j5, v_sede_a), (v_j6, v_sede_a), (v_j7, v_sede_a), (v_j8, v_sede_a),
      (v_j9, v_sede_a), (v_j10, v_sede_a),
      (v_j1, v_sede_b), (v_j4, v_sede_b), (v_j7, v_sede_b), (v_j10, v_sede_b);

    DELETE FROM public.jugador_equipos WHERE jugador_id IN (v_j1,v_j2,v_j3,v_j4,v_j5,v_j6,v_j7,v_j8,v_j9,v_j10);
    INSERT INTO public.jugador_equipos (jugador_id, equipo_id, dorsal, posicion) VALUES
      (v_j1, v_equipo_a1,  1, 'Portero'),
      (v_j2, v_equipo_a1,  4, 'Defensa'),
      (v_j3, v_equipo_a1,  5, 'Defensa'),
      (v_j4, v_equipo_a1,  8, 'Centrocampista'),
      (v_j5, v_equipo_a1, 10, 'Centrocampista'),
      (v_j6, v_equipo_a2,  7, 'Extremo'),
      (v_j7, v_equipo_a2,  9, 'Delantero'),
      (v_j8, v_equipo_a2, 11, 'Delantero'),
      (v_j9, v_equipo_a2, 14, 'Centrocampista'),
      (v_j10,v_equipo_a2, 21, 'Defensa'),
      (v_j4, v_equipo_a2, 18, 'Centrocampista'),
      (v_j7, v_equipo_a1,  9, 'Delantero'),
      (v_j1, v_equipo_b1,  1, 'Portero'),
      (v_j10,v_equipo_b1, 21, 'Defensa');

    RAISE NOTICE 'Seed OK. sede_a=% sede_b=%', v_sede_a, v_sede_b;
END $$;

COMMIT;
