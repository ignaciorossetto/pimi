import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Libera manualmente un pago retenido (v1: el pago real al cuidador -su
 * parte del monto- es un paso manual del equipo por fuera de la app; este
 * endpoint solo actualiza el registro para reflejar que ya se hizo).
 * Protegido por rol admin, igual que el resto de /admin.
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
  const paymentId = body?.paymentId as string | undefined;

  if (!paymentId) {
    return NextResponse.json({ error: "Falta paymentId." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("payments")
    .update({ estado: "liberado", liberado_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("estado", "retenido");

  if (error) {
    console.error("[Pimi] Error liberando pago:", error);
    return NextResponse.json(
      { error: "No pudimos liberar el pago." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
