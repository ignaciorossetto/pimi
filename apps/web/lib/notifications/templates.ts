/**
 * Plantillas de email de recordatorio (días previos al inicio del
 * cuidado). Estilo inline consistente con
 * supabase/email-templates/confirm-signup.html — los emails no pueden
 * usar las CSS vars de globals.css, así que los colores de marca van
 * hardcodeados acá.
 */
type Rol = "dueño" | "cuidador";

type ReminderInput = {
  nombreDestinatario: string;
  otroNombre: string;
  mascotaNombre: string;
  fechaInicio: string;
  fechaFin: string;
  bookingUrl: string;
  rol: Rol;
  diasFaltantes: 3 | 1 | 0;
};

function formatFechaAR(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function recordatorioCuidadoEmail({
  nombreDestinatario,
  otroNombre,
  mascotaNombre,
  fechaInicio,
  fechaFin,
  bookingUrl,
  rol,
  diasFaltantes,
}: ReminderInput) {
  const cuando =
    diasFaltantes === 0 ? "hoy" : diasFaltantes === 1 ? "mañana" : `en ${diasFaltantes} días`;

  const subject =
    rol === "dueño"
      ? `El cuidado de ${mascotaNombre} empieza ${cuando}`
      : `Tenés un cuidado que empieza ${cuando}`;

  const cuerpo =
    rol === "dueño"
      ? `El cuidado de <strong>${mascotaNombre}</strong> con ${otroNombre} empieza ${cuando} (${formatFechaAR(fechaInicio)}). Aprovechá para coordinar los últimos detalles (comida, horarios, cuidados especiales) por el chat de la reserva.`
      : `Tenés el cuidado de <strong>${mascotaNombre}</strong> (de ${otroNombre}) que empieza ${cuando} (${formatFechaAR(fechaInicio)}). No te olvides de marcar la llegada con foto y ubicación apenas arranques.`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <p style="font-size: 13px; color: #ff7a45; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 12px;">Pimi</p>
  <h1 style="font-size: 20px; margin: 0 0 16px; line-height: 1.3;">Hola, ${nombreDestinatario} 👋</h1>
  <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">${cuerpo}</p>
  <a href="${bookingUrl}" style="display: inline-block; background: #ff7a45; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; font-size: 14px;">Ver la reserva</a>
  <p style="margin-top: 28px; font-size: 12px; color: #888888;">${fechaInicio} → ${fechaFin}</p>
  <p style="margin-top: 24px; font-size: 11px; color: #aaaaaa;">Te llega este email porque tenés una reserva activa en Pimi.</p>
</div>`.trim();

  return { subject, html };
}
