import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/notifications/email";
import { recordatorioCuidadoEmail } from "@/lib/notifications/templates";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron diario: recordatorios de cuidado próximo a empezar (3 días antes,
 * 1 día antes, el mismo día), para dueño y cuidador. Pensado para
 * ejecutarse una vez por día vía Vercel Cron (ver vercel.json) — Vercel
 * agrega automáticamente el header `Authorization: Bearer <CRON_SECRET>`
 * cuando la env var CRON_SECRET está configurada en el proyecto, así que
 * eso es lo único que valida quién puede pegarle a este endpoint.
 *
 * Solo se le manda recordatorio a reservas 'aceptado' con pago
 * retenido/liberado (confirmadas y pagadas) — no tiene sentido recordarle
 * a nadie un cuidado que todavía no se pagó.
 *
 * Idempotente: notification_log guarda qué se mandó, así que si el cron
 * se reintenta o corre dos veces el mismo día no duplica emails.
 */

const DIAS_RECORDATORIO = [3, 1, 0] as const;
const TIPO_POR_DIAS: Record<number, string> = {
  3: "recordatorio_3d",
  1: "recordatorio_1d",
  0: "recordatorio_hoy",
};

function fechaISOEnNDias(dias: number): string {
  const hoy = new Date();
  const objetivo = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + dias),
  );
  return objetivo.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let enviados = 0;
  let evaluados = 0;

  for (const dias of DIAS_RECORDATORIO) {
    const fechaObjetivo = fechaISOEnNDias(dias);
    const tipo = TIPO_POR_DIAS[dias];

    const { data: bookings } = await admin
      .from("bookings")
      .select("id, owner_id, caregiver_id, pet_id, fecha_inicio, fecha_fin")
      .eq("estado", "aceptado")
      .eq("fecha_inicio", fechaObjetivo);

    if (!bookings || bookings.length === 0) continue;

    const bookingIds = bookings.map((b) => b.id);

    const { data: paidPayments } = await admin
      .from("payments")
      .select("booking_id")
      .in("booking_id", bookingIds)
      .in("estado", ["retenido", "liberado"]);

    const paidSet = new Set((paidPayments ?? []).map((p) => p.booking_id));
    const elegibles = bookings.filter((b) => paidSet.has(b.id));

    if (elegibles.length === 0) continue;

    const petIds = [...new Set(elegibles.map((b) => b.pet_id))];
    const userIds = [
      ...new Set(elegibles.flatMap((b) => [b.owner_id, b.caregiver_id])),
    ];

    const [{ data: pets }, { data: profiles }] = await Promise.all([
      admin.from("pets").select("id, nombre").in("id", petIds),
      admin.from("profiles").select("id, nombre, email").in("id", userIds),
    ]);

    const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));
    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p]),
    );

    for (const booking of elegibles) {
      const owner = profileMap.get(booking.owner_id);
      const caregiver = profileMap.get(booking.caregiver_id);
      const mascotaNombre = petMap.get(booking.pet_id) ?? "tu mascota";
      const bookingUrl = `${siteUrl}/reservas/${booking.id}`;

      const destinatarios: Array<{
        userId: string;
        email: string;
        nombre: string;
        otroNombre: string;
        rol: "dueño" | "cuidador";
      }> = [];

      if (owner?.email) {
        destinatarios.push({
          userId: booking.owner_id,
          email: owner.email,
          nombre: owner.nombre || "vecino/a",
          otroNombre: caregiver?.nombre || "el cuidador",
          rol: "dueño",
        });
      }
      if (caregiver?.email) {
        destinatarios.push({
          userId: booking.caregiver_id,
          email: caregiver.email,
          nombre: caregiver.nombre || "cuidador/a",
          otroNombre: owner?.nombre || "el dueño",
          rol: "cuidador",
        });
      }

      for (const dest of destinatarios) {
        evaluados++;

        const { data: yaEnviado } = await admin
          .from("notification_log")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("destinatario_id", dest.userId)
          .eq("tipo", tipo)
          .maybeSingle();

        if (yaEnviado) continue;

        const { subject, html } = recordatorioCuidadoEmail({
          nombreDestinatario: dest.nombre,
          otroNombre: dest.otroNombre,
          mascotaNombre,
          fechaInicio: booking.fecha_inicio,
          fechaFin: booking.fecha_fin,
          bookingUrl,
          rol: dest.rol,
          diasFaltantes: dias as 3 | 1 | 0,
        });

        const result = await sendEmail({ to: dest.email, subject, html });

        if (result.sent) {
          await admin.from("notification_log").insert({
            booking_id: booking.id,
            destinatario_id: dest.userId,
            tipo,
          });
          enviados++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, evaluados, enviados });
}
