import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Aprueba o rechaza una verificación de identidad (DNI + domicilio).
 * Solo admin. Al aprobar, marca caregiver_profiles.verificado = true, que
 * es lo que efectivamente lo hace aparecer en búsquedas y habilita que
 * reciba reservas (ver migración 0016_caregiver_domicilio_gating.sql).
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
  const verificationId = body?.verificationId as string | undefined;
  const decision = body?.decision as "aprobado" | "rechazado" | undefined;
  const notas = (body?.notas as string | undefined)?.trim() || null;

  if (!verificationId || (decision !== "aprobado" && decision !== "rechazado")) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: verification } = await admin
    .from("identity_verifications")
    .select("id, user_id")
    .eq("id", verificationId)
    .maybeSingle();

  if (!verification) {
    return NextResponse.json(
      { error: "Verificación no encontrada." },
      { status: 404 },
    );
  }

  const { error: updateError } = await admin
    .from("identity_verifications")
    .update({
      estado: decision,
      revisado_por: user.id,
      reviewed_at: new Date().toISOString(),
      notas_admin: notas,
    })
    .eq("id", verificationId);

  if (updateError) {
    // Puede ser el índice único de DNI (ya hay otra cuenta aprobada con
    // el mismo número) — se lo mostramos tal cual al admin.
    const mensaje = updateError.message.includes("idx_identity_verifications_dni_aprobado")
      ? "Ese DNI ya está aprobado en otra cuenta."
      : "No pudimos actualizar la verificación.";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("caregiver_profiles")
    .update({ verificado: decision === "aprobado" })
    .eq("user_id", verification.user_id);

  if (profileError) {
    console.error("[Pimi] Error actualizando verificado:", profileError);
    return NextResponse.json(
      { error: "Se guardó la decisión pero no pudimos actualizar el perfil." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
