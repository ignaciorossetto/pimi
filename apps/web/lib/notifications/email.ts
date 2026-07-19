/**
 * Envío de emails vía Resend (elegido en docs/02-arquitectura-tecnica.md).
 * Se usa fetch directo a su API REST en vez de instalar el SDK de Resend
 * — mismo criterio que con Mercado Pago: evita sumar una dependencia npm
 * para algo que es un solo POST.
 *
 * Si RESEND_API_KEY no está configurada, no falla: loguea y no envía.
 * Así el resto de la app (y el cron) funciona igual en un entorno sin el
 * proveedor de email configurado todavía.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[Pimi] RESEND_API_KEY no configurada — no se envía "${subject}" a ${to}.`,
    );
    return { sent: false };
  }

  const from = process.env.RESEND_FROM_EMAIL || "Pimi <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      console.error("[Pimi] Error enviando email:", await res.text());
      return { sent: false };
    }

    return { sent: true };
  } catch (err) {
    console.error("[Pimi] Error de red enviando email:", err);
    return { sent: false };
  }
}
