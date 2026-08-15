-- Pimi — instrumentación de analítica propia sobre la tabla events
-- (auditoría docs/05-auditoria-backlog.md, punto A7)
--
-- La tabla events existe desde 0001 con la promesa de ser "activo de
-- datos desde el día 1", pero hasta hoy solo registraba mensajes
-- flageados. Esta migración instrumenta el funnel completo con TRIGGERS
-- de base de datos: a diferencia de instrumentar desde el cliente, los
-- triggers capturan el 100% de los eventos (no dependen de que el
-- navegador llegue a disparar un ping) y no se pueden falsear ni omitir.
--
-- Los únicos eventos que NO se pueden capturar acá son los que no son
-- mutaciones (búsqueda ejecutada, perfil visto) — esos se registran
-- desde las páginas (ver buscar-cuidador y cuidadores/[id]).
--
-- Convención de tipo_evento (snake_case, sustantivo_verbo):
--   registro_completado, mascota_creada, reserva_solicitada,
--   reserva_cambio_estado, pago_cambio_estado, checkin_registrado,
--   resena_creada, liquidacion_creada, liquidacion_pagada,
--   busqueda_ejecutada*, perfil_cuidador_visto*   (* desde la app)

create index if not exists idx_events_created_at on public.events (created_at);

-- Helper único: todos los triggers pasan por acá. security definer para
-- no depender de la policy de insert de events (que está pensada para
-- inserts del propio usuario desde el cliente).
create or replace function public.registrar_evento(
  p_user_id uuid,
  p_tipo text,
  p_metadata jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.events (user_id, tipo_evento, metadata)
  values (p_user_id, p_tipo, coalesce(p_metadata, '{}'::jsonb));
$$;

revoke execute on function public.registrar_evento(uuid, text, jsonb) from public, anon, authenticated;

-- ============================================================
-- Registro de usuario (dispara cuando handle_new_user crea el perfil)
-- ============================================================
create or replace function public.evento_registro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.registrar_evento(
    new.id,
    'registro_completado',
    jsonb_build_object('roles', new.roles)
  );
  return new;
end;
$$;

drop trigger if exists trg_evento_registro on public.profiles;
create trigger trg_evento_registro
  after insert on public.profiles
  for each row execute function public.evento_registro();

-- ============================================================
-- Mascota creada
-- ============================================================
create or replace function public.evento_mascota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.registrar_evento(
    new.owner_id,
    'mascota_creada',
    jsonb_build_object('pet_id', new.id, 'especie', new.especie, 'tamano', new.tamano)
  );
  return new;
end;
$$;

drop trigger if exists trg_evento_mascota on public.pets;
create trigger trg_evento_mascota
  after insert on public.pets
  for each row execute function public.evento_mascota();

-- ============================================================
-- Reservas: solicitud nueva + cada cambio de estado
-- ============================================================
create or replace function public.evento_reserva_creada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.registrar_evento(
    new.owner_id,
    'reserva_solicitada',
    jsonb_build_object(
      'booking_id', new.id,
      'caregiver_id', new.caregiver_id,
      'monto', new.monto,
      'noches', (new.fecha_fin - new.fecha_inicio)
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_evento_reserva_creada on public.bookings;
create trigger trg_evento_reserva_creada
  after insert on public.bookings
  for each row execute function public.evento_reserva_creada();

create or replace function public.evento_reserva_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado is distinct from old.estado then
    perform public.registrar_evento(
      new.owner_id,
      'reserva_cambio_estado',
      jsonb_build_object(
        'booking_id', new.id,
        'caregiver_id', new.caregiver_id,
        'de', old.estado,
        'a', new.estado,
        'motivo', new.motivo_cancelacion,
        'monto', new.monto
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_evento_reserva_estado on public.bookings;
create trigger trg_evento_reserva_estado
  after update on public.bookings
  for each row execute function public.evento_reserva_estado();

-- ============================================================
-- Pagos: cada cambio de estado (pendiente/retenido/liberado/reembolsado)
-- ============================================================
create or replace function public.evento_pago_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    perform public.registrar_evento(
      null,
      'pago_cambio_estado',
      jsonb_build_object(
        'payment_id', new.id,
        'booking_id', new.booking_id,
        'de', case when tg_op = 'INSERT' then null else old.estado end,
        'a', new.estado,
        'monto', new.monto,
        'comision_pimi', new.comision_pimi
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_evento_pago_estado on public.payments;
create trigger trg_evento_pago_estado
  after insert or update on public.payments
  for each row execute function public.evento_pago_estado();

-- ============================================================
-- Check-ins y reseñas
-- ============================================================
create or replace function public.evento_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.registrar_evento(
    new.autor_id,
    'checkin_registrado',
    jsonb_build_object('booking_id', new.booking_id, 'tipo', new.tipo)
  );
  return new;
end;
$$;

drop trigger if exists trg_evento_checkin on public.booking_checkins;
create trigger trg_evento_checkin
  after insert on public.booking_checkins
  for each row execute function public.evento_checkin();

create or replace function public.evento_resena()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.registrar_evento(
    new.autor_id,
    'resena_creada',
    jsonb_build_object(
      'booking_id', new.booking_id,
      'destinatario_id', new.destinatario_id,
      'puntaje', new.puntaje
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_evento_resena on public.reviews;
create trigger trg_evento_resena
  after insert on public.reviews
  for each row execute function public.evento_resena();

-- ============================================================
-- Liquidaciones
-- ============================================================
create or replace function public.evento_liquidacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.registrar_evento(
      new.caregiver_id,
      'liquidacion_creada',
      jsonb_build_object('liquidacion_id', new.id, 'monto_total', new.monto_total)
    );
  elsif new.estado = 'pagada' and old.estado is distinct from 'pagada' then
    perform public.registrar_evento(
      new.caregiver_id,
      'liquidacion_pagada',
      jsonb_build_object(
        'liquidacion_id', new.id,
        'monto_total', new.monto_total,
        'medio_pago', new.medio_pago
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_evento_liquidacion on public.liquidaciones;
create trigger trg_evento_liquidacion
  after insert or update on public.liquidaciones
  for each row execute function public.evento_liquidacion();
