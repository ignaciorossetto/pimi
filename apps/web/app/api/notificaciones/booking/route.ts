import { NextRequest, NextResponse } from "next/server";
import {
  notificarEventoBooking,
  type EventoBooking,
} from "@/lib/notifications/eventos";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint que los componentes cliente "pinguean" después de una mutación
 * exitosa (crear solicitud, aceptar, check-in, disputa) para disparar el
 * email del evento. Las mutaciones en sí se hacen directo contra Supabase
 * con RLS — este endpoint solo notifica.
 *
 * No confía en el cliente para NADA salvo el par (bookingId, tipo):
 *   - exige sesión y que el que llama sea participante de la reserva, con
 *     el rol correcto para ese evento (el dueño no puede disparar
 *     "solicitud_aceptada", etc.);
 *   - notificarEventoBooking después re-verifica contra la base que el
 *     estado real coincida con el evento, y deduplica vía notification_log.
 *
 * "pago_confirmado" NO está permitido desde acá a propósito: lo disparan
 * solo el webhook de Mercado Pago y el simulador (server-side).
 */

const EVENTOS_POR_ROL: Record<string, "owner" | "caregiver"> = {
  solicitud_nueva: "owner",
  solicitud_aceptada: "caregiver",
  solicitud_rechazada: "caregiver",
  checkin_llegada: "caregiver",
  checkin_salida: "caregiver",
  disputa_abierta: "owner",
};

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
  const tipo = body?.tipo as string | undefined;

  if (!bookingId || !tipo || !(tipo in EVENTOS_POR_ROL)) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  // El cliente autenticado solo ve la reserva si es participante (RLS).
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, owner_id, caregiver_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  }

  const rolRequerido = EVENTOS_POR_ROL[tipo];
  const esElRolCorrecto =
    rolRequerido === "owner"
      ? booking.owner_id === user.id
      : booking.caregiver_id === user.id;

  if (!esElRolCorrecto) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { sent } = await notificarEventoBooking(bookingId, tipo as EventoBooking);
  return NextResponse.json({ ok: true, sent });
}
