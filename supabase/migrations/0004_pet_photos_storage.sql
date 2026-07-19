-- Pimi — bucket de Storage para fotos de mascotas.
--
-- Bucket público (las fotos no son datos sensibles y así evitamos la
-- complejidad de URLs firmadas para mostrar una imagen). Solo el dueño
-- puede subir/editar/borrar dentro de su propia carpeta (su user id
-- como primer segmento del path, ej. "<user_id>/foto.jpg").

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mascotas',
  'mascotas',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "mascotas: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'mascotas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "mascotas: owner update"
  on storage.objects for update
  using (
    bucket_id = 'mascotas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "mascotas: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'mascotas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "mascotas: public read"
  on storage.objects for select
  using (bucket_id = 'mascotas');
