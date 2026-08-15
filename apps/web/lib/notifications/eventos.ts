import { sendEmail } from "@/lib/notifications/email";
import { eventoEmail, formatFechaAR } from "@/lib/notifications/templates";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Emails de eventos del ciclo de vida de una reserva. SOLO código de
 * servidor (usa el cliente admin).
 *
 * Seguridad/robustez, en este orden:
 *   1. NO se confía en el que avisa: antes de mandar nada se re-lee la
 *      reserva y se verifica que su estado actual coincida con el evento
 *      declarado (ej. "solicitud_aceptada" solo si estado='aceptado').
 *      Un cliente malicioso no puede hacer que Pimi mande emails falsos.
 *   2. Idempotencia vía notification_log (unique booking_id +
 *      destinatario + tipo): el insert va ANTES del envío — si ya
 *      existía, no se manda de nuevo (doble click, retries, etc.).
 *   3. Nunca rompe el flujo que lo llama: cualquier error se loguea y
 *      devuelve { sent: false } — un email caído no puede tirar una
 *      reserva.
 */

export type EventoBooking =
  | "solicitud_nueva"
  | "solicitud_aceptada"
  | "solicitud_rechazada"
  | "pago_confirmado"
  | "checkin_llegada"
  | "checkin_salida"
  | "disputa_abierta";

export async function notificarEventoBooking(
  bookingId: string,
  tipo: EventoBooking,
): Promise<{ sent: boolean }> {
  try {
    const admin = createAdminClient();

    const { data: booking } = await admin
      .from("bookings")
      .select(
        "id, owner_id, caregiver_id, pet_id, fecha_inicio, fecha_fin, estado, motivo_cancelacion",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) return { sent: false };

    // 1) El estado real tiene que coincidir con el evento declarado.
    // NonNullable: maybeSingle() tipa booking como T | null, y aunque el
    // early-return de arriba ya lo descartó, el "typeof booking" dentro de
    // la anotación no hereda ese narrowing.
    const estadoEsperado: Record<
      EventoBooking,
      (b: NonNullable<typeof booking>) => boolean
    > = {
      solicitud_nueva: (b) => b.estado === "solicitado",
      solicitud_aceptada: (b) => b.estado === "aceptado",
      // Rechazo manual del cuidador: cancelado SIN motivo (los cancelados
      // automáticos llevan motivo, ej. 'otro_cuidador_elegido').
      solicitud_rechazada: (b) =>
        b.estado === "cancelado" && b.motivo_cancelacion == null,
      pago_confirmado: (b) =>
        b.estado === "aceptado" || b.estado === "en_curso",
      checkin_llegada: (b) => b.estado === "en_curso",
      checkin_salida: (b) => b.estado === "completado",
      disputa_abierta: (b) => b.estado === "disputado",
    };
    if (!estadoEsperado[tipo](booking)) return { sent: false };

    // pago_confirmado además exige que el pago esté efectivamente retenido.
    if (tipo === "pago_confirmado") {
      const { data: payment } = await admin
        .from("payments")
        .select("estado")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (payment?.estado !== "retenido") return { sent: false };
    }

    // 2) Destinatario según el evento.
    const paraElCuidador =
      tipo === "solicitud_nueva" ||
      tipo === "pago_confirmado" ||
      tipo === "disputa_abierta";
    const destinatarioId = paraElCuidador
      ? booking.caregiver_id
      : booking.owner_id;
    const otroId = paraElCuidador ? booking.owner_id : booking.caregiver_id;

    const [{ data: destinatario }, { data: otro }, { data: pet }] =
      await Promise.all([
        admin
          .from("profiles")
          .select("nombre, email")
          .eq("id", destinatarioId)
          .maybeSingle(),
        admin.from("profiles").select("nombre").eq("id", otroId).maybeSingle(),
        admin.from("pets").select("nombre").eq("id", booking.pet_id).maybeSingle(),
      ]);

    if (!destinatario?.email) return { sent: false };

    // 3) Idempotencia: reservar el "slot" ANTES de enviar. Si ya existía
    //    (23505 = unique violation), este evento ya se notificó.
    const { error: logError } = await admin.from("notification_log").insert({
      booking_id: bookingId,
      destinatario_id: destinatarioId,
      tipo,
    });
    if (logError) {
      if (logError.code !== "23505") {
        console.error("[Pimi] Error registrando notificación:", logError);
      }
      return { sent: false };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const bookingUrl = `${siteUrl}/reservas/${bookingId}`;
    const nombre = destinatario.nombre || "";
    const otroNombre = otro?.nombre || "la otra parte";
    const mascota = pet?.nombre || "tu mascota";
    const fechas = `${formatFechaAR(booking.fecha_inicio)} → ${formatFechaAR(booking.fecha_fin)}`;

    const contenido: Record<
      EventoBooking,
      { titulo: string; cuerpo: string; ctaLabel: string }
    > = {
      solicitud_nueva: {
        titulo: `Nueva solicitud: cuidar a ${mascota}`,
        cuerpo: `<strong>${otroNombre}</strong> quiere que cuides a <strong>${mascota}</strong> del ${fechas}. Entrá a ver los detalles y respondé cuanto antes — las solicitudes sin respuesta se pierden.`,
        ctaLabel: "Ver la solicitud",
      },
      solicitud_aceptada: {
        titulo: `${otroNombre} aceptó tu solicitud 🎉`,
        cuerpo: `Tu solicitud para el cuidado de <strong>${mascota}</strong> (${fechas}) fue aceptada. Falta un paso: completá el pago para confirmar la reserva — hasta entonces las fechas no quedan bloqueadas.`,
        ctaLabel: "Completar el pago",
      },
      solicitud_rechazada: {
        titulo: `${otroNombre} no puede esta vez`,
        cuerpo: `Tu solicitud para el cuidado de <strong>${mascota}</strong> (${fechas}) no fue aceptada. No pasa nada — hay más cuidadores disponibles en tu zona.`,
        ctaLabel: "Buscar otro cuidador",
      },
      pago_confirmado: {
        titulo: `Cuidado confirmado y pagado ✔`,
        cuerpo: `El cuidado de <strong>${mascota}</strong> (${fechas}) quedó confirmado: ${otroNombre} ya pagó y Pimi retiene el dinero. Cuando arranque el cuidado, no te olvides de marcar la llegada con foto y ubicación.`,
        ctaLabel: "Ver la reserva",
      },
      checkin_llegada: {
        titulo: `${mascota} ya está con ${otroNombre} 🐾`,
        cuerpo: `${otroNombre} marcó la llegada de <strong>${mascota}</strong> con foto y ubicación. Vas a recibir fotos diarias durante el cuidado — podés seguir todo desde la reserva.`,
        ctaLabel: "Ver el seguimiento",
      },
      checkin_salida: {
        titulo: `El cuidado de ${mascota} terminó`,
        cuerpo: `${otroNombre} marcó la salida de <strong>${mascota}</strong>. El pago se libera al cuidador en 48hs — si hubo algún problema, reportalo desde la reserva antes de ese plazo. Y no te olvides de dejar tu reseña.`,
        ctaLabel: "Dejar mi reseña",
      },
      disputa_abierta: {
        titulo: `Se reportó un problema con el cuidado de ${mascota}`,
        cuerpo: `${otroNombre} reportó un problema con el cuidado de <strong>${mascota}</strong> (${fechas}). El pago quedó congelado mientras el equipo de Pimi revisa el caso — te podemos contactar por email para escuchar tu versión.`,
        ctaLabel: "Ver la reserva",
      },
    };

    const c = contenido[tipo];
    const { subject, html } = eventoEmail({
      nombreDestinatario: nombre || destinatario.email.split("@")[0],
      titulo: c.titulo,
      cuerpo: c.cuerpo,
      ctaUrl:
        tipo === "solicitud_rechazada" ? `${siteUrl}/buscar-cuidador` : bookingUrl,
      ctaLabel: c.ctaLabel,
    });

    return await sendEmail({ to: destinatario.email, subject, html });
  } catch (err) {
    console.error("[Pimi] Error notificando evento de reserva:", err);
    return { sent: false };
  }
}
