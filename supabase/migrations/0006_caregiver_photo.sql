-- Pimi — foto de perfil del cuidador.

alter table public.caregiver_profiles add column if not exists foto text;

create or replace view public.caregiver_public_profiles as
select
  p.id,
  p.nombre,
  cp.zona,
  cp.bio,
  cp.tarifa_base,
  cp.tipos_de_servicio,
  cp.radio_cobertura_km,
  cp.verificado,
  cp.foto
from public.caregiver_profiles cp
join public.profiles p on p.id = cp.user_id;

grant select on public.caregiver_public_profiles to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cuidadores',
  'cuidadores',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "cuidadores: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'cuidadores'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cuidadores: owner update"
  on storage.objects for update
  using (
    bucket_id = 'cuidadores'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cuidadores: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'cuidadores'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cuidadores: public read"
  on storage.objects for select
  using (bucket_id = 'cuidadores');
