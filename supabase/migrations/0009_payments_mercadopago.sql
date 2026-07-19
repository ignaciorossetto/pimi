-- Pimi — pagos vía Mercado Pago (retención y liberación manual)
--
-- Modelo elegido (ver docs/02-arquitectura-tecnica.md para el detalle):
-- Pimi cobra el 100% del monto a SU PROPIA cuenta de Mercado Pago (checkout
-- normal, sin split payments/marketplace_fee), y controla desde esta tabla
-- cuándo se considera "retenido" y cuándo "liberado". El pago real al
-- cuidador (su parte, monto - comision_pimi) es un paso manual en v1 (no
-- una transferencia automática) — ver nota en el doc de arquitectura.
--
-- Se descartó deliberadamente invertir el dinero retenido en algún
-- instrumento mientras está en tránsito: eso excede lo que se puede
-- implementar sin asesoramiento legal/regulatorio específico (régimen de
-- proveedores de servicios de pago del BCRA / CNV). Acá solo se registra
-- el estado de custodia, nada de inversión.

alter table public.payments
  add column if not exists mp_payment_id text,
  add column if not exists mp_preference_id text,
  add column if not exists fecha_liberacion timestamptz,
  add column if not exists liberado_at timestamptz;

-- Un pago por reserva en v1 (simplifica todo el flujo de estado).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_booking_id_key'
  ) then
    alter table public.payments
      add constraint payments_booking_id_key unique (booking_id);
  end if;
end $$;

create index if not exists idx_payments_booking on public.payments (booking_id);
create index if not exists idx_payments_estado on public.payments (estado);

-- Nota de RLS: a propósito NO se agregan policies de insert/update para
-- usuarios autenticados. Los únicos escritores de esta tabla son:
--   1. El route handler del webhook de Mercado Pago (usa el cliente admin
--      con service role, bypassea RLS).
--   2. El panel de admin al liberar un pago manualmente (también admin
--      client).
-- La policy de select ya existente ("payments: select participants",
-- 0001_init.sql) sigue alcanzando para que dueño y cuidador vean el
-- estado de su propio pago.
