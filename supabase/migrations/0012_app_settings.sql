-- Pimi — configuración global simple (key/value)
--
-- Primer uso: un flag para activar "modo simulación de pagos" desde el
-- panel de admin, así se puede probar todo el flujo de reserva (aceptar,
-- check-in, reseñas) sin necesitar credenciales reales de Mercado Pago
-- mientras el proyecto todavía está en desarrollo.
--
-- Lectura pública (cualquier usuario logueado necesita saber si el modo
-- simulación está prendido para que /reservas/[id] muestre el botón
-- correcto), escritura SOLO vía cliente admin — no hay policy de
-- insert/update para authenticated/anon a propósito.

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "app_settings: public read"
  on public.app_settings for select
  using (true);

insert into public.app_settings (key, value)
values ('payments_simulation_mode', jsonb_build_object('enabled', false))
on conflict (key) do nothing;
