import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Panel de pagos del cuidador: cuánto tiene retenido (con fecha estimada
 * de liberación), cuánto ya está liberado pero todavía sin una
 * liquidación armada, cuánto cobró en total histórico, y el historial de
 * liquidaciones (cada una con su comprobante, ver /cuidador/pagos/[id]).
 */
export default async function CuidadorPagosPage() {
  const user = await requireUser("/cuidador/pagos");
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, owner_id, pet_id, fecha_inicio, fecha_fin")
    .eq("caregiver_id", user.id);

  const bookingIds = (bookings ?? []).map((b) => b.id);
  const bookingMap = new Map((bookings ?? []).map((b) => [b.id, b]));

  const [{ data: payments }, { data: liquidaciones }] = await Promise.all([
    bookingIds.length
      ? supabase
          .from("payments")
          .select("id, booking_id, estado, monto, comision_pimi, fecha_liberacion")
          .in("booking_id", bookingIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            booking_id: string;
            estado: string;
            monto: number;
            comision_pimi: number;
            fecha_liberacion: string | null;
          }[],
        }),
    supabase
      .from("liquidaciones")
      .select("id, monto_total, estado, medio_pago, created_at, pagada_at")
      .order("created_at", { ascending: false }),
  ]);

  const liquidacionIds = (liquidaciones ?? []).map((l) => l.id);
  const { data: items } = liquidacionIds.length
    ? await supabase
        .from("liquidacion_items")
        .select("payment_id")
        .in("liquidacion_id", liquidacionIds)
    : { data: [] as { payment_id: string }[] };
  const idsYaLiquidados = new Set((items ?? []).map((i) => i.payment_id));

  const ownerIds = [...new Set((bookings ?? []).map((b) => b.owner_id))];
  const petIds = [...new Set((bookings ?? []).map((b) => b.pet_id))];
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

  const retenidos = (payments ?? [])
    .filter((p) => p.estado === "retenido")
    .map((p) => ({ ...p, aCobrar: Number(p.monto) - Number(p.comision_pimi) }))
    .sort((a, b) => (a.fecha_liberacion ?? "").localeCompare(b.fecha_liberacion ?? ""));

  const liberadosSinLiquidar = (payments ?? []).filter(
    (p) => p.estado === "liberado" && !idsYaLiquidados.has(p.id),
  );

  const totalRetenido = retenidos.reduce((sum, p) => sum + p.aCobrar, 0);
  const totalLiberadoSinLiquidar = liberadosSinLiquidar.reduce(
    (sum, p) => sum + (Number(p.monto) - Number(p.comision_pimi)),
    0,
  );
  const totalCobradoHistorico = (liquidaciones ?? [])
    .filter((l) => l.estado === "pagada")
    .reduce((sum, l) => sum + Number(l.monto_total), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">Tus pagos</h1>
      <p className="mt-1 text-foreground/60">
        Pimi cobra el 100% de cada reserva y te paga tu parte por
        transferencia una vez liberado el cuidado — acá vas a ver cuándo y
        cuánto.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-foreground/10 p-6">
          <p className="text-sm text-foreground/60">Retenido (por cobrar)</p>
          <p className="mt-1 text-2xl font-bold">${totalRetenido.toFixed(0)}</p>
        </div>
        <div className="rounded-2xl border border-foreground/10 p-6">
          <p className="text-sm text-foreground/60">Liberado, aún sin liquidar</p>
          <p className="mt-1 text-2xl font-bold">
            ${totalLiberadoSinLiquidar.toFixed(0)}
          </p>
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
          <p className="text-sm text-foreground/60">Cobrado histórico</p>
          <p className="mt-1 text-2xl font-bold text-accent">
            ${totalCobradoHistorico.toFixed(0)}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Próximos cobros</h2>
        <p className="mt-1 text-xs text-foreground/50">
          Se liberan 48hs después de terminado el cuidado, como garantía
          para el dueño. Una vez liberados, un admin arma la transferencia
          — puede juntar varios cuidados en un mismo pago.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {retenidos.length > 0 ? (
            retenidos.map((p) => {
              const booking = bookingMap.get(p.booking_id);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-foreground/10 p-4 text-sm"
                >
                  <span>
                    {booking ? petMap.get(booking.pet_id) ?? "Mascota" : "Mascota"} de{" "}
                    {booking ? ownerMap.get(booking.owner_id) ?? "dueño" : "dueño"}
                  </span>
                  <span className="font-semibold text-accent">
                    ${p.aCobrar.toFixed(0)}{" "}
                    <span className="font-normal text-foreground/50">
                      hasta el {p.fecha_liberacion ? formatFecha(p.fecha_liberacion) : "—"}
                    </span>
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-foreground/60">No tenés cobros retenidos ahora.</p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Historial de liquidaciones</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-foreground/10">
          {liquidaciones && liquidaciones.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-foreground/5 text-foreground/60">
                <tr>
                  <th className="px-4 py-2">Monto</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {liquidaciones.map((l) => (
                  <tr key={l.id} className="border-t border-foreground/10">
                    <td className="px-4 py-2 font-medium">
                      ${Number(l.monto_total).toFixed(0)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          l.estado === "pagada"
                            ? "bg-accent/15 text-accent"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {l.estado === "pagada" ? "Pagada" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-foreground/70">
                      {l.pagada_at ? formatFecha(l.pagada_at) : formatFecha(l.created_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <a
                        href={`/cuidador/pagos/${l.id}`}
                        className="text-brand hover:underline"
                      >
                        Ver detalle
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-foreground/60">
              Todavía no tenés liquidaciones.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
