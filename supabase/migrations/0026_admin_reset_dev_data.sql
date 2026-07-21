-- Pimi — función para vaciar datos de prueba desde el panel admin
-- mientras estamos en desarrollo (antes de lanzar a producción).
--
-- Vacía TODO lo que cuelga de reservas: mensajes, pagos, reviews,
-- check-ins, notificaciones, y también mascotas / perfiles de cuidador /
-- verificaciones / solicitudes de cambio de domicilio / eventos.
--
-- A propósito NO toca:
--   - auth.users / public.profiles: eso se borra aparte, desde el route
--     handler (app/api/admin/reset-db/route.ts) usando la Admin API de
--     Supabase Auth — así no escribimos nunca directo sobre el schema
--     "auth", que es manejado por Supabase.
--   - public.app_settings: es configuración de la app (ej. modo
--     simulación de pagos), no datos de prueba.
--
-- Solo ejecutable por el rol "service_role" — el route handler que la
-- llama además está bloqueado si NODE_ENV=production, así que esto no
-- se puede disparar por accidente contra datos reales.

create or replace function public.admin_truncate_test_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table
    public.notification_log,
    public.message_reads,
    public.messages,
    public.booking_checkins,
    public.payments,
    public.reviews,
    public.bookings,
    public.pets,
    public.caregiver_profiles,
    public.identity_verifications,
    public.caregiver_address_change_requests,
    public.events
  restart identity cascade;
end;
$$;

revoke execute on function public.admin_truncate_test_data() from public, anon, authenticated;
grant execute on function public.admin_truncate_test_data() to service_role;
