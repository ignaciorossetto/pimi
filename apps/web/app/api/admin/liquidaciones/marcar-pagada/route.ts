import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB, igual que el bucket
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MEDIOS_PAGO = ["transferencia_bancaria", "efectivo", "otro"];

/**
 * Marca una liquidación 'pendiente' como 'pagada' y sube el comprobante de
 * la transferencia. Se hace acá (route handler + service role) en vez de
 * subida directa desde el cliente porque el bucket "comprobantes-liquidacion"
 * (migración 0029) a propósito no tiene policy de insert para
 * "authenticated" — solo el cliente con service role puede escribir ahí,
 * el cuidador solo puede leer su propia carpeta.
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

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const liquidacionId = formData.get("liquidacionId");
  const medioPago = formData.get("medioPago");
  const notas = formData.get("notas");
  const comprobante = formData.get("comprobante");

  if (typeof liquidacionId !== "string" || !liquidacionId) {
    return NextResponse.json({ error: "Falta la liquidación." }, { status: 400 });
  }
  if (typeof medioPago !== "string" || !MEDIOS_PAGO.includes(medioPago)) {
    return NextResponse.json({ error: "Elegí un medio de pago válido." }, { status: 400 });
  }
  if (!(comprobante instanceof File) || comprobante.size === 0) {
    return NextResponse.json(
      { error: "Adjuntá el comprobante de la transferencia." },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.includes(comprobante.type)) {
    return NextResponse.json(
      { error: "El comprobante tiene que ser una imagen o un PDF." },
      { status: 400 },
    );
  }
  if (comprobante.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El comprobante no puede pesar más de 8MB." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: liquidacion } = await admin
    .from("liquidaciones")
    .select("id, caregiver_id, estado")
    .eq("id", liquidacionId)
    .maybeSingle();

  if (!liquidacion) {
    return NextResponse.json({ error: "Liquidación no encontrada." }, { status: 404 });
  }
  if (liquidacion.estado !== "pendiente") {
    return NextResponse.json(
      { error: "Esta liquidación ya está marcada como pagada." },
      { status: 400 },
    );
  }

  const ext = comprobante.name.split(".").pop() || "pdf";
  const path = `${liquidacion.caregiver_id}/${liquidacion.id}-${randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("comprobantes-liquidacion")
    .upload(path, comprobante, {
      cacheControl: "3600",
      upsert: false,
      contentType: comprobante.type,
    });

  if (uploadError) {
    console.error("[Pimi] Error subiendo comprobante de liquidación:", uploadError);
    return NextResponse.json(
      { error: "No pudimos subir el comprobante. Probá de nuevo." },
      { status: 500 },
    );
  }

  const { error: updateError } = await admin
    .from("liquidaciones")
    .update({
      estado: "pagada",
      medio_pago: medioPago,
      comprobante_url: path,
      notas_admin: typeof notas === "string" && notas.trim() ? notas.trim() : null,
      pagada_at: new Date().toISOString(),
    })
    .eq("id", liquidacionId)
    .eq("estado", "pendiente");

  if (updateError) {
    console.error("[Pimi] Error marcando liquidación pagada:", updateError);
    return NextResponse.json(
      { error: "Subimos el comprobante, pero no pudimos actualizar la liquidación." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
