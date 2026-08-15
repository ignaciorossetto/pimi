-- Pimi — disputas ("reportar un problema") y reembolsos
-- (auditoría docs/05-auditoria-backlog.md, puntos A1 y A2)
--
-- La promesa del escrow siempre fue: "el pago queda retenido 48hs por si
-- reportás un problema" — pero hasta esta migración no existía ninguna
-- forma de reportar nada: el estado 'disputado' de bookings y el
-- 'reembolsado' de payments estaban definidos desde 0001/0009 y nada en
-- toda la app los producía.
--
-- Modelo:
--   1. El DUEÑO reporta un problema mientras su pago está 'retenido'
--      (o sea: antes de que se le libere la plata al cuidador). Eso crea
--      una fila acá y pasa la reserva a 'disputado' vía trigger.
--   2. Una reserva 'disputado' congela la liberación del pago (el route
--      handler de liberar-pago la rechaza — defensa en app, no en DB,
--      porque liberar ya es una operación solo-admin vía service role).
--   3. Un admin resuelve: 'reembolso' (el dueño tenía razón → payments
--      pasa a 'reembolsado', la reserva a 'cancelado'; la devolución
--      REAL de la plata por Mercado Pago es un paso manual en v1, igual
--      que las liquidaciones) o 'liberar' (el cuidador cumplió →
--      payments a 'liberado', la reserva a 'completado').

create table public.booking_disputas (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  autor_id uuid not null references public.profiles (id),
  motivo text not null,
  estado text not null default 'abierta'
    check (estado in ('abierta', 'resuelta')),
  resolucion text
    check (resolucion in ('reembolso', 'liberado_al_cuidador')),
  notas_admin text,
  resuelto_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  resuelta_at timestamptz,
  -- Una sola disputa por reserva (v1): si se resolvió y el dueño sigue
  -- disconforme, es un tema de soporte humano, no de abrir otra disputa.
  unique (booking_id)
);

alter table public.booking_disputas enable row level security;

create policy "booking_disputas: select participants"
  on public.booking_disputas for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_disputas.booking_id
        and (auth.uid() = b.owner_id or auth.uid() = b.caregiver_id)
    )
  );

-- Solo el dueño de la reserva puede abrir una disputa. Las condiciones
-- finas (pago retenido, estado de la reserva) las valida el trigger de
-- abajo con mensajes claros.
create policy "booking_disputas: insert by owner"
  on public.booking_disputas for insert
  with check (
    auth.uid() = autor_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_disputas.booking_id
        and auth.uid() = b.owner_id
    )
  );

-- Sin policies de update/delete: resolver una disputa es solo-admin vía
-- service role (ver app/api/admin/disputas/resolver), mismo criterio que
-- payments y liquidaciones.

create index idx_booking_disputas_estado on public.booking_disputas (estado);

-- ============================================================
-- Trigger de apertura: valida las condiciones de negocio, fuerza los
-- campos que el cliente no puede elegir (mismo patrón anti-autoservicio
-- que forzar_verificacion_pendiente en 0015), y pasa la reserva a
-- 'disputado' en la misma transacción.
-- ============================================================
create or replace function public.abrir_disputa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_booking text;
  v_estado_pago text;
begin
  -- El cliente no decide el estado ni la resolución de su propia disputa.
  new.estado := 'abierta';
  new.resolucion := null;
  new.notas_admin := null;
  new.resuelto_por := null;
  new.resuelta_at := null;

  if new.motivo is null or length(trim(new.motivo)) < 10 then
    raise exception
      'Contanos qué pasó con un poco más de detalle (mínimo 10 caracteres).'
      using errcode = 'P0001';
  end if;

  select estado into v_estado_booking
  from public.bookings where id = new.booking_id;

  if v_estado_booking not in ('en_curso', 'completado') then
    raise exception
      'Solo se puede reportar un problema durante el cuidado o después de terminado.'
      using errcode = 'P0001';
  end if;

  select estado into v_estado_pago
  from public.payments where booking_id = new.booking_id;

  if v_estado_pago is distinct from 'retenido' then
    raise exception
      'El pago de esta reserva ya no está retenido, no se puede abrir una disputa — escribinos a soporte.'
      using errcode = 'P0001';
  end if;

  update public.bookings
  set estado = 'disputado'
  where id = new.booking_id;

  return new;
end;
$$;

drop trigger if exists trg_abrir_disputa on public.booking_disputas;
create trigger trg_abrir_disputa
  before insert on public.booking_disputas
  for each row
  execute function public.abrir_disputa();
