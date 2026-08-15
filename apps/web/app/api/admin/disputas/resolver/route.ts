import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Resuelve una disputa abierta (solo admin). Dos salidas posibles:
 *
 *   - "reembolso": el dueño tenía razón. payments → 'reembolsado',
 *     bookings → 'cancelado' (motivo 'disputa_reembolsada'). La
 *     devolución REAL de la plata por Mercado Pago es un paso manual del
 *     equipo en v1, igual que las liquidaciones — esto solo la registra.
 *
 *   - "liberar": el cuidador cumplió. payments → 'liberado' (entra al
 *     circuito normal de liquidaciones), bookings → 'completado' (así
 *     ambas partes pueden dejar reseña).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.app_metadata as { role?: string } | null)?.role;
  if (!user || role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const disputaId = body?.disputaId as string | undefined;
  const resolucion = body?.resolucion as string | undefined;
  const notas = body?.notas as string | undefined;

  if (!disputaId || !resolucion || !["reembolso", "liberar"].includes(resolucion)) {
    return NextResponse.json(
      { error: "Falta la disputa o la resolución elegida." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: disputa } = await admin
    .from("booking_disputas")
    .select("id, booking_id, estado")
    .eq("id", disputaId)
    .maybeSingle();

  if (!disputa) {
    return NextResponse.json({ error: "Disputa no encontrada." }, { status: 404 });
  }
  if (disputa.estado !== "abierta") {
    return NextResponse.json(
      { error: "Esta disputa ya fue resuelta." },
      { status: 400 },
    );
  }

  // 1) El pago primero: es el paso con plata en juego. Se exige que siga
  //    'retenido' — si no lo está, algo raro pasó y conviene frenar acá.
  const nuevoEstadoPago = resolucion === "reembolso" ? "reembolsado" : "liberado";
  const { data: pagoActualizado, error: pagoError } = await admin
    .from("payments")
    .update({
      estado: nuevoEstadoPago,
      ...(resolucion === "liberar"
        ? { liberado_at: new Date().toISOString() }
        : {}),
    })
    .eq("booking_id", disputa.booking_id)
    .eq("estado", "retenido")
    .select("id");

  if (pagoError || !pagoActualizado || pagoActualizado.length === 0) {
    console.error("[Pimi] Error actualizando pago al resolver disputa:", pagoError);
    return NextResponse.json(
      { error: "No pudimos actualizar el pago — verificá que siga retenido." },
      { status: 500 },
    );
  }

  // 2) La reserva sale de 'disputado'.
  const { error: bookingError } = await admin
    .from("bookings")
    .update(
      resolucion === "reembolso"
        ? { estado: "cancelado", motivo_cancelacion: "disputa_reembolsada" }
        : { estado: "completado" },
    )
    .eq("id", disputa.booking_id)
    .eq("estado", "disputado");

  if (bookingError) {
    console.error("[Pimi] Error actualizando reserva al resolver disputa:", bookingError);
    return NextResponse.json(
      { error: "El pago se actualizó pero la reserva no — revisar a mano." },
      { status: 500 },
    );
  }

  // 3) La disputa queda cerrada con su resolución.
  const { error: disputaError } = await admin
    .from("booking_disputas")
    .update({
      estado: "resuelta",
      resolucion: resolucion === "reembolso" ? "reembolso" : "liberado_al_cuidador",
      notas_admin: notas?.trim() || null,
      resuelto_por: user.id,
      resuelta_at: new Date().toISOString(),
    })
    .eq("id", disputaId);

  if (disputaError) {
    console.error("[Pimi] Error cerrando disputa:", disputaError);
    return NextResponse.json(
      { error: "Se resolvió el pago pero la disputa no quedó cerrada — revisar a mano." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
