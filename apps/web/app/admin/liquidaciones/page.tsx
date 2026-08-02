import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Resumen de liquidaciones (pagos manuales del equipo a los cuidadores) —
 * ver migración 0029_liquidaciones.sql para el modelo completo. Junta:
 *   1. Cuánto hay "liberado" (payments.estado='liberado') pero todavía
 *      sin una liquidación creada, agrupado por cuidador.
 *   2. El historial de liquidaciones ya creadas (pendientes y pagadas).
 */
export default async function AdminLiquidacionesPage() {
  await requireUser("/admin/liquidaciones"); // el layout ya validó rol admin

  const supabase = createAdminClient();

  const [{ data: pagosLiberados }, { data: itemsExistentes }, { data: liquidaciones }] =
    await Promise.all([
      supabase
        .from("payments")
        .select("id, booking_id, monto, comision_pimi, liberado_at")
        .eq("estado", "liberado"),
      supabase.from("liquidacion_items").select("payment_id"),
      supabase
        .from("liquidaciones")
        .select("id, caregiver_id, monto_total, estado, medio_pago, created_at, pagada_at")
        .order("created_at", { ascending: false }),
    ]);

  const idsYaLiquidados = new Set((itemsExistentes ?? []).map((i) => i.payment_id));
  const pendientesLiquidar = (pagosLiberados ?? []).filter(
    (p) => !idsYaLiquidados.has(p.id),
  );

  const bookingIds = [...new Set(pendientesLiquidar.map((p) => p.booking_id))];
  const { data: bookingsInfo } = bookingIds.length
    ? await supabase.from("bookings").select("id, caregiver_id").in("id", bookingIds)
    : { data: [] as { id: string; caregiver_id: string }[] };
  const bookingCaregiverMap = new Map(
    (bookingsInfo ?? []).map((b) => [b.id, b.caregiver_id]),
  );

  type Grupo = {
    caregiverId: string;
    montoPendiente: number;
    cantidad: number;
    liberadoMasAntiguo: string | null;
  };
  const gruposMap = new Map<string, Grupo>();
  for (const p of pendientesLiquidar) {
    const caregiverId = bookingCaregiverMap.get(p.booking_id);
    if (!caregiverId) continue;
    const aCobrar = Number(p.monto) - Number(p.comision_pimi);
    const g = gruposMap.get(caregiverId) ?? {
      caregiverId,
      montoPendiente: 0,
      cantidad: 0,
      liberadoMasAntiguo: null,
    };
    g.montoPendiente += aCobrar;
    g.cantidad += 1;
    if (p.liberado_at && (!g.liberadoMasAntiguo || p.liberado_at < g.liberadoMasAntiguo)) {
      g.liberadoMasAntiguo = p.liberado_at;
    }
    gruposMap.set(caregiverId, g);
  }
  const grupos = [...gruposMap.values()].sort(
    (a, b) => b.montoPendiente - a.montoPendiente,
  );

  const caregiverIds = [
    ...new Set([
      ...grupos.map((g) => g.caregiverId),
      ...(liquidaciones ?? []).map((l) => l.caregiver_id),
    ]),
  ];
  const { data: profilesData } = caregiverIds.length
    ? await supabase.from("profiles").select("id, nombre, email").in("id", caregiverIds)
    : { data: [] as { id: string; nombre: string | null; email: string }[] };
  const nombreMap = new Map(
    (profilesData ?? []).map((p) => [p.id, p.nombre || p.email]),
  );

  const totalPendienteLiquidar = grupos.reduce((sum, g) => sum + g.montoPendiente, 0);
  const liquidacionesPendientes = (liquidaciones ?? []).filter(
    (l) => l.estado === "pendiente",
  );
  const totalPagadoHistorico = (liquidaciones ?? [])
    .filter((l) => l.estado === "pagada")
    .reduce((sum, l) => sum + Number(l.monto_total), 0);

  const metrics = [
    { label: "Pendiente de liquidar", value: `$${totalPendienteLiquidar.toFixed(0)}` },
    { label: "Cuidadores con saldo pendiente", value: grupos.length },
    { label: "Liquidaciones creadas sin pagar", value: liquidacionesPendientes.length },
    { label: "Pagado histórico", value: `$${totalPagadoHistorico.toFixed(0)}` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Liquidaciones</h1>
      <p className="mt-1 text-background/60">
        Pagos del equipo a los cuidadores por fuera de la app (v1: siempre
        manuales, ver 0009_payments_mercadopago.sql). Acá se arma el
        registro y se adjunta el comprobante de cada transferencia.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-background/15 p-6">
            <p className="text-sm text-background/60">{m.label}</p>
            <p className="mt-1 text-3xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Pendientes de liquidar</h2>
        <p className="mt-1 text-xs text-background/50">
          Plata ya liberada (pasaron las 48hs post-cuidado y un admin la
          liberó desde el resumen) pero que todavía no forma parte de
          ninguna liquidación.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {grupos.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Cuidador</th>
                  <th className="px-4 py-2">Pagos</th>
                  <th className="px-4 py-2">Monto pendiente</th>
                  <th className="px-4 py-2">Liberado desde</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.caregiverId} className="border-t border-background/10">
                    <td className="px-4 py-2">
                      {nombreMap.get(g.caregiverId) ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-background/70">{g.cantidad}</td>
                    <td className="px-4 py-2 font-medium">
                      ${g.montoPendiente.toFixed(0)}
                    </td>
                    <td className="px-4 py-2 text-background/70">
                      {g.liberadoMasAntiguo ? formatFecha(g.liberadoMasAntiguo) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <a
                        href={`/admin/liquidaciones/nueva?cuidador=${g.caregiverId}`}
                        className="inline-block rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
                      >
                        Crear liquidación
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-background/60">
              No hay pagos liberados sin liquidar ahora mismo.
            </p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Historial de liquidaciones</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {liquidaciones && liquidaciones.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Cuidador</th>
                  <th className="px-4 py-2">Monto</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Creada</th>
                  <th className="px-4 py-2">Pagada</th>
                </tr>
              </thead>
              <tbody>
                {liquidaciones.map((l) => (
                  <tr key={l.id} className="border-t border-background/10">
                    <td className="px-4 py-2">
                      <a
                        href={`/admin/liquidaciones/${l.id}`}
                        className="text-brand hover:underline"
                      >
                        {nombreMap.get(l.caregiver_id) ?? "—"}
                      </a>
                    </td>
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
                    <td className="px-4 py-2 text-background/70">
                      {formatFecha(l.created_at)}
                    </td>
                    <td className="px-4 py-2 text-background/70">
                      {l.pagada_at ? formatFecha(l.pagada_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-background/60">
              Todavía no se creó ninguna liquidación.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
