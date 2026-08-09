-- Composición ejecutable de sesiones. No modifica public.sesion_detalle.

create table public.sesion_bloques (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  duracion_minutos integer not null check (duracion_minutos > 0),
  ejercicio_id uuid not null references public.ejercicios(id) on delete restrict,
  documento_id uuid references public.documentos(id) on delete set null,
  orden integer not null check (orden >= 1),
  created_at timestamptz not null default now(),
  unique (sesion_id, orden)
);

create index idx_sesion_bloques_ejercicio
  on public.sesion_bloques (ejercicio_id);

create index idx_sesion_bloques_documento
  on public.sesion_bloques (documento_id)
  where documento_id is not null;

alter table public.sesion_bloques enable row level security;

revoke all on table public.sesion_bloques from public, anon, authenticated;
grant select on table public.sesion_bloques to authenticated;

create policy "sesion_bloques_select_autorizados"
  on public.sesion_bloques
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.sesiones s
      join public.equipos e on e.id = s.equipo_id
      join public.sedes sd on sd.id = e.sede_id
      join public.workspace_members wm on wm.workspace_id = sd.workspace_id
      where s.id = sesion_bloques.sesion_id
        and wm.user_id = auth.uid()
        and wm.role in ('superadmin', 'admin', 'gerente_sede', 'entrenador')
    )
  );

create or replace function public.replace_sesion_bloques(
  p_sesion_id uuid,
  p_bloques jsonb
)
returns setof public.sesion_bloques
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_sede_id uuid;
  v_role text;
  v_item jsonb;
  v_index integer := 0;
  v_titulo text;
  v_duracion integer;
  v_ejercicio_id uuid;
  v_documento_id uuid;
  v_orden integer;
  v_ordenes integer[] := '{}';
  v_ordenes_esperados integer[];
  v_duracion_total bigint := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select sd.workspace_id, sd.id
    into v_workspace_id, v_sede_id
  from public.sesiones s
  join public.equipos e on e.id = s.equipo_id
  join public.sedes sd on sd.id = e.sede_id
  where s.id = p_sesion_id
  for update of s;

  if not found then
    raise exception 'session unavailable';
  end if;

  select wm.role
    into v_role
  from public.workspace_members wm
  where wm.workspace_id = v_workspace_id
    and wm.user_id = v_user_id
  limit 1;

  if v_role is null
    or v_role not in ('superadmin', 'admin', 'gerente_sede', 'entrenador') then
    raise exception 'not authorized to replace session blocks';
  end if;

  if jsonb_typeof(p_bloques) <> 'array' or jsonb_array_length(p_bloques) = 0 then
    raise exception 'blocks must be a non-empty array';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_bloques)
  loop
    v_index := v_index + 1;

    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'invalid block payload at position %', v_index;
    end if;

    if (select count(*) from jsonb_object_keys(v_item)) <> 5
      or exists (
        select 1
        from jsonb_object_keys(v_item) as payload_key(key_name)
        where payload_key.key_name not in (
          'titulo',
          'duracion_minutos',
          'ejercicio_id',
          'documento_id',
          'orden'
        )
      )
      or jsonb_typeof(v_item -> 'titulo') <> 'string'
      or jsonb_typeof(v_item -> 'duracion_minutos') <> 'number'
      or jsonb_typeof(v_item -> 'ejercicio_id') <> 'string'
      or jsonb_typeof(v_item -> 'orden') <> 'number'
      or jsonb_typeof(v_item -> 'documento_id') not in ('string', 'null') then
      raise exception 'invalid block payload at position %', v_index;
    end if;

    v_titulo := btrim(v_item ->> 'titulo');
    if char_length(v_titulo) not between 1 and 120 then
      raise exception 'invalid block title at position %', v_index;
    end if;

    begin
      v_duracion := (v_item ->> 'duracion_minutos')::integer;
      v_ejercicio_id := (v_item ->> 'ejercicio_id')::uuid;
      v_orden := (v_item ->> 'orden')::integer;

      if jsonb_typeof(v_item -> 'documento_id') = 'null' then
        v_documento_id := null;
      else
        v_documento_id := (v_item ->> 'documento_id')::uuid;
      end if;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'invalid block value at position %', v_index;
    end;

    if v_duracion <= 0 or v_orden < 1 then
      raise exception 'invalid block value at position %', v_index;
    end if;

    if not exists (
      select 1
      from public.ejercicios e
      where e.id = v_ejercicio_id
        and e.workspace_id = v_workspace_id
    ) then
      raise exception 'exercise outside session workspace at position %', v_index;
    end if;

    if v_documento_id is not null and not exists (
      select 1
      from public.documentos d
      where d.id = v_documento_id
        and d.workspace_id = v_workspace_id
        and (d.sede_id is null or d.sede_id = v_sede_id)
    ) then
      raise exception 'document outside session scope at position %', v_index;
    end if;

    v_ordenes := array_append(v_ordenes, v_orden);
    v_duracion_total := v_duracion_total + v_duracion;
  end loop;

  select array_agg(value order by value)
    into v_ordenes
  from unnest(v_ordenes) as orden_entrada(value);

  select array_agg(value order by value)
    into v_ordenes_esperados
  from generate_series(1, jsonb_array_length(p_bloques)) as orden_esperado(value);

  if v_ordenes is distinct from v_ordenes_esperados then
    raise exception 'block orders must be unique and continuous from 1';
  end if;

  if v_duracion_total > 2147483647 then
    raise exception 'total duration exceeds integer range';
  end if;

  delete from public.sesion_bloques
  where sesion_id = p_sesion_id;

  insert into public.sesion_bloques (
    sesion_id,
    titulo,
    duracion_minutos,
    ejercicio_id,
    documento_id,
    orden
  )
  select
    p_sesion_id,
    btrim(block.titulo),
    block.duracion_minutos,
    block.ejercicio_id,
    block.documento_id,
    block.orden
  from jsonb_to_recordset(p_bloques) as block(
    titulo text,
    duracion_minutos integer,
    ejercicio_id uuid,
    documento_id uuid,
    orden integer
  );

  update public.sesiones
  set duracion_estimada = v_duracion_total::integer
  where id = p_sesion_id;

  return query
  select sb.*
  from public.sesion_bloques sb
  where sb.sesion_id = p_sesion_id
  order by sb.orden;
end;
$$;

revoke all on function public.replace_sesion_bloques(uuid, jsonb) from public, anon;
grant execute on function public.replace_sesion_bloques(uuid, jsonb) to authenticated;
