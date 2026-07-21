import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { LiberarPagoButton } from "@/components/admin/LiberarPagoButton";
import { SimulacionPagosToggle } from "@/components/admin/SimulacionPagosToggle";
import { VerificationReviewActions } from "@/components/admin/VerificationReviewActions";
import { AddressChangeReviewActions } from "@/components/admin/AddressChangeReviewActions";

const SIGNED_URL_EXPIRES = 60 * 10; // 10 minutos, alcanza para revisar

export default async function AdminHomePage() {
  await requireUser("/admin"); // el layout ya validó rol admin

  const supabase = createAdminClient();

  const [
    { count: usersCount },
    { count: pendingVerifications },
    { count: activeBookings },
    { count: eventsCount },
    { count: flaggedCount },
    { count: pendingAddressChanges },
    { count: caregiversCount },
    { count: ownersCount },
    { count: petsCount },
    { data: pendingList },
    { data: pendingAddressList },
    { data: flaggedList },
    { data: pagosRetenidos },
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
      .from("caregiver_address_change_requests")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente"),
    supabase.from("caregiver_profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .contains("roles", ["dueño"]),
    supabase.from("pets").select("*", { count: "exact", head: true }),
    supabase
      .from("identity_verifications")
      .select(
        // "identity_verifications" tiene DOS columnas que apuntan a
        // "profiles" (user_id y revisado_por), así que hay que decirle a
        // PostgREST cuál usar acá (profiles!user_id) — con "profiles(email)"
        // a secas la consulta es ambigua, tira error y esta lista queda
        // vacía aunque haya verificaciones pendientes.
        "id, dni_numero, dni_frente, dni_dorso, selfie, comprobante_domicilio, created_at, profiles!user_id(email)",
      )
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true })
      .limit(10),
    supabase
      .from("caregiver_address_change_requests")
      .select(
        "id, domicilio_calle, domicilio_numero, domicilio_piso_depto, domicilio_barrio, domicilio_ciudad, tipo_vivienda, comprobante_domicilio, created_at, profiles!user_id(email)",
      )
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true })
      .limit(10),
    supabase
      .from("events")
      .select("created_at, metadata, profiles(email)")
      .eq("tipo_evento", "mensaje_flageado")
      .order("created_at", { ascending: false })
      .limit(10),
    // Todos los pagos retenidos, no solo los vencidos — antes este filtro
    // (.lte fecha_liberacion) dejaba afuera cualquier pago retenido cuyo
    // cuidado todavía no había terminado, así que el admin no tenía forma
    // de ver esa plata en ningún lado del panel.
    supabase
      .from("payments")
      .select("id, booking_id, monto, comision_pimi, fecha_liberacion")
      .eq("estado", "retenido")
      .order("fecha_liberacion", { ascending: true })
      .limit(50),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "payments_simulation_mode")
      .maybeSingle(),
  ]);

  const ahora = new Date();
  const totalRetenido = (pagosRetenidos ?? []).reduce(
    (sum, p) => sum + Number(p.monto),
    0,
  );

  const metrics: { label: string; value: number | string; href?: string }[] = [
    { label: "Usuarios totales", value: usersCount ?? 0 },
    { label: "Cuidadores registrados", value: caregiversCount ?? 0, href: "/admin/cuidadores" },
    { label: "Dueños registrados", value: ownersCount ?? 0, href: "/admin/duenos" },
    { label: "Mascotas registradas", value: petsCount ?? 0 },
    { label: "Verificaciones pendientes", value: pendingVerifications ?? 0 },
    { label: "Cambios de domicilio pendientes", value: pendingAddressChanges ?? 0 },
    { label: "Reservas activas", value: activeBookings ?? 0 },
    { label: "Plata retenida", value: `$${totalRetenido}` },
    { label: "Mensajes marcados", value: flaggedCount ?? 0 },
    { label: "Eventos registrados", value: eventsCount ?? 0 },
  ];

  const simulacionActiva = Boolean(
    (simulacionSetting?.value as { enabled?: boolean } | null)?.enabled,
  );

  const bookingIds = [...new Set((pagosRetenidos ?? []).map((p) => p.booking_id))];
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

  async function signedUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    const { data } = await supabase.storage
      .from("verificaciones")
      .createSignedUrl(path, SIGNED_URL_EXPIRES);
    return data?.signedUrl ?? null;
  }

  const pendingWithUrls = await Promise.all(
    (pendingList ?? []).map(async (row) => {
      const [dniFrenteUrl, dniDorsoUrl, selfieUrl, comprobanteUrl] = await Promise.all([
        signedUrl(row.dni_frente),
        signedUrl(row.dni_dorso),
        signedUrl(row.selfie),
        signedUrl(row.comprobante_domicilio),
      ]);
      return { ...row, dniFrenteUrl, dniDorsoUrl, selfieUrl, comprobanteUrl };
    }),
  );

  const pendingAddressWithUrls = await Promise.all(
    (pendingAddressList ?? []).map(async (row) => {
      const comprobanteUrl = await signedUrl(row.comprobante_domicilio);
      return { ...row, comprobanteUrl };
    }),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Panel de administración</h1>
      <p className="mt-1 text-background/60">Métricas generales de Pimi.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((m) =>
          m.href ? (
            <a
              key={m.label}
              href={m.href}
              className="rounded-2xl border border-background/15 p-6 transition hover:border-brand/40 hover:bg-background/5"
            >
              <p className="text-sm text-background/60">{m.label}</p>
              <p className="mt-1 text-3xl font-bold">{m.value}</p>
            </a>
          ) : (
            <div
              key={m.label}
              className="rounded-2xl border border-background/15 p-6"
            >
              <p className="text-sm text-background/60">{m.label}</p>
              <p className="mt-1 text-3xl font-bold">{m.value}</p>
            </div>
          ),
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Herramientas de desarrollo</h2>
        <div className="mt-3">
          <SimulacionPagosToggle enabled={simulacionActiva} />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Pagos retenidos</h2>
        <p className="mt-1 text-xs text-background/50">
          Toda la plata que Pimi tiene retenida ahora mismo. "Vencido"
          significa que ya pasaron las 48hs post-cuidado y se puede liberar
          — liberar acá es un registro manual, todavía hay que pagarle al
          cuidador su parte por fuera de la app en v1.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {pagosRetenidos && pagosRetenidos.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Cuidador</th>
                  <th className="px-4 py-2">Mascota</th>
                  <th className="px-4 py-2">A liberar</th>
                  <th className="px-4 py-2">Liberación</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pagosRetenidos.map((p) => {
                  const booking = bookingMap.get(p.booking_id);
                  const aLiberar = Number(p.monto) - Number(p.comision_pimi);
                  const vencido = Boolean(
                    p.fecha_liberacion && new Date(p.fecha_liberacion) <= ahora,
                  );
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
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            vencido
                              ? "bg-brand/15 text-brand"
                              : "bg-background/10 text-background/60"
                          }`}
                        >
                          {vencido
                            ? "Vencido, listo para liberar"
                            : p.fecha_liberacion
                              ? `Programado ${new Date(p.fecha_liberacion).toLocaleDateString("es-AR")}`
                              : "Sin fecha"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {vencido && <LiberarPagoButton paymentId={p.id} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-background/60">
              No hay pagos retenidos ahora mismo.
            </p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Verificaciones pendientes</h2>
        <p className="mt-1 text-xs text-background/50">
          Revisión manual de DNI, selfie y comprobante de domicilio. Los
          links a los documentos valen 10 minutos (URLs firmadas del bucket
          privado "verificaciones") — si vencen, recargá la página.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {pendingWithUrls.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">DNI</th>
                  <th className="px-4 py-2">Documentos</th>
                  <th className="px-4 py-2">Solicitado</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pendingWithUrls.map((row) => {
                  const email =
                    (row.profiles as { email: string }[] | null)?.[0]?.email ?? "—";
                  return (
                    <tr key={row.id} className="border-t border-background/10 align-top">
                      <td className="px-4 py-2">{email}</td>
                      <td className="px-4 py-2">{row.dni_numero ?? "—"}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1">
                          {row.dniFrenteUrl && (
                            <a
                              href={row.dniFrenteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand hover:underline"
                            >
                              DNI frente
                            </a>
                          )}
                          {row.dniDorsoUrl && (
                            <a
                              href={row.dniDorsoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand hover:underline"
                            >
                              DNI dorso
                            </a>
                          )}
                          {row.selfieUrl && (
                            <a
                              href={row.selfieUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand hover:underline"
                            >
                              Selfie
                            </a>
                          )}
                          {row.comprobanteUrl && (
                            <a
                              href={row.comprobanteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand hover:underline"
                            >
                              Comprobante de domicilio
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {new Date(row.created_at).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-2">
                        <VerificationReviewActions verificationId={row.id} />
                      </td>
                    </tr>
                  );
                })}
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
          Cambios de domicilio pendientes
        </h2>
        <p className="mt-1 text-xs text-background/50">
          El cuidador ya está verificado, pero pidió mudar su domicilio.
          Revisá el comprobante nuevo antes de aprobar — al aprobar se
          reemplaza el domicilio verificado que tenía.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {pendingAddressWithUrls.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Domicilio nuevo</th>
                  <th className="px-4 py-2">Comprobante</th>
                  <th className="px-4 py-2">Solicitado</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pendingAddressWithUrls.map((row) => {
                  const email =
                    (row.profiles as { email: string }[] | null)?.[0]?.email ?? "—";
                  const domicilio = [
                    row.domicilio_calle && row.domicilio_numero
                      ? `${row.domicilio_calle} ${row.domicilio_numero}`
                      : row.domicilio_calle,
                    row.domicilio_piso_depto,
                    row.domicilio_barrio,
                    row.domicilio_ciudad,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <tr key={row.id} className="border-t border-background/10 align-top">
                      <td className="px-4 py-2">{email}</td>
                      <td className="px-4 py-2">
                        {domicilio || "—"}
                        {row.tipo_vivienda && (
                          <span className="text-background/50">
                            {" "}
                            · {row.tipo_vivienda}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {row.comprobanteUrl && (
                          <a
                            href={row.comprobanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand hover:underline"
                          >
                            Ver comprobante
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(row.created_at).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-2">
                        <AddressChangeReviewActions requestId={row.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-background/60">
              No hay cambios de domicilio pendientes.
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
