import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { CrearLiquidacionForm } from "@/components/admin/CrearLiquidacionForm";

export default async function NuevaLiquidacionPage({
  searchParams,
}: {
  searchParams: Promise<{ cuidador?: string }>;
}) {
  await requireUser("/admin/liquidaciones/nueva"); // el layout ya validó rol admin
  const { cuidador: caregiverId } = await searchParams;

  const supabase = createAdminClient();

  if (!caregiverId) {
    return (
      <div>
        <a href="/admin/liquidaciones" className="text-sm text-brand hover:underline">
          ← Liquidaciones
        </a>
        <h1 className="mt-3 text-2xl font-bold">Nueva liquidación</h1>
        <p className="mt-2 text-sm text-background/60">
          Elegí un cuidador desde la tabla de "Pendientes de liquidar" en{" "}
          <a href="/admin/liquidaciones" className="text-brand hover:underline">
            Liquidaciones
          </a>
          .
        </p>
      </div>
    );
  }

  const [{ data: profile }, { data: caregiverProfile }] = await Promise.all([
    supabase.from("profiles").select("nombre, email").eq("id", caregiverId).maybeSingle(),
    supabase
      .from("caregiver_profiles")
      .select("cbu_alias, titular_cuenta")
      .eq("user_id", caregiverId)
      .maybeSingle(),
  ]);

  // Los mismos pagos "liberados y sin liquidar" que arma /admin/liquidaciones,
  // pero filtrados a este cuidador — se recalcula acá en vez de pasarlo por
  // query params porque los montos/estados pueden haber cambiado entre que
  // el admin vio la lista y entró a esta pantalla.
  const [{ data: pagosLiberados }, { data: itemsExistentes }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, booking_id, monto, comision_pimi")
      .eq("estado", "liberado"),
    supabase.from("liquidacion_items").select("payment_id"),
  ]);

  const idsYaLiquidados = new Set((itemsExistentes ?? []).map((i) => i.payment_id));
  const pendientes = (pagosLiberados ?? []).filter((p) => !idsYaLiquidados.has(p.id));

  const bookingIds = [...new Set(pendientes.map((p) => p.booking_id))];
  const { data: bookingsInfo } = bookingIds.length
    ? await supabase
        .from("bookings")
        .select("id, caregiver_id, owner_id, pet_id, fecha_inicio, fecha_fin")
        .in("id", bookingIds)
    : {
        data: [] as {
          id: string;
          caregiver_id: string;
          owner_id: string;
          pet_id: string;
          fecha_inicio: string;
          fecha_fin: string;
        }[],
      };

  const bookingMap = new Map((bookingsInfo ?? []).map((b) => [b.id, b]));
  const propiosDeEsteCuidador = pendientes.filter(
    (p) => bookingMap.get(p.booking_id)?.caregiver_id === caregiverId,
  );

  const ownerIds = [
    ...new Set(propiosDeEsteCuidador.map((p) => bookingMap.get(p.booking_id)?.owner_id)),
  ].filter((id): id is string => Boolean(id));
  const petIds = [
    ...new Set(propiosDeEsteCuidador.map((p) => bookingMap.get(p.booking_id)?.pet_id)),
  ].filter((id): id is string => Boolean(id));

  const [{ data: owners }, { data: pets }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, nombre, email").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string | null; email: string }[] }),
    petIds.length
      ? supabase.from("pets").select("id, nombre").in("id", petIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);

  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.nombre || o.email]));
  const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));

  const pagosParaForm = propiosDeEsteCuidador.map((p) => {
    const booking = bookingMap.get(p.booking_id);
    return {
      paymentId: p.id,
      monto: Number(p.monto) - Number(p.comision_pimi),
      fechaInicio: booking?.fecha_inicio ?? "—",
      fechaFin: booking?.fecha_fin ?? "—",
      mascota: booking ? petMap.get(booking.pet_id) ?? "Mascota" : "—",
      dueño: booking ? ownerMap.get(booking.owner_id) ?? "Dueño" : "—",
    };
  });

  return (
    <div>
      <a href="/admin/liquidaciones" className="text-sm text-brand hover:underline">
        ← Liquidaciones
      </a>
      <h1 className="mt-3 text-2xl font-bold">
        Nueva liquidación — {profile?.nombre || profile?.email || "Cuidador"}
      </h1>

      <div className="mt-4 rounded-2xl border border-background/15 p-5">
        <p className="text-sm font-medium">Datos bancarios</p>
        {caregiverProfile?.cbu_alias || caregiverProfile?.titular_cuenta ? (
          <div className="mt-2 text-sm text-background/70">
            {caregiverProfile.titular_cuenta && (
              <p>Titular: {caregiverProfile.titular_cuenta}</p>
            )}
            {caregiverProfile.cbu_alias && (
              <p>CBU/alias: {caregiverProfile.cbu_alias}</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-amber-600">
            Este cuidador todavía no cargó CBU/alias en su perfil — pedile
            los datos por fuera de la app antes de transferir.
          </p>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Pagos liberados sin liquidar</h2>
        {pagosParaForm.length > 0 ? (
          <div className="mt-3">
            <CrearLiquidacionForm caregiverId={caregiverId} pagos={pagosParaForm} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-background/60">
            Este cuidador no tiene pagos liberados pendientes de liquidar.
          </p>
        )}
      </div>
    </div>
  );
}
