-- Pimi — detección de intentos de saltear la plataforma en el chat.
--
-- Heurística por patrones (no bloquea el envío, evita frustrar a
-- alguien con un falso positivo sin soporte para apelar): si un mensaje
-- contiene algo que parece un teléfono, un email, o menciona canales/
-- pagos por fuera de la app, se registra un evento para que el admin
-- lo revise en /admin. Punto de reemplazo claro si en el futuro se
-- quiere cambiar esto por un chequeo semántico con un modelo de
-- lenguaje: la función de abajo, nada más.

create or replace function public.flag_suspicious_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flag boolean := false;
begin
  if new.contenido ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    v_flag := true;
  elsif regexp_replace(new.contenido, '[^0-9]', '', 'g') ~ '[0-9]{8,}' then
    v_flag := true;
  elsif new.contenido ~* '(whatsapp|\bwsp\b|instagram|\btelegram\b|mercado ?pago|transferencia|efectivo|fuera de (la )?app|sin pimi)' then
    v_flag := true;
  end if;

  if v_flag then
    insert into public.events (user_id, tipo_evento, metadata)
    values (
      new.autor_id,
      'mensaje_flageado',
      jsonb_build_object(
        'booking_id', new.booking_id,
        'message_id', new.id,
        'preview', left(new.contenido, 140)
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_message_insert_flag on public.messages;

create trigger on_message_insert_flag
  after insert on public.messages
  for each row
  execute function public.flag_suspicious_message();
