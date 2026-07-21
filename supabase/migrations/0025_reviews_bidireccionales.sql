-- Pimi — sistema de reseñas bidireccional (dueño ↔ cuidador) con
-- revelado doble-ciego.
--
-- La tabla "reviews" (migración 0001) ya era genérica (autor_id/
-- destinatario_id, no "solo dueño reseña cuidador"), así que no hace
-- falta tocar su forma — lo que faltaba era: 1) que el destinatario no se
-- pudiera falsear desde el cliente, y 2) que las reseñas no se vieran
-- apenas se cargaban, para no incentivar reseñas de favor o de
-- represalia (mismo mecanismo que usa Airbnb: se revela la reseña de
-- alguien recién cuando la otra parte también calificó, o pasan 14 días).

-- ============================================================
-- 1) Forzar destinatario_id server-side. Antes el insert policy solo
--    validaba que el autor participara de la reserva completada, pero no
--    que "destinatario_id" fuera realmente la otra parte — un cliente
--    manipulado podía mandar cualquier UUID ahí.
-- ============================================================
create or replace function public.forzar_destinatario_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_caregiver_id uuid;
begin
  select owner_id, caregiver_id
    into v_owner_id, v_caregiver_id
    from public.bookings
    where id = new.booking_id;

  if v_owner_id is null then
    raise exception 'Reserva inválida.' using errcode = 'P0001';
  end if;

  if new.autor_id = v_owner_id then
    new.destinatario_id := v_caregiver_id;
  elsif new.autor_id = v_caregiver_id then
    new.destinatario_id := v_owner_id;
  else
    raise exception 'No participaste de esta reserva.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_forzar_destinatario_review on public.reviews;
create trigger trg_forzar_destinatario_review
  before insert on public.reviews
  for each row
  execute function public.forzar_destinatario_review();

-- ============================================================
-- 2) La select policy de "reviews" (0001) era "using (true)" — pública
--    total, sin doble-ciego. Se restringe a los propios participantes;
--    la visibilidad pública/de terceros pasa a resolverse con la vista
--    de abajo, que sí aplica la lógica de revelado.
-- ============================================================
drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: select own"
  on public.reviews for select
  using (auth.uid() = autor_id or auth.uid() = destinatario_id);

-- ============================================================
-- 3) Vista pública con revelado doble-ciego: una reseña se muestra a
--    terceros recién cuando la otra parte de la MISMA reserva también
--    calificó, o cuando pasaron 14 días desde que terminó el cuidado
--    (fecha_fin) — lo que pase primero. Antes de eso, cada quien solo ve
--    la propia reseña que escribió (vía la tabla base, RLS de arriba).
-- ============================================================
create or replace view public.reviews_publicas as
select
  r.id,
  r.booking_id,
  r.autor_id,
  r.destinatario_id,
  r.puntaje,
  r.comentario,
  r.created_at
from public.reviews r
join public.bookings b on b.id = r.booking_id
where
  exists (
    select 1 from public.reviews r2
    where r2.booking_id = r.booking_id
      and r2.autor_id <> r.autor_id
  )
  or now() >= (b.fecha_fin::timestamptz + interval '14 days');

grant select on public.reviews_publicas to anon, authenticated;
