import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_EXPIRES = 60 * 10; // 10 minutos, mismo criterio que el resto de la app

const MEDIO_PAGO_LABEL: Record<string, string> = {
  transferencia_bancaria: "Transferencia bancaria",
  efectivo: "Efectivo",
  otro: "Otro",
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Detalle de UNA liquidación propia. La policy "liquidaciones: select
 * own" (migración 0029) ya garantiza que un cuidador solo pueda ver la
 * suya — no hace falta filtrar por caregiver_id acá, si el id es de otro
 * cuidador esta consulta simplemente no devuelve nada.
 */
export default async function CuidadorPagoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("/cuidador/pagos");
  const { id } = await params;
  const supabase = await createClient();

  const { data: liquidacion } = await supabase
    .from("liquidaciones")
    .select(
      "id, caregiver_id, monto_total, estado, medio_pago, comprobante_url, created_at, pagada_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!liquidacion || liquidacion.caregiver_id !== user.id) {
    notFound();
  }

  const { data: items } = await supabase
    .from("liquidacion_items")
    .select("id, payment_id, monto")
    .eq("liquidacion_id", id);

  const paymentIds = (items ?? []).map((i) => i.payment_id);
  const { data: payments } = paymentIds.length
    ? await supabase.from("payments").select("id, booking_id").in("id", paymentIds)
    : { data: [] as { id: string; booking_id: string }[] };
  const paymentBookingMap = new Map((payments ?? []).map((p) => [p.id, p.booking_id]));

  const bookingIds = [...new Set(payments?.map((p) => p.booking_id) ?? [])];
  const { data: bookingsInfo } = bookingIds.length
    ? await supabase
        .from("bookings")
        .select("id, owner_id, pet_id, fecha_inicio, fecha_fin")
        .in("id", bookingIds)
    : {
        data: [] as {
          id: string;
          owner_id: string;
          pet_id: string;
          fecha_inicio: string;
          fecha_fin: string;
        }[],
      };
  const bookingMap = new Map((bookingsInfo ?? []).map((b) => [b.id, b]));

  const ownerIds = [...new Set((bookingsInfo ?? []).map((b) => b.owner_id))];
  const petIds = [...new Set((bookingsInfo ?? []).map((b) => b.pet_id))];
  const [{ data: owners }, { data: pets }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, nombre").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string | null }[] }),
    petIds.length
      ? supabase.from("pets").select("id, nombre").in("id", petIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);
  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.nombre]));
  const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));

  let comprobanteUrl: string | null = null;
  if (liquidacion.comprobante_url) {
    const { data } = await supabase.storage
      .from("comprobantes-liquidacion")
      .createSignedUrl(liquidacion.comprobante_url, SIGNED_URL_EXPIRES);
    comprobanteUrl = data?.signedUrl ?? null;
  }

  return (
    <div>
      <a href="/cuidador/pagos" className="text-sm text-brand hover:underline">
        ← Tus pagos
      </a>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          ${Number(liquidacion.monto_total).toFixed(0)}
        </h1>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            liquidacion.estado === "pagada"
              ? "bg-accent/15 text-accent"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {liquidacion.estado === "pagada" ? "Pagada" : "Pendiente"}
        </span>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        Creada el {formatFecha(liquidacion.created_at)}
        {liquidacion.pagada_at && ` · Pagada el ${formatFecha(liquidacion.pagada_at)}`}
      </p>

      {liquidacion.estado === "pendiente" && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
          Ya está armada, el equipo todavía tiene que hacer la
          transferencia. Cuando la hagan vas a ver acá el comprobante.
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Reservas incluidas</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-foreground/10">
          {items && items.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-foreground/5 text-foreground/60">
                <tr>
                  <th className="px-4 py-2">Mascota / dueño</th>
                  <th className="px-4 py-2">Fechas</th>
                  <th className="px-4 py-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const bookingId = paymentBookingMap.get(item.payment_id);
                  const booking = bookingId ? bookingMap.get(bookingId) : null;
                  return (
                    <tr key={item.id} className="border-t border-foreground/10">
                      <td className="px-4 py-2">
                        {booking
                          ? `${petMap.get(booking.pet_id) ?? "Mascota"} de ${
                              ownerMap.get(booking.owner_id) ?? "dueño"
                            }`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-foreground/70">
                        {booking ? `${booking.fecha_inicio} → ${booking.fecha_fin}` : "—"}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        ${Number(item.monto).toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-foreground/60">Sin items.</p>
          )}
        </div>
      </div>

      {liquidacion.estado === "pagada" && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Comprobante</h2>
          <div className="mt-3 rounded-2xl border border-foreground/10 p-5">
            <p className="text-sm">
              Medio de pago:{" "}
              <strong>
                {liquidacion.medio_pago
                  ? MEDIO_PAGO_LABEL[liquidacion.medio_pago] ?? liquidacion.medio_pago
                  : "—"}
              </strong>
            </p>
            {comprobanteUrl ? (
              <a
                href={comprobanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-brand hover:underline"
              >
                Ver comprobante
              </a>
            ) : (
              <p className="mt-3 text-sm text-foreground/50">
                No se pudo generar el link del comprobante — recargá la página.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
