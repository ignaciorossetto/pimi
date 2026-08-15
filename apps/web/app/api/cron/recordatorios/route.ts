import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/notifications/email";
import { eventoEmail, recordatorioCuidadoEmail } from "@/lib/notifications/templates";
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

  // ============================================================
  // Paso 0: vencer solicitudes viejas. Una solicitud 'solicitado' cuya
  // fecha de inicio ya pasó no tiene ningún futuro posible (el cuidador
  // nunca respondió) — sin esto quedaban vivas para siempre ensuciando
  // los paneles de dueño y cuidador (auditoría, punto A4). El motivo
  // propio permite mostrarle al dueño un mensaje claro, distinto del
  // rechazo explícito y del 'otro_cuidador_elegido' de la migración 0024.
  // ============================================================
  const hoy = fechaISOEnNDias(0);
  const { data: vencidas } = await admin
    .from("bookings")
    .update({ estado: "cancelado", motivo_cancelacion: "vencida_sin_respuesta" })
    .eq("estado", "solicitado")
    .lt("fecha_inicio", hoy)
    .select("id");
  const solicitudesVencidas = vencidas?.length ?? 0;

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

  // ============================================================
  // Paso final: resumen diario de pendientes para el equipo admin
  // (auditoría, punto A8). Solo se manda si HAY algo pendiente — un
  // email diario de "todo en cero" entrena a ignorar la casilla. Los
  // destinatarios se buscan por app_metadata.role === 'admin' (la misma
  // fuente de verdad que usa /admin), nada hardcodeado.
  // ============================================================
  let resumenEnviado = false;
  const [
    { count: verificacionesPendientes },
    { count: cambiosDomicilio },
    { count: disputasAbiertas },
    { count: sinCheckin },
    { data: liberados },
    { data: yaLiquidados },
  ] = await Promise.all([
    admin
      .from("identity_verifications")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente"),
    admin
      .from("caregiver_address_change_requests")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente"),
    admin
      .from("booking_disputas")
      .select("*", { count: "exact", head: true })
      .eq("estado", "abierta"),
    admin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("estado", ["aceptado", "en_curso"])
      .lt("fecha_fin", hoy),
    admin.from("payments").select("id, monto, comision_pimi").eq("estado", "liberado"),
    admin.from("liquidacion_items").select("payment_id"),
  ]);

  const liquidadosSet = new Set((yaLiquidados ?? []).map((i) => i.payment_id));
  const pendienteLiquidar = (liberados ?? [])
    .filter((p) => !liquidadosSet.has(p.id))
    .reduce((sum, p) => sum + (Number(p.monto) - Number(p.comision_pimi)), 0);

  const items = [
    { label: "Verificaciones de identidad", valor: verificacionesPendientes ?? 0 },
    { label: "Cambios de domicilio", valor: cambiosDomicilio ?? 0 },
    { label: "Disputas abiertas", valor: disputasAbiertas ?? 0 },
    { label: "Reservas sin check-in vencidas", valor: sinCheckin ?? 0 },
    {
      label: "Pendiente de liquidar",
      valor: pendienteLiquidar > 0 ? `$${pendienteLiquidar.toFixed(0)}` : 0,
    },
  ].filter((i) => i.valor !== 0);

  if (items.length > 0) {
    const { data: usersData } = await admin.auth.admin.listUsers();
    const adminEmails = (usersData?.users ?? [])
      .filter(
        (u) => (u.app_metadata as { role?: string } | null)?.role === "admin",
      )
      .map((u) => u.email)
      .filter((e): e is string => Boolean(e));

    if (adminEmails.length > 0) {
      const lista = items
        .map((i) => `• ${i.label}: <strong>${i.valor}</strong>`)
        .join("<br/>");
      const { subject, html } = eventoEmail({
        nombreDestinatario: "equipo",
        titulo: `Pimi admin: ${items.length} tema${items.length === 1 ? "" : "s"} esperando revisión`,
        cuerpo: `Esto está pendiente en el panel hoy:<br/><br/>${lista}`,
        ctaUrl: `${siteUrl}/admin`,
        ctaLabel: "Abrir el panel",
      });
      for (const email of adminEmails) {
        const result = await sendEmail({ to: email, subject, html });
        if (result.sent) resumenEnviado = true;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    evaluados,
    enviados,
    solicitudesVencidas,
    resumenEnviado,
  });
}
