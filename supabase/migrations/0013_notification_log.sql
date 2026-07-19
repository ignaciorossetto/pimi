-- Pimi — log de notificaciones enviadas (recordatorios de cuidado)
--
-- Registra qué recordatorio ya se le mandó a quién para no duplicar
-- envíos si el cron corre más de una vez o se reintenta. Es contabilidad
-- interna: no hay ninguna policy de select/insert para
-- anon/authenticated a propósito — solo lo toca el cliente admin desde
-- app/api/cron/recordatorios/route.ts.

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  destinatario_id uuid not null references public.profiles (id),
  tipo text not null check (tipo in ('recordatorio_3d', 'recordatorio_1d', 'recordatorio_hoy')),
  sent_at timestamptz not null default now(),
  unique (booking_id, destinatario_id, tipo)
);

alter table public.notification_log enable row level security;

create index idx_notification_log_booking on public.notification_log (booking_id);
