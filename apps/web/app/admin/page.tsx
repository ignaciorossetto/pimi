import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { LiberarPagoButton } from "@/components/admin/LiberarPagoButton";
import { SimulacionPagosToggle } from "@/components/admin/SimulacionPagosToggle";

export default async function AdminHomePage() {
  await requireUser("/admin"); // el layout ya validó rol admin

  const supabase = createAdminClient();

  const [
    { count: usersCount },
    { count: pendingVerifications },
    { count: activeBookings },
    { count: eventsCount },
    { count: flaggedCount },
    { data: pendingList },
    { data: flaggedList },
    { data: pagosParaLiberar },
    { data: simulacionSetting },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("identity_verifications")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente"),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("estado", ["solicitado", "aceptado", "en_curso"]),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("tipo_evento", "mensaje_flageado"),
    supabase
      .from("identity_verifications")
      .select("tipo_documento, created_at, profiles(email)")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true })
      .limit(10),
    supabase
      .from("events")
      .select("created_at, metadata, profiles(email)")
      .eq("tipo_evento", "mensaje_flageado")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("payments")
      .select("id, booking_id, monto, comision_pimi, fecha_liberacion")
      .eq("estado", "retenido")
      .lte("fecha_liberacion", new Date().toISOString())
      .order("fecha_liberacion", { ascending: true })
      .limit(20),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "payments_simulation_mode")
      .maybeSingle(),
  ]);

  const metrics = [
    { label: "Usuarios totales", value: usersCount ?? 0 },
    { label: "Verificaciones pendientes", value: pendingVerifications ?? 0 },
    { label: "Reservas activas", value: activeBookings ?? 0 },
    { label: "Mensajes marcados", value: flaggedCount ?? 0 },
    { label: "Eventos registrados", value: eventsCount ?? 0 },
  ];

  const simulacionActiva = Boolean(
    (simulacionSetting?.value as { enabled?: boolean } | null)?.enabled,
  );

  const bookingIds = [...new Set((pagosParaLiberar ?? []).map((p) => p.booking_id))];
  const { data: bookingsInfo } = bookingIds.length
    ? await supabase
        .from("bookings")
        .select("id, caregiver_id, pet_id, fecha_fin")
        .in("id", bookingIds)
    : { data: [] as { id: string; caregiver_id: string; pet_id: string; fecha_fin: string }[] };

  const caregiverIds = [...new Set((bookingsInfo ?? []).map((b) => b.caregiver_id))];
  const petIds = [...new Set((bookingsInfo ?? []).map((b) => b.pet_id))];

  const [{ data: caregivers }, { data: pets }] = await Promise.all([
    caregiverIds.length
      ? supabase.from("profiles").select("id, nombre, email").in("id", caregiverIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string | null; email: string }[] }),
    petIds.length
      ? supabase.from("pets").select("id, nombre").in("id", petIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);

  const bookingMap = new Map((bookingsInfo ?? []).map((b) => [b.id, b]));
  const caregiverMap = new Map((caregivers ?? []).map((c) => [c.id, c.nombre || c.email]));
  const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));

  return (
    <div>
      <h1 className="text-2xl font-bold">Panel de administración</h1>
      <p className="mt-1 text-background/60">Métricas generales de Pimi.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-background/15 p-6"
          >
            <p className="text-sm text-background/60">{m.label}</p>
            <p className="mt-1 text-3xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Herramientas de desarrollo</h2>
        <div className="mt-3">
          <SimulacionPagosToggle enabled={simulacionActiva} />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Pagos a liberar</h2>
        <p className="mt-1 text-xs text-background/50">
          Reservas con pago retenido cuya fecha de liberación (48hs después
          del cuidado) ya pasó. Liberar acá es un registro manual — todavía
          hay que pagarle al cuidador su parte por fuera de la app en v1.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {pagosParaLiberar && pagosParaLiberar.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Cuidador</th>
                  <th className="px-4 py-2">Mascota</th>
                  <th className="px-4 py-2">A liberar</th>
                  <th className="px-4 py-2">Vencido desde</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pagosParaLiberar.map((p) => {
                  const booking = bookingMap.get(p.booking_id);
                  const aLiberar = Number(p.monto) - Number(p.comision_pimi);
                  return (
                    <tr key={p.id} className="border-t border-background/10">
                      <td className="px-4 py-2">
                        {booking ? caregiverMap.get(booking.caregiver_id) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {booking ? petMap.get(booking.pet_id) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-2 font-medium">${aLiberar}</td>
                      <td className="px-4 py-2">
                        {p.fecha_liberacion
                          ? new Date(p.fecha_liberacion).toLocaleDateString("es-AR")
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <LiberarPagoButton paymentId={p.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-background/60">
              No hay pagos pendientes de liberar.
            </p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Verificaciones pendientes</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {pendingList && pendingList.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Documento</th>
                  <th className="px-4 py-2">Solicitado</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map(
                  (
                    row: {
                      tipo_documento: string;
                      created_at: string;
                      profiles: { email: string }[] | null;
                    },
                    i: number,
                  ) => (
                    <tr key={i} className="border-t border-background/10">
                      <td className="px-4 py-2">
                        {row.profiles?.[0]?.email ?? "—"}
                      </td>
                      <td className="px-4 py-2">{row.tipo_documento}</td>
                      <td className="px-4 py-2">
                        {new Date(row.created_at).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-background/60">
              No hay verificaciones pendientes.
            </p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">
          Mensajes marcados (posible intento de saltear la app)
        </h2>
        <p className="mt-1 text-xs text-background/50">
          Detección por patrones (teléfonos, emails, palabras clave), no por
          IA todavía. Revisar y contactar a los usuarios si hace falta.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {flaggedList && flaggedList.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Usuario</th>
                  <th className="px-4 py-2">Vista previa</th>
                  <th className="px-4 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {flaggedList.map(
                  (
                    row: {
                      created_at: string;
                      metadata: { preview?: string } | null;
                      profiles: { email: string }[] | null;
                    },
                    i: number,
                  ) => (
                    <tr key={i} className="border-t border-background/10">
                      <td className="px-4 py-2">
                        {row.profiles?.[0]?.email ?? "—"}
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-background/70">
                        {row.metadata?.preview ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(row.created_at).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-background/60">
              No hay mensajes marcados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
