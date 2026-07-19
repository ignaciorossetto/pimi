import { NextRequest, NextResponse } from "next/server";
import { calcularComision } from "@/lib/payments/comision";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Crea una preferencia de Checkout Pro para que el dueño pague una reserva
 * ya aceptada por el cuidador. Pimi cobra el 100% a su propia cuenta de
 * Mercado Pago (no se usa split payments/marketplace_fee): el registro en
 * `payments` es lo que controla cuándo se considera retenido y liberado,
 * la parte del cuidador se le paga por fuera en v1 (ver docs/02-arquitectura-tecnica.md).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bookingId = body?.bookingId as string | undefined;

  if (!bookingId) {
    return NextResponse.json({ error: "Falta bookingId." }, { status: 400 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, owner_id, caregiver_id, monto, estado")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Reserva no encontrada." },
      { status: 404 },
    );
  }

  if (booking.estado !== "aceptado") {
    return NextResponse.json(
      { error: "La reserva todavía no fue aceptada por el cuidador." },
      { status: 400 },
    );
  }

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id, estado")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingPayment && existingPayment.estado !== "pendiente") {
    return NextResponse.json(
      { error: "Esta reserva ya tiene un pago registrado." },
      { status: 400 },
    );
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "Mercado Pago no está configurado (falta MERCADOPAGO_ACCESS_TOKEN en el servidor).",
      },
      { status: 500 },
    );
  }

  // La comisión depende del tier del cuidador (ver migración 0011: baja
  // de 20% a medida que acumula reseñas con buen puntaje). Se lee en el
  // momento de pagar, no se congela en ningún lado antes — si el cuidador
  // subió de tier entre la solicitud y el pago, se lleva la comisión nueva.
  const { data: caregiverProfile } = await supabase
    .from("caregiver_profiles")
    .select("comision_pct")
    .eq("user_id", booking.caregiver_id)
    .maybeSingle();

  const monto = Number(booking.monto);
  const comision = calcularComision(
    monto,
    caregiverProfile?.comision_pct
      ? Number(caregiverProfile.comision_pct)
      : undefined,
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const preferenceBody = {
    items: [
      {
        id: booking.id,
        title: `Cuidado de mascota en Pimi (reserva ${booking.id.slice(0, 8)})`,
        quantity: 1,
        unit_price: monto,
        currency_id: "ARS",
      },
    ],
    external_reference: booking.id,
    back_urls: {
      success: `${siteUrl}/reservas/${booking.id}?pago=exito`,
      pending: `${siteUrl}/reservas/${booking.id}?pago=pendiente`,
      failure: `${siteUrl}/reservas/${booking.id}?pago=error`,
    },
    auto_return: "approved",
    notification_url: `${siteUrl}/api/mercadopago/webhook`,
  };

  let preference: { id: string; init_point: string };

  try {
    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferenceBody),
      },
    );

    if (!mpResponse.ok) {
      const detail = await mpResponse.text();
      console.error("[Pimi] Error creando preferencia de MP:", detail);
      return NextResponse.json(
        {
          error:
            "No pudimos iniciar el pago con Mercado Pago. Probá de nuevo en unos minutos.",
        },
        { status: 502 },
      );
    }

    preference = await mpResponse.json();
  } catch (err) {
    console.error("[Pimi] Error de red hablando con Mercado Pago:", err);
    return NextResponse.json(
      { error: "No pudimos conectar con Mercado Pago." },
      { status: 502 },
    );
  }

  // Se usa el cliente admin acá porque payments no tiene policy de
  // insert/update para usuarios autenticados a propósito (ver migración
  // 0009). La autorización real ya se validó arriba (owner_id === user.id).
  const admin = createAdminClient();
  const { error: upsertError } = await admin.from("payments").upsert(
    {
      booking_id: booking.id,
      proveedor: "mercado_pago",
      monto,
      comision_pimi: comision,
      estado: "pendiente",
      mp_preference_id: preference.id,
    },
    { onConflict: "booking_id" },
  );

  if (upsertError) {
    console.error("[Pimi] Error guardando payments:", upsertError);
    return NextResponse.json(
      { error: "No pudimos registrar el pago. Probá de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ initPoint: preference.init_point });
}
