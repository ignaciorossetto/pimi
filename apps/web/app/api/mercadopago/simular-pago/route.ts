import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { calcularComision } from "@/lib/payments/comision";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Simula la aprobación de un pago SIN tocar Mercado Pago — pensado para
 * probar el flujo completo de reserva (aceptar → pagar → check-in →
 * reseña) mientras el proyecto no tiene credenciales reales configuradas.
 *
 * Doble candado, no solo el toggle de admin:
 *   1. NODE_ENV === "production" bloquea esto SIEMPRE, sin importar lo que
 *      diga app_settings. Así, si alguien se olvida el toggle prendido y
 *      despliega a producción, este endpoint sigue sin hacer nada.
 *   2. Si igual estamos en dev/preview, se respeta el toggle de admin
 *      (payments_simulation_mode) — si está apagado, tampoco simula nada.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Los pagos de prueba no están disponibles en producción." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: setting } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "payments_simulation_mode")
    .maybeSingle();

  const simulacionActiva = Boolean(
    (setting?.value as { enabled?: boolean } | null)?.enabled,
  );

  if (!simulacionActiva) {
    return NextResponse.json(
      { error: "El modo de pago de prueba no está activado desde /admin." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const bookingId = body?.bookingId as string | undefined;

  if (!bookingId) {
    return NextResponse.json({ error: "Falta bookingId." }, { status: 400 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, owner_id, caregiver_id, monto, estado, fecha_fin")
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

  const fechaLiberacion = booking.fecha_fin
    ? new Date(
        new Date(`${booking.fecha_fin}T00:00:00Z`).getTime() +
          48 * 60 * 60 * 1000,
      ).toISOString()
    : null;

  const { error } = await admin.from("payments").upsert(
    {
      booking_id: booking.id,
      proveedor: "mercado_pago",
      monto,
      comision_pimi: comision,
      estado: "retenido",
      mp_payment_id: `simulado-${randomUUID()}`,
      fecha_liberacion: fechaLiberacion,
    },
    { onConflict: "booking_id" },
  );

  if (error) {
    console.error("[Pimi] Error simulando pago:", error);
    return NextResponse.json(
      { error: "No pudimos simular el pago." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
