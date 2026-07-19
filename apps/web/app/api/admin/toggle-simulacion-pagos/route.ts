import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Prende/apaga el modo simulación de pagos (solo admin). Ver
 * supabase/migrations/0012_app_settings.sql y
 * app/api/mercadopago/simular-pago/route.ts para el resto del mecanismo.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.app_metadata as { role?: string } | null)?.role;
  if (!user || role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "payments_simulation_mode")
    .maybeSingle();

  const enabledNow = Boolean(
    (current?.value as { enabled?: boolean } | null)?.enabled,
  );

  const { error } = await admin.from("app_settings").upsert({
    key: "payments_simulation_mode",
    value: { enabled: !enabledNow },
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[Pimi] Error actualizando app_settings:", error);
    return NextResponse.json(
      { error: "No pudimos cambiar la configuración." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, enabled: !enabledNow });
}
