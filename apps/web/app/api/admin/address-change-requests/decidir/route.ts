import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Aprueba o rechaza una solicitud de cambio de domicilio (ver migración
 * 0022_domicilio_verificado_inmutable.sql). Solo admin.
 *
 * Al aprobar, aplica el domicilio nuevo a caregiver_profiles usando el
 * cliente admin (service role) — el trigger
 * bloquear_edicion_domicilio_verificado() deja pasar auth.role() =
 * 'service_role' sin chequear el domicilio anterior, así es como se aplica
 * un cambio de domicilio ya revisado sin tener que tocar el trigger.
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
  const requestId = body?.requestId as string | undefined;
  const decision = body?.decision as "aprobado" | "rechazado" | undefined;
  const notas = (body?.notas as string | undefined)?.trim() || null;

  if (!requestId || (decision !== "aprobado" && decision !== "rechazado")) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: solicitud } = await admin
    .from("caregiver_address_change_requests")
    .select(
      "id, user_id, domicilio_calle, domicilio_numero, domicilio_piso_depto, domicilio_barrio, domicilio_ciudad, tipo_vivienda, domicilio_lat, domicilio_lng, estado",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada." },
      { status: 404 },
    );
  }

  if (solicitud.estado !== "pendiente") {
    return NextResponse.json(
      { error: "Esta solicitud ya fue revisada." },
      { status: 400 },
    );
  }

  const { error: updateError } = await admin
    .from("caregiver_address_change_requests")
    .update({
      estado: decision,
      revisado_por: user.id,
      reviewed_at: new Date().toISOString(),
      notas_admin: notas,
    })
    .eq("id", requestId);

  if (updateError) {
    return NextResponse.json(
      { error: "No pudimos actualizar la solicitud." },
      { status: 400 },
    );
  }

  if (decision === "aprobado") {
    const zona = [solicitud.domicilio_barrio, solicitud.domicilio_ciudad]
      .filter(Boolean)
      .join(", ");

    const { error: profileError } = await admin
      .from("caregiver_profiles")
      .update({
        domicilio_calle: solicitud.domicilio_calle,
        domicilio_numero: solicitud.domicilio_numero,
        domicilio_piso_depto: solicitud.domicilio_piso_depto,
        domicilio_barrio: solicitud.domicilio_barrio,
        domicilio_ciudad: solicitud.domicilio_ciudad,
        tipo_vivienda: solicitud.tipo_vivienda,
        domicilio_lat: solicitud.domicilio_lat,
        domicilio_lng: solicitud.domicilio_lng,
        ...(zona ? { zona } : {}),
      })
      .eq("user_id", solicitud.user_id);

    if (profileError) {
      console.error(
        "[Pimi] Error aplicando cambio de domicilio aprobado:",
        profileError,
      );
      return NextResponse.json(
        {
          error:
            "Se guardó la decisión pero no pudimos aplicar el domicilio nuevo.",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
