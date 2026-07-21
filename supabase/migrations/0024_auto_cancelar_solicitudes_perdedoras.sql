-- Pimi — colapso automático de solicitudes "perdedoras" al confirmar una,
-- + fix de un bug propio que introdujo la migración 0023.
--
-- Bug de 0023: la Regla 1 (mascota con reserva confirmada superpuesta) pasó
-- a correr siempre, sin mirar el estado de la fila nueva. Eso significaba
-- que ni siquiera se podía CANCELAR una solicitud perdedora una vez que
-- otra ya estaba aceptada — el propio auto-cancelado de más abajo se
-- topaba con "esta mascota ya tiene un cuidado confirmado que se
-- superpone" al intentar poner esa solicitud en 'cancelado'. La regla
-- tiene que aplicar solo cuando la fila nueva representa un compromiso
-- activo o pendiente sobre la mascota (solicitado/aceptado/en_curso) —
-- cancelar, completar o disputar una reserva nunca debería chocar con
-- esto.
create or replace function public.evitar_reservas_superpuestas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado in ('solicitado', 'aceptado', 'en_curso') and exists (
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

-- ============================================================
-- Motivo de cancelación: sirve para distinguir en la UI "el cuidador
-- rechazó", "el dueño canceló" de "perdiste contra otro cuidador" — a
-- este último se le muestra un mensaje que no suena a que el cuidador
-- hizo algo mal.
-- ============================================================
alter table public.bookings
  add column if not exists motivo_cancelacion text;

-- ============================================================
-- Al aceptar una solicitud, las demás solicitudes PENDIENTES de la misma
-- mascota que se superponen en fechas se cancelan solas — antes quedaban
-- colgadas para siempre en "solicitado" sin que nadie las tocara. Corre
-- con security definer porque tiene que poder actualizar reservas de
-- OTROS cuidadores (no participan en la fila que gatilla el trigger), lo
-- mismo que ya hace recalcular_tier_cuidador en la migración 0011.
-- ============================================================
create or replace function public.cancelar_solicitudes_perdedoras()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'aceptado' and old.estado is distinct from 'aceptado' then
    update public.bookings b
    set estado = 'cancelado',
        motivo_cancelacion = 'otro_cuidador_elegido'
    where b.id <> new.id
      and b.pet_id = new.pet_id
      and b.estado = 'solicitado'
      and b.fecha_inicio <= new.fecha_fin
      and b.fecha_fin >= new.fecha_inicio;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cancelar_solicitudes_perdedoras on public.bookings;
create trigger trg_cancelar_solicitudes_perdedoras
  after update on public.bookings
  for each row
  execute function public.cancelar_solicitudes_perdedoras();
