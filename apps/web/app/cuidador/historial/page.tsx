import { StarIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

/**
 * Historial del cuidador: su "hoja de vida" en Pimi. Cuidados
 * completados con qué mascota, cuánto cobró (su parte, no el monto
 * bruto) y la reseña que le dejó cada dueño — hasta ahora las reseñas
 * recibidas solo se veían entrando una por una a cada reserva.
 */
export default async function CuidadorHistorialPage() {
  const user = await requireUser("/cuidador/historial");
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, owner_id, pet_id, fecha_inicio, fecha_fin, monto, estado")
    .eq("caregiver_id", user.id)
    .eq("estado", "completado")
    .order("fecha_fin", { ascending: false });

  const rows = bookings ?? [];
  const bookingIds = rows.map((b) => b.id);
  const ownerIds = [...new Set(rows.map((b) => b.owner_id))];
  const petIds = [...new Set(rows.map((b) => b.pet_id))];

  const [
    { data: owners },
    { data: pets },
    { data: payments },
    { data: reviewsRecibidas },
  ] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, nombre").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string | null }[] }),
    petIds.length
      ? supabase.from("pets").select("id, nombre").in("id", petIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    bookingIds.length
      ? supabase
          .from("payments")
          .select("booking_id, estado, monto, comision_pimi")
          .in("booking_id", bookingIds)
      : Promise.resolve({
          data: [] as {
            booking_id: string;
            estado: string;
            monto: number;
            comision_pimi: number;
          }[],
        }),
    // Reseñas que los dueños me dejaron (solo las reveladas — doble
    // ciego de la migración 0025).
    bookingIds.length
      ? supabase
          .from("reviews_publicas")
          .select("booking_id, puntaje, comentario")
          .eq("destinatario_id", user.id)
          .in("booking_id", bookingIds)
      : Promise.resolve({
          data: [] as {
            booking_id: string;
            puntaje: number;
            comentario: string | null;
          }[],
        }),
  ]);

  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.nombre]));
  const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));
  const paymentMap = new Map((payments ?? []).map((p) => [p.booking_id, p]));
  const reviewMap = new Map(
    (reviewsRecibidas ?? []).map((r) => [r.booking_id, r]),
  );

  const totalCobrado = rows.reduce((sum, b) => {
    const p = paymentMap.get(b.id);
    if (!p || p.estado === "reembolsado") return sum;
    return sum + (Number(p.monto) - Number(p.comision_pimi));
  }, 0);

  const conReview = rows.filter((b) => reviewMap.has(b.id));
  const promedio =
    conReview.length > 0
      ? conReview.reduce((sum, b) => sum + (reviewMap.get(b.id)?.puntaje ?? 0), 0) /
        conReview.length
      : null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Tu historial</h1>
      <p className="mt-1 text-foreground/60">
        Todos los cuidados que completaste en Pimi, con lo que cobraste y
        lo que los dueños dijeron de vos.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-foreground/10 p-6">
          <p className="text-sm text-foreground/60">Cuidados completados</p>
          <p className="mt-1 text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-foreground/10 p-6">
          <p className="text-sm text-foreground/60">Ganado histórico</p>
          <p className="mt-1 text-2xl font-bold">${totalCobrado.toFixed(0)}</p>
        </div>
        <div className="rounded-2xl border border-foreground/10 p-6">
          <p className="text-sm text-foreground/60">Promedio de reseñas</p>
          <p className="mt-1 text-2xl font-bold">
            {promedio !== null ? `★ ${promedio.toFixed(1)}` : "—"}
          </p>
          <p className="text-xs text-foreground/50">
            {conReview.length} reseña{conReview.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-8">
        {rows.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {rows.map((b) => {
              const p = paymentMap.get(b.id);
              const cobrado =
                p && p.estado !== "reembolsado"
                  ? Number(p.monto) - Number(p.comision_pimi)
                  : null;
              const review = reviewMap.get(b.id);

              return (
                <li key={b.id}>
                  <a
                    href={`/reservas/${b.id}`}
                    className="block rounded-2xl border border-foreground/10 p-5 transition hover:border-accent/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {petMap.get(b.pet_id) ?? "Mascota"} de{" "}
                        {ownerMap.get(b.owner_id) ?? "dueño"}
                      </p>
                      {cobrado !== null && (
                        <span className="text-sm font-semibold text-accent">
                          +${cobrado.toFixed(0)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground/60">
                      {b.fecha_inicio} → {b.fecha_fin}
                    </p>
                    {review ? (
                      <div className="mt-3 rounded-xl bg-foreground/[0.03] p-3">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((v) => (
                            <StarIcon
                              key={v}
                              className={`h-4 w-4 ${
                                v <= review.puntaje
                                  ? "text-brand"
                                  : "text-foreground/15"
                              }`}
                            />
                          ))}
                        </div>
                        {review.comentario && (
                          <p className="mt-1.5 text-sm text-foreground/70">
                            “{review.comentario}”
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-foreground/50">
                        El dueño todavía no dejó reseña (o aún no se
                        reveló).
                      </p>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-foreground/20 p-6">
            <p className="font-semibold">Todavía no completaste cuidados</p>
            <p className="mt-1 text-sm text-foreground/60">
              Cuando termines tu primer cuidado va a aparecer acá, junto
              con la reseña del dueño.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
