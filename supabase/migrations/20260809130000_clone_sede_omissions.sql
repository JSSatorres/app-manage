-- Clonación selectiva y atómica de una sede dentro de su workspace.
-- Esta migración se prepara localmente; su aplicación requiere el gate del plan.

CREATE OR REPLACE FUNCTION public.clone_sede(
  p_workspace_id uuid,
  p_source_sede_id uuid,
  p_nombre text,
  p_direccion text,
  p_seleccion jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_source_sede public.sedes%ROWTYPE;
  v_destination_sede public.sedes%ROWTYPE;
  v_source_team public.equipos%ROWTYPE;
  v_source_session public.sesiones%ROWTYPE;
  v_source_team_id uuid;
  v_destination_team_id uuid;
  v_source_session_id uuid;
  v_destination_session_id uuid;
  v_key text;
  v_team_ids uuid[];
  v_trainer_ids uuid[];
  v_player_ids uuid[];
  v_session_ids uuid[];
  v_effective_session_ids uuid[];
  v_parameter_ids uuid[];
  v_document_ids uuid[];
  v_omitted_session_count integer := 0;
  v_omitted_trainer_team_count integer := 0;
  v_omitted_player_team_count integer := 0;
  v_team_mappings jsonb := '{}'::jsonb;
  v_session_mappings jsonb := '{}'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_workspace_id IS NULL OR p_source_sede_id IS NULL THEN
    RAISE EXCEPTION 'workspace and source sede are required';
  END IF;

  IF p_nombre IS NULL OR char_length(btrim(p_nombre)) = 0 THEN
    RAISE EXCEPTION 'destination sede name is required';
  END IF;

  SELECT wm.role
    INTO v_role
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = v_user_id
  LIMIT 1;

  IF v_role IS NULL
    OR v_role NOT IN ('superadmin', 'admin', 'gerente_sede') THEN
    RAISE EXCEPTION 'not authorized to clone sede';
  END IF;

  SELECT s.*
    INTO v_source_sede
  FROM public.sedes s
  WHERE s.id = p_source_sede_id
    AND s.workspace_id = p_workspace_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'source sede outside workspace';
  END IF;

  IF jsonb_typeof(p_seleccion) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'selection must be an object';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_seleccion) AS payload_key(key_name)
    WHERE payload_key.key_name NOT IN (
      'equipos', 'entrenadores', 'jugadores', 'sesiones', 'parametros', 'documentos'
    )
  ) THEN
    RAISE EXCEPTION 'unknown selection key';
  END IF;

  IF NOT (
    p_seleccion ? 'equipos'
    AND p_seleccion ? 'entrenadores'
    AND p_seleccion ? 'jugadores'
    AND p_seleccion ? 'sesiones'
    AND p_seleccion ? 'parametros'
    AND p_seleccion ? 'documentos'
  ) THEN
    RAISE EXCEPTION 'selection must include every supported category';
  END IF;

  FOREACH v_key IN ARRAY ARRAY[
    'equipos', 'entrenadores', 'jugadores', 'sesiones', 'parametros', 'documentos'
  ] LOOP
    IF jsonb_typeof(p_seleccion -> v_key) <> 'array'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_seleccion -> v_key) AS element(value)
        WHERE jsonb_typeof(element.value) <> 'string'
      ) THEN
      RAISE EXCEPTION 'selection category % must be an array of UUID strings', v_key;
    END IF;
  END LOOP;

  BEGIN
    SELECT COALESCE(array_agg(value::uuid), '{}') INTO v_team_ids
    FROM jsonb_array_elements_text(p_seleccion -> 'equipos') AS item(value);
    SELECT COALESCE(array_agg(value::uuid), '{}') INTO v_trainer_ids
    FROM jsonb_array_elements_text(p_seleccion -> 'entrenadores') AS item(value);
    SELECT COALESCE(array_agg(value::uuid), '{}') INTO v_player_ids
    FROM jsonb_array_elements_text(p_seleccion -> 'jugadores') AS item(value);
    SELECT COALESCE(array_agg(value::uuid), '{}') INTO v_session_ids
    FROM jsonb_array_elements_text(p_seleccion -> 'sesiones') AS item(value);
    SELECT COALESCE(array_agg(value::uuid), '{}') INTO v_parameter_ids
    FROM jsonb_array_elements_text(p_seleccion -> 'parametros') AS item(value);
    SELECT COALESCE(array_agg(value::uuid), '{}') INTO v_document_ids
    FROM jsonb_array_elements_text(p_seleccion -> 'documentos') AS item(value);
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'selection IDs must be valid UUIDs';
  END;

  IF (SELECT count(*) FROM unnest(v_team_ids) AS item(id))
      <> (SELECT count(DISTINCT id) FROM unnest(v_team_ids) AS item(id)) THEN
    RAISE EXCEPTION 'duplicate IDs in equipos';
  END IF;
  IF (SELECT count(*) FROM unnest(v_trainer_ids) AS item(id))
      <> (SELECT count(DISTINCT id) FROM unnest(v_trainer_ids) AS item(id)) THEN
    RAISE EXCEPTION 'duplicate IDs in entrenadores';
  END IF;
  IF (SELECT count(*) FROM unnest(v_player_ids) AS item(id))
      <> (SELECT count(DISTINCT id) FROM unnest(v_player_ids) AS item(id)) THEN
    RAISE EXCEPTION 'duplicate IDs in jugadores';
  END IF;
  IF (SELECT count(*) FROM unnest(v_session_ids) AS item(id))
      <> (SELECT count(DISTINCT id) FROM unnest(v_session_ids) AS item(id)) THEN
    RAISE EXCEPTION 'duplicate IDs in sesiones';
  END IF;
  IF (SELECT count(*) FROM unnest(v_parameter_ids) AS item(id))
      <> (SELECT count(DISTINCT id) FROM unnest(v_parameter_ids) AS item(id)) THEN
    RAISE EXCEPTION 'duplicate IDs in parametros';
  END IF;
  IF (SELECT count(*) FROM unnest(v_document_ids) AS item(id))
      <> (SELECT count(DISTINCT id) FROM unnest(v_document_ids) AS item(id)) THEN
    RAISE EXCEPTION 'duplicate IDs in documentos';
  END IF;

  IF (SELECT count(*) FROM public.equipos e
      WHERE e.id = ANY(v_team_ids)
        AND e.sede_id = p_source_sede_id
        AND e.workspace_id = p_workspace_id) <> cardinality(v_team_ids) THEN
    RAISE EXCEPTION 'selected team outside source sede';
  END IF;

  IF (SELECT count(*)
      FROM public.entrenador_sedes es
      JOIN public.entrenadores e ON e.id = es.entrenador_id
      WHERE es.entrenador_id = ANY(v_trainer_ids)
        AND es.sede_id = p_source_sede_id
        AND e.workspace_id = p_workspace_id) <> cardinality(v_trainer_ids) THEN
    RAISE EXCEPTION 'selected trainer outside source sede';
  END IF;

  IF (SELECT count(*)
      FROM public.jugador_sedes js
      JOIN public.jugadores j ON j.id = js.jugador_id
      WHERE js.jugador_id = ANY(v_player_ids)
        AND js.sede_id = p_source_sede_id
        AND j.workspace_id = p_workspace_id) <> cardinality(v_player_ids) THEN
    RAISE EXCEPTION 'selected player outside source sede';
  END IF;

  IF (SELECT count(*)
      FROM public.sesiones se
      JOIN public.equipos e ON e.id = se.equipo_id
      WHERE se.id = ANY(v_session_ids)
        AND e.sede_id = p_source_sede_id
        AND e.workspace_id = p_workspace_id) <> cardinality(v_session_ids) THEN
    RAISE EXCEPTION 'selected session outside source sede';
  END IF;

  IF (SELECT count(*) FROM public.parametros_sistema ps
      WHERE ps.id = ANY(v_parameter_ids)
        AND ps.sede_id = p_source_sede_id
        AND ps.workspace_id = p_workspace_id) <> cardinality(v_parameter_ids) THEN
    RAISE EXCEPTION 'selected parameter outside source sede';
  END IF;

  IF (SELECT count(*)
      FROM public.documento_sedes ds
      JOIN public.documentos d ON d.id = ds.documento_id
      WHERE ds.documento_id = ANY(v_document_ids)
        AND ds.sede_id = p_source_sede_id
        AND d.workspace_id = p_workspace_id) <> cardinality(v_document_ids) THEN
    RAISE EXCEPTION 'selected document outside source sede';
  END IF;

  SELECT COALESCE(array_agg(se.id), '{}')
    INTO v_effective_session_ids
  FROM public.sesiones se
  WHERE se.id = ANY(v_session_ids)
    AND se.equipo_id = ANY(v_team_ids);

  v_omitted_session_count := cardinality(v_session_ids) - cardinality(v_effective_session_ids);

  IF EXISTS (
    SELECT 1
    FROM public.sesion_detalle sd
    JOIN public.ejercicios e ON e.id = sd.ejercicio_id
    WHERE sd.sesion_id = ANY(v_effective_session_ids)
      AND e.workspace_id <> p_workspace_id
  ) THEN
    RAISE EXCEPTION 'session exercise outside source workspace';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sesion_entrenadores se
    WHERE se.sesion_id = ANY(v_effective_session_ids)
      AND NOT (se.entrenador_id = ANY(v_trainer_ids))
  ) THEN
    RAISE EXCEPTION 'session trainer requires selected trainer';
  END IF;

  SELECT count(*)
    INTO v_omitted_trainer_team_count
  FROM public.entrenador_equipos ee
  JOIN public.equipos e ON e.id = ee.equipo_id
  WHERE ee.entrenador_id = ANY(v_trainer_ids)
    AND e.sede_id = p_source_sede_id
    AND e.workspace_id = p_workspace_id
    AND NOT (ee.equipo_id = ANY(v_team_ids));

  SELECT count(*)
    INTO v_omitted_player_team_count
  FROM public.jugador_equipos je
  JOIN public.equipos e ON e.id = je.equipo_id
  WHERE je.jugador_id = ANY(v_player_ids)
    AND e.sede_id = p_source_sede_id
    AND e.workspace_id = p_workspace_id
    AND NOT (je.equipo_id = ANY(v_team_ids));

  INSERT INTO public.sedes (
    nombre, direccion, responsable_id, configuracion_visual, workspace_id
  )
  VALUES (btrim(p_nombre), p_direccion, NULL, '{}'::jsonb, p_workspace_id)
  RETURNING * INTO v_destination_sede;

  INSERT INTO public.entrenador_sedes (entrenador_id, sede_id, rol)
  SELECT es.entrenador_id, v_destination_sede.id, es.rol
  FROM public.entrenador_sedes es
  WHERE es.sede_id = p_source_sede_id
    AND es.entrenador_id = ANY(v_trainer_ids)
  ON CONFLICT (entrenador_id, sede_id) DO NOTHING;

  INSERT INTO public.jugador_sedes (jugador_id, sede_id)
  SELECT js.jugador_id, v_destination_sede.id
  FROM public.jugador_sedes js
  WHERE js.sede_id = p_source_sede_id
    AND js.jugador_id = ANY(v_player_ids)
  ON CONFLICT (jugador_id, sede_id) DO NOTHING;

  FOREACH v_source_team_id IN ARRAY v_team_ids LOOP
    SELECT e.* INTO v_source_team FROM public.equipos e WHERE e.id = v_source_team_id;

    INSERT INTO public.equipos (
      nombre, categoria, sede_id, workspace_id, entrenador_principal_id, entrenador_adjunto_id
    )
    VALUES (
      v_source_team.nombre, v_source_team.categoria, v_destination_sede.id,
      p_workspace_id, NULL, NULL
    )
    RETURNING id INTO v_destination_team_id;

    v_team_mappings := v_team_mappings || jsonb_build_object(
      v_source_team_id::text, v_destination_team_id
    );

    INSERT INTO public.entrenador_equipos (entrenador_id, equipo_id, rol)
    SELECT ee.entrenador_id, v_destination_team_id, ee.rol
    FROM public.entrenador_equipos ee
    WHERE ee.equipo_id = v_source_team_id
      AND ee.entrenador_id = ANY(v_trainer_ids)
    ON CONFLICT (entrenador_id, equipo_id) DO NOTHING;

    INSERT INTO public.jugador_equipos (jugador_id, equipo_id, dorsal, posicion)
    SELECT je.jugador_id, v_destination_team_id, je.dorsal, je.posicion
    FROM public.jugador_equipos je
    WHERE je.equipo_id = v_source_team_id
      AND je.jugador_id = ANY(v_player_ids)
    ON CONFLICT (jugador_id, equipo_id) DO NOTHING;
  END LOOP;

  FOREACH v_source_session_id IN ARRAY v_effective_session_ids LOOP
    SELECT se.* INTO v_source_session FROM public.sesiones se WHERE se.id = v_source_session_id;

    v_destination_team_id := (v_team_mappings ->> v_source_session.equipo_id::text)::uuid;

    INSERT INTO public.sesiones (
      equipo_id, entrenador_id, fecha, hora_inicio, duracion_estimada, microciclo,
      periodo_temporada, objetivo_sesion, observaciones_previas, feedback_post_entreno, estado
    )
    VALUES (
      v_destination_team_id,
      CASE WHEN v_source_session.entrenador_id = ANY(v_trainer_ids)
        THEN v_source_session.entrenador_id ELSE NULL END,
      v_source_session.fecha, v_source_session.hora_inicio, v_source_session.duracion_estimada,
      v_source_session.microciclo, v_source_session.periodo_temporada,
      v_source_session.objetivo_sesion, v_source_session.observaciones_previas,
      NULL, v_source_session.estado
    )
    RETURNING id INTO v_destination_session_id;

    v_session_mappings := v_session_mappings || jsonb_build_object(
      v_source_session_id::text, v_destination_session_id
    );

    INSERT INTO public.sesion_detalle (
      sesion_id, ejercicio_id, orden, tiempo_ejecucion, tiempo_descanso, variante_aplicada
    )
    SELECT v_destination_session_id, sd.ejercicio_id, sd.orden, sd.tiempo_ejecucion,
      sd.tiempo_descanso, sd.variante_aplicada
    FROM public.sesion_detalle sd
    WHERE sd.sesion_id = v_source_session_id;

    INSERT INTO public.sesion_entrenadores (sesion_id, entrenador_id)
    SELECT v_destination_session_id, se.entrenador_id
    FROM public.sesion_entrenadores se
    WHERE se.sesion_id = v_source_session_id
      AND se.entrenador_id = ANY(v_trainer_ids)
    ON CONFLICT (sesion_id, entrenador_id) DO NOTHING;
  END LOOP;

  INSERT INTO public.parametros_sistema (categoria, nombre, activo, sede_id, workspace_id)
  SELECT ps.categoria, ps.nombre, ps.activo, v_destination_sede.id, p_workspace_id
  FROM public.parametros_sistema ps
  WHERE ps.id = ANY(v_parameter_ids);

  INSERT INTO public.documento_sedes (documento_id, sede_id)
  SELECT ds.documento_id, v_destination_sede.id
  FROM public.documento_sedes ds
  WHERE ds.sede_id = p_source_sede_id
    AND ds.documento_id = ANY(v_document_ids)
  ON CONFLICT (documento_id, sede_id) DO NOTHING;

  RETURN jsonb_build_object(
    'sede', to_jsonb(v_destination_sede),
    'mappings', jsonb_build_object('equipos', v_team_mappings, 'sesiones', v_session_mappings),
    'resumen', jsonb_build_object(
      'equipos', cardinality(v_team_ids),
      'entrenadores', cardinality(v_trainer_ids),
      'jugadores', cardinality(v_player_ids),
      'sesiones', cardinality(v_effective_session_ids),
      'parametros', cardinality(v_parameter_ids),
      'documentos', cardinality(v_document_ids),
      'ejercicios', 0
    ),
    'omisiones', jsonb_build_object(
      'entrenador_equipo_no_seleccionado', v_omitted_trainer_team_count,
      'jugador_equipo_no_seleccionado', v_omitted_player_team_count,
      'sesion_equipo_no_seleccionado', v_omitted_session_count,
      'total', v_omitted_session_count + v_omitted_trainer_team_count + v_omitted_player_team_count
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_sede(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.clone_sede(uuid, uuid, text, text, jsonb) TO authenticated;
