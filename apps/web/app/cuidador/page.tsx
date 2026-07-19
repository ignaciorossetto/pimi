import { CaregiverProfileCard } from "@/components/dashboard/CaregiverProfileCard";
import { TierBadge } from "@/components/booking/TierBadge";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/lib/bookings/labels";
import { getDisplayName } from "@/lib/auth/display-name";
import { proximoTier } from "@/lib/payments/tiers";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

const VERIFICACION_LABEL: Record<string, string> = {
  pendiente: "Verificación pendiente",
  aprobado: "Identidad verificada",
  rechazado: "Verificación rechazada",
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function CuidadorHomePage() {
  const user = await requireUser("/cuidador");
  const supabase = await createClient();

  const [{ data: caregiverProfile }, { data: verification }, { data: bookings }] =
    await Promise.all([
      supabase
        .from("caregiver_profiles")
        .select(
          "zona, bio, tarifa_base, tipos_de_servicio, verificado, foto, tier, comision_pct, reviews_count, rating_promedio",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("identity_verifications")
        .select("estado")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("id, owner_id, pet_id, fecha_inicio, fecha_fin, estado, monto")
        .eq("caregiver_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const estadoLabel = verification
    ? (VERIFICACION_LABEL[verification.estado] ?? verification.estado)
    : "Todavía no iniciaste la verificación";

  const bookingIds = (bookings ?? []).map((b) => b.id);
  const ownerIds = [...new Set((bookings ?? []).map((b) => b.owner_id))];
  const petIds = [...new Set((bookings ?? []).map((b) => b.pet_id))];

  const [{ data: owners }, { data: pets }, { data: payments }] =
    await Promise.all([
      ownerIds.length
        ? supabase.from("profiles").select("id, nombre").in("id", ownerIds)
        : Promise.resolve({ data: [] as { id: string; nombre: string | null }[] }),
      petIds.length
        ? supabase.from("pets").select("id, nombre").in("id", petIds)
        : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
      bookingIds.length
        ? supabase
            .from("payments")
            .select("booking_id, estado, monto, comision_pimi, fecha_liberacion")
            .in("booking_id", bookingIds)
        : Promise.resolve({
            data: [] as {
              booking_id: string;
              estado: string;
              monto: number;
              comision_pimi: number;
              fecha_liberacion: string | null;
            }[],
          }),
    ]);

  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.nombre]));
  const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));
  const paymentMap = new Map((payments ?? []).map((p) => [p.booking_id, p]));

  const confirmadaYPagada = (bookingId: string, estado: string) =>
    (estado === "aceptado" || estado === "en_curso") &&
    (paymentMap.get(bookingId)?.estado === "retenido" ||
      paymentMap.get(bookingId)?.estado === "liberado");

  const sortedBookings = [...(bookings ?? [])].sort((a, b) => {
    const aTop = confirmadaYPagada(a.id, a.estado) ? 1 : 0;
    const bTop = confirmadaYPagada(b.id, b.estado) ? 1 : 0;
    return bTop - aTop;
  });

  const tier = caregiverProfile?.tier ?? "nuevo";
  const siguiente = proximoTier(tier);
  const reviewsCount = caregiverProfile?.reviews_count ?? 0;
  const ratingPromedio = caregiverProfile?.rating_promedio
    ? Number(caregiverProfile.rating_promedio)
    : null;
  const comisionActual = caregiverProfile?.comision_pct
    ? Number(caregiverProfile.comision_pct) * 100
    : 20;

  return (
    <div>
      <h1 className="text-2xl font-bold">Hola, {getDisplayName(user)}</h1>
      <p className="mt-1 text-foreground/60">Este es tu panel como cuidador.</p>

      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
        {estadoLabel}
      </div>

      {caregiverProfile && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Tu nivel</h2>
          <div className="mt-3 rounded-2xl border border-foreground/10 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <TierBadge tier={tier} />
              <span className="text-sm text-foreground/70">
                Comisión actual: <strong>{comisionActual}%</strong>
              </span>
            </div>
            <p className="mt-2 text-sm text-foreground/60">
              {reviewsCount} reseña{reviewsCount === 1 ? "" : "s"}
              {ratingPromedio !== null && ` · promedio ★ ${ratingPromedio.toFixed(1)}`}
            </p>
            {siguiente ? (
              <p className="mt-2 text-sm text-foreground/70">
                Llegando a{" "}
                <strong className="capitalize">{siguiente.tier}</strong> (
                {siguiente.minReviews} reseñas con promedio ≥{" "}
                {siguiente.minRating}) tu comisión baja a{" "}
                {siguiente.comisionPct * 100}%.
              </p>
            ) : (
              <p className="mt-2 text-sm text-foreground/70">
                Estás en el nivel más alto. ¡Gracias por el buen trabajo!
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Tu perfil de cuidador</h2>
        <CaregiverProfileCard profile={caregiverProfile} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Reservas</h2>
        {sortedBookings.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-3">
            {sortedBookings.map((b) => {
              const payment = paymentMap.get(b.id);
              const destacada = confirmadaYPagada(b.id, b.estado);
              const retenido = payment?.estado === "retenido";
              const aCobrar = payment
                ? Number(payment.monto) - Number(payment.comision_pimi)
                : null;

              return (
                <li key={b.id}>
                  <a
                    href={`/reservas/${b.id}`}
                    className={`flex flex-col gap-2 rounded-2xl p-5 transition sm:flex-row sm:items-center sm:justify-between ${
                      destacada
                        ? "border-2 border-accent/40 bg-accent/5 shadow-sm hover:border-accent/60"
                        : "border border-foreground/10 hover:border-accent/40"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {petMap.get(b.pet_id) ?? "Mascota"} de{" "}
                          {ownerMap.get(b.owner_id) ?? "dueño"}
                        </p>
                        {destacada && (
                          <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
                            ✓ Confirmada y pagada
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-foreground/60">
                        {b.fecha_inicio} → {b.fecha_fin} · ${b.monto}
                      </p>
                      {retenido && aCobrar !== null && (
                        <p className="mt-1 text-sm font-semibold text-accent">
                          ${aCobrar} retenidos hasta el{" "}
                          {payment?.fecha_liberacion
                            ? formatFecha(payment.fecha_liberacion)
                            : "—"}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
                        ESTADO_COLOR[b.estado] ?? "bg-foreground/10"
                      }`}
                    >
                      {ESTADO_LABEL[b.estado] ?? b.estado}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-foreground/60">
            Todavía no recibiste solicitudes de reserva.
          </p>
        )}
      </section>
    </div>
  );
}
