-- Pimi — no dejar ni pedir un cuidador nuevo si la mascota ya tiene una
-- reserva CONFIRMADA que se superpone en fechas.
--
-- La migración 0020 ya bloqueaba que dos reservas de la misma mascota
-- quedaran "aceptado"/"en_curso" a la vez, pero solo corría cuando la fila
-- nueva/actualizada pasaba a ese estado — una solicitud nueva ('solicitado')
-- para fechas que la mascota ya tenía confirmadas con otro cuidador se
-- podía crear igual (y chatear, etc.), aunque después nunca pudiera
-- aceptarse. A pedido explícito: ni siquiera debería poder generarse esa
-- solicitud — es ruido evitable tanto para el dueño como para el cuidador
-- que la recibe sin poder aceptarla nunca.

create or replace function public.evitar_reservas_superpuestas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Regla 1: la misma mascota no puede tener otra reserva CONFIRMADA que
  -- se superponga en fechas. A diferencia de antes, esto corre siempre
  -- (insert o update, sea cual sea el estado de la fila nueva) — así
  -- bloquea tanto una solicitud nueva como una aceptación.
  if exists (
    select 1 from public.bookings b
    where b.id <> new.id
      and b.pet_id = new.pet_id
      and b.estado in ('aceptado', 'en_curso')
      and b.fecha_inicio <= new.fecha_fin
      and b.fecha_fin >= new.fecha_inicio
  ) then
    raise exception
      'Esta mascota ya tiene un cuidado confirmado que se superpone con estas fechas.'
      using errcode = 'P0001';
  end if;

  if new.estado not in ('aceptado', 'en_curso') then
    return new;
  end if;

  -- Regla 2: el mismo cuidador no puede tener OTRA mascota en una reserva
  -- activa que se superponga en fechas. Sigue aplicando solo al
  -- confirmar/poner en curso — un cuidador puede tener muchas solicitudes
  -- pendientes superpuestas entre sí, el límite real es cuántas puede
  -- ACEPTAR a la vez.
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

-- El trigger en sí (0020) no cambia: sigue siendo BEFORE INSERT OR UPDATE
-- en bookings, solo se reemplaza la función que ejecuta.
