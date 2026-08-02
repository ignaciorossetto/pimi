import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Crea una liquidación (pago del equipo a un cuidador) juntando uno o más
 * pagos ya liberados. La validación "fuerte" (que estén liberados, que
 * sean de este cuidador, que ninguno esté ya liquidado) vive en la
 * función de base crear_liquidacion (migración 0029) — acá solo se
 * valida la sesión/rol admin y se le pasan los datos, para no duplicar
 * esa lógica en dos lugares.
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
  const caregiverId = body?.caregiverId as string | undefined;
  const paymentIds = body?.paymentIds as string[] | undefined;

  if (!caregiverId || !paymentIds || paymentIds.length === 0) {
    return NextResponse.json(
      { error: "Falta el cuidador o los pagos a liquidar." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: liquidacionId, error } = await admin.rpc("crear_liquidacion", {
    p_caregiver_id: caregiverId,
    p_payment_ids: paymentIds,
    p_creado_por: user.id,
  });

  if (error) {
    console.error("[Pimi] Error creando liquidación:", error);
    return NextResponse.json(
      {
        error: error.message.startsWith("Alguno de los pagos")
          ? error.message
          : "No pudimos crear la liquidación.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, liquidacionId });
}
