-- Pimi — sistema de tiers de cuidador (baja de comisión por reputación)
--
-- Regla (v1): la comisión de Pimi arranca en 20% y baja a medida que el
-- cuidador acumula reseñas con buen puntaje. Se recalcula automáticamente
-- cada vez que entra una reseña nueva — no hay ningún proceso manual ni
-- batch que correr.
--
--   nuevo:   < 5 reseñas                              -> 20.0%
--   bronce:  >= 5 reseñas  y promedio >= 4.0           -> 19.5%
--   plata:   >= 20 reseñas y promedio >= 4.3           -> 19.0%
--   oro:     >= 50 reseñas y promedio >= 4.5           -> 18.0%
--
-- Los umbrales están acá y SOLO acá (función recalcular_tier_cuidador). Si
-- se ajustan, no hace falta tocar nada del código de la app — el próximo
-- insert en reviews ya recalcula con las reglas nuevas (y se puede forzar
-- un recálculo total volviendo a correr el bloque de backfill del final).

alter table public.caregiver_profiles
  add column if not exists tier text not null default 'nuevo'
    check (tier in ('nuevo', 'bronce', 'plata', 'oro')),
  add column if not exists comision_pct numeric(4, 3) not null default 0.200,
  add column if not exists reviews_count int not null default 0,
  add column if not exists rating_promedio numeric(3, 2);

create or replace function public.recalcular_tier_cuidador(p_caregiver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_avg numeric;
  v_tier text;
  v_pct numeric;
begin
  select count(*), coalesce(avg(puntaje), 0)
    into v_count, v_avg
    from public.reviews
    where destinatario_id = p_caregiver_id;

  if v_count >= 50 and v_avg >= 4.5 then
    v_tier := 'oro';
    v_pct := 0.180;
  elsif v_count >= 20 and v_avg >= 4.3 then
    v_tier := 'plata';
    v_pct := 0.190;
  elsif v_count >= 5 and v_avg >= 4.0 then
    v_tier := 'bronce';
    v_pct := 0.195;
  else
    v_tier := 'nuevo';
    v_pct := 0.200;
  end if;

  update public.caregiver_profiles
  set reviews_count = v_count,
      rating_promedio = round(v_avg, 2),
      tier = v_tier,
      comision_pct = v_pct
  where user_id = p_caregiver_id;
end;
$$;

create or replace function public.trg_recalcular_tier_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalcular_tier_cuidador(new.destinatario_id);
  return new;
end;
$$;

drop trigger if exists trg_review_recalcula_tier on public.reviews;
create trigger trg_review_recalcula_tier
  after insert on public.reviews
  for each row
  execute function public.trg_recalcular_tier_on_review();

-- Backfill: calcula el tier inicial de todos los cuidadores existentes
-- (relevante si ya hay reseñas cargadas antes de esta migración).
do $$
declare
  r record;
begin
  for r in select user_id from public.caregiver_profiles loop
    perform public.recalcular_tier_cuidador(r.user_id);
  end loop;
end $$;

-- ============================================================
-- Seguridad: evitar que un cuidador se autoasigne un tier/comisión mejor
-- ============================================================
-- La policy "caregiver_profiles: owner update" (0001_init.sql) permite al
-- cuidador actualizar SU FILA, pero a nivel de row-level security no hay
-- forma de restringir columnas individuales dentro de esa policy. Sin este
-- grant column-level, cualquier cuidador podría hacer un simple
-- `update caregiver_profiles set comision_pct = 0.01` desde el cliente y
-- pagar menos comisión. Postgres permite restringir qué columnas puede
-- tocar un update independientemente de la policy de fila — eso es lo que
-- hace el revoke/grant de abajo.
revoke update on public.caregiver_profiles from authenticated;
grant update (
  zona, bio, tarifa_base, tipos_de_servicio, radio_cobertura_km, foto
) on public.caregiver_profiles to authenticated;
-- Nota: esto también bloquea que el cuidador se autoasigne `verificado`,
-- que ya era un gap preexistente antes de esta migración (la verificación
-- de identidad la aprueba un admin vía service role, nunca el propio
-- usuario) — se corrige acá de paso porque es el mismo mecanismo.

-- ============================================================
-- Vista pública: sumar señales de confianza (tier, reseñas, promedio)
-- ============================================================
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
  cp.foto,
  cp.tier,
  cp.reviews_count,
  cp.rating_promedio
from public.caregiver_profiles cp
join public.profiles p on p.id = cp.user_id;

grant select on public.caregiver_public_profiles to anon, authenticated;
