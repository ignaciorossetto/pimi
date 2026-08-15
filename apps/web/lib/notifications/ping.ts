/**
 * Aviso fire-and-forget al endpoint de notificaciones después de una
 * mutación exitosa en un componente cliente. Nunca bloquea ni rompe el
 * flujo del usuario: si el email no sale, la acción principal (reserva,
 * check-in, etc.) ya está hecha igual.
 *
 * keepalive: true — varios de estos pings ocurren justo antes de un
 * router.push/refresh; sin keepalive el navegador cancelaría el fetch al
 * navegar y el email no saldría nunca.
 */
export function pingNotificacionBooking(bookingId: string, tipo: string) {
  try {
    void fetch("/api/notificaciones/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, tipo }),
      keepalive: true,
    });
  } catch {
    // Silencioso a propósito.
  }
}
