-- Pimi — ampliar notification_log para los emails de eventos
-- (auditoría docs/05-auditoria-backlog.md, punto A3)
--
-- Hasta ahora notification_log solo conocía los 3 recordatorios del cron
-- (0013). Los emails de eventos (nueva solicitud, aceptada/rechazada,
-- pago confirmado, check-ins, disputa) usan el mismo mecanismo de
-- idempotencia: el unique (booking_id, destinatario_id, tipo) garantiza
-- que cada evento se notifique UNA sola vez aunque el cliente pinguee el
-- endpoint dos veces (doble click, retry, o un usuario malicioso — el
-- endpoint valida contra la base que el evento ocurrió de verdad, pero
-- la no-duplicación la garantiza esta tabla).

alter table public.notification_log
  drop constraint if exists notification_log_tipo_check;

alter table public.notification_log
  add constraint notification_log_tipo_check
    check (tipo in (
      'recordatorio_3d',
      'recordatorio_1d',
      'recordatorio_hoy',
      'solicitud_nueva',
      'solicitud_aceptada',
      'solicitud_rechazada',
      'pago_confirmado',
      'checkin_llegada',
      'checkin_salida',
      'disputa_abierta'
    ));
