import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook de Mercado Pago. Configurar esta URL
 * (https://tu-dominio/api/mercadopago/webhook) en el panel de MP o vía el
 * campo notification_url de la preferencia (ya se manda en
 * create-preference/route.ts).
 *
 * MP puede notificar de varias formas según la integración; acá cubrimos
 * el caso más común: query params `type`/`topic` + `data.id` o `id`. Ante
 * la duda, siempre volvemos a consultar el pago real a la API de MP en vez
 * de confiar en el body de la notificación (así evitamos falsificaciones:
 * un POST cualquiera no puede "inventar" un pago aprobado).
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const paymentId =
    url.searchParams.get("data.id") ?? url.searchParams.get("id");

  // También puede venir en el body en vez de query params.
  let bodyPaymentId: string | null = null;
  try {
    const body = await request.json();
    bodyPaymentId = body?.data?.id ? String(body.data.id) : null;
  } catch {
    // Body vacío o no-JSON: no es un error, algunas notificaciones de MP
    // vienen sin body.
  }

  const resolvedPaymentId = paymentId ?? bodyPaymentId;

  if (type !== "payment" || !resolvedPaymentId) {
    // No es una notificación de pago (puede ser de merchant_order u otro
    // tipo) — respondemos 200 igual para que MP no reintente indefinidamente.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[Pimi] Webhook de MP recibido sin MERCADOPAGO_ACCESS_TOKEN configurado.");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const mpResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${resolvedPaymentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!mpResponse.ok) {
    console.error(
      "[Pimi] No se pudo consultar el pago en MP:",
      await mpResponse.text(),
    );
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  const payment = await mpResponse.json();
  const bookingId = payment.external_reference as string | undefined;
  const status = payment.status as string | undefined;

  if (!bookingId) {
    console.error("[Pimi] Pago de MP sin external_reference:", payment.id);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();

  if (status === "approved") {
    const { data: booking } = await admin
      .from("bookings")
      .select("fecha_fin")
      .eq("id", bookingId)
      .maybeSingle();

    // Se libera 48hs después del fin del cuidado (garantía para el dueño:
    // tiempo de reportar un problema antes de que se le pague al cuidador).
    const fechaLiberacion = booking?.fecha_fin
      ? new Date(
          new Date(`${booking.fecha_fin}T00:00:00Z`).getTime() +
            48 * 60 * 60 * 1000,
        ).toISOString()
      : null;

    const { error } = await admin
      .from("payments")
      .update({
        estado: "retenido",
        mp_payment_id: String(payment.id),
        fecha_liberacion: fechaLiberacion,
      })
      .eq("booking_id", bookingId);

    if (error) {
      console.error("[Pimi] Error actualizando payments desde webhook:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  } else if (status === "rejected" || status === "cancelled") {
    await admin
      .from("payments")
      .update({ estado: "pendiente", mp_payment_id: String(payment.id) })
      .eq("booking_id", bookingId);
  }
  // Otros estados (in_process, pending, etc.): no hacemos nada todavía,
  // MP va a mandar una notificación nueva cuando cambie de estado.

  return NextResponse.json({ ok: true });
}
