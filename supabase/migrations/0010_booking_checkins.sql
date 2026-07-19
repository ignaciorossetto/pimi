-- Pimi — check-ins de cuidado (foto + geolocalización obligatorias)
--
-- Requisito de negocio: el cuidador tiene que dejar evidencia (foto +
-- ubicación) al arrancar el cuidado, durante la estadía (updates diarios)
-- y al terminar. Esto es lo que efectivamente mueve el estado de la
-- reserva de 'aceptado' -> 'en_curso' -> 'completado', reforzando el
-- pilar de "confianza verificable" del doc de producto.
--
-- Nota de alcance: se pidió geolocalización explícitamente como requisito
-- indispensable. Acá se captura solo en momentos puntuales (cada check-in),
-- NO tracking continuo — eso sería mucho mayor riesgo de privacidad y de
-- batería del cuidador sin aportar más confianza real.

create table public.booking_checkins (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  autor_id uuid not null references public.profiles (id),
  tipo text not null check (tipo in ('llegada', 'diario', 'salida')),
  foto text not null,
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null,
  comentario text,
  created_at timestamptz not null default now()
);

alter table public.booking_checkins enable row level security;

create policy "booking_checkins: select participants"
  on public.booking_checkins for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_checkins.booking_id
        and (auth.uid() = b.owner_id or auth.uid() = b.caregiver_id)
    )
  );

-- Solo el cuidador de esa reserva puede cargar check-ins (es quien está
-- físicamente con la mascota).
create policy "booking_checkins: insert by caregiver"
  on public.booking_checkins for insert
  with check (
    auth.uid() = autor_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_checkins.booking_id
        and auth.uid() = b.caregiver_id
    )
  );

create index idx_booking_checkins_booking on public.booking_checkins (booking_id);

-- ============================================================
-- Avance automático del estado de la reserva según el check-in
-- ============================================================
create or replace function public.advance_booking_on_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'llegada' then
    update public.bookings
    set estado = 'en_curso'
    where id = new.booking_id
      and estado = 'aceptado';
  elsif new.tipo = 'salida' then
    update public.bookings
    set estado = 'completado'
    where id = new.booking_id
      and estado = 'en_curso';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_advance_booking_on_checkin on public.booking_checkins;
create trigger trg_advance_booking_on_checkin
  after insert on public.booking_checkins
  for each row
  execute function public.advance_booking_on_checkin();

-- ============================================================
-- Storage: bucket para fotos de check-in (mismo patrón que 'mascotas'
-- y 'cuidadores': público en lectura, escritura solo en la carpeta del
-- propio usuario)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkins', 'checkins', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "checkins: public read"
  on storage.objects for select
  using (bucket_id = 'checkins');

create policy "checkins: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'checkins'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "checkins: owner update"
  on storage.objects for update
  using (
    bucket_id = 'checkins'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "checkins: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'checkins'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
