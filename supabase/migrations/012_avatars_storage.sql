-- Storage bucket público para avatares de usuario
-- Idempotente: se puede re-ejecutar sin errores.

-- 1) Crear bucket "avatars" (público)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- 2) Políticas RLS sobre storage.objects
-- Los archivos se guardan con el patrón: {user_id}/archivo.ext
-- storage.foldername(name)[1] devuelve el primer segmento de la ruta.

drop policy if exists "Avatars: lectura pública" on storage.objects;
create policy "Avatars: lectura pública"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "Avatars: insert propio" on storage.objects;
create policy "Avatars: insert propio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Avatars: update propio" on storage.objects;
create policy "Avatars: update propio"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Avatars: delete propio" on storage.objects;
create policy "Avatars: delete propio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
