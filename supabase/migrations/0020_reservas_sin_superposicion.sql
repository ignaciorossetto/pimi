-- Pimi — evitar reservas activas superpuestas.
--
-- Reglas de negocio (a pedido explícito):
--   1. Una misma mascota no puede tener dos reservas activas al mismo
--      tiempo (evita que dos cuidadores distintos "reciban" la misma
--      mascota en fechas que se pisan).
--   2. Un mismo cuidador no puede tener dos mascotas DISTINTAS en
--      reservas activas al mismo tiempo (un cuidador cuida una mascota —
--      o las mascotas de un mismo dueño en la misma reserva— por vez, no
--      dos mascotas de reservas distintas en simultáneo).
--
-- "Activa" acá quiere decir estado 'aceptado' o 'en_curso' — un
-- 'solicitado' todavía no compromete nada (el cuidador puede rechazarlo),
-- así que no se bloquea en ese estado; se bloquea recién cuando se
-- confirma (aceptar) o cuando arranca el cuidado.
--
-- Se implementa con un trigger (no un exclusion constraint de rango)
-- porque necesita dos chequeos distintos con condiciones diferentes
-- (misma mascota vs. mismo cuidador con mascota distinta), y así el
-- mensaje de error puede ser específico para cada caso.

create or replace function public.evitar_reservas_superpuestas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado not in ('aceptado', 'en_curso') then
    return new;
  end if;

  -- Regla 1: la misma mascota no puede estar en otra reserva activa que
  -- se superponga en fechas.
  if exists (
    select 1 from public.bookings b
    where b.id <> new.id
      and b.pet_id = new.pet_id
      and b.estado in ('aceptado', 'en_curso')
      and b.fecha_inicio <= new.fecha_fin
      and b.fecha_fin >= new.fecha_inicio
  ) then
    raise exception
      'Esta mascota ya tiene otra reserva activa que se superpone con estas fechas.'
      using errcode = 'P0001';
  end if;

  -- Regla 2: el mismo cuidador no puede tener OTRA mascota en una reserva
  -- activa que se superponga en fechas.
  if exists (
    select 1 from public.bookings b
    where b.id <> new.id
      and b.caregiver_id = new.caregiver_id
      and b.pet_id <> new.pet_id
      and b.estado in ('aceptado', 'en_curso')
      and b.fecha_inicio <= new.fecha_fin
      and b.fecha_fin >= new.fecha_inicio
  ) then
    raise exception
      'Este cuidador ya tiene otra mascota en una reserva activa que se superpone con estas fechas.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_evitar_reservas_superpuestas on public.bookings;
create trigger trg_evitar_reservas_superpuestas
  before insert or update on public.bookings
  for each row
  execute function public.evitar_reservas_superpuestas();
