import { ESTADO_COLOR, ESTADO_LABEL } from "@/lib/bookings/labels";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

function diasParaEmpezar(fechaInicio: string): number {
  const hoy = new Date();
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioUTC = Date.UTC(
    inicio.getFullYear(),
    inicio.getMonth(),
    inicio.getDate(),
  );
  return Math.round((inicioUTC - hoyUTC) / (1000 * 60 * 60 * 24));
}

function faltanLabel(dias: number): string | null {
  if (dias < 0) return null;
  if (dias === 0) return "¡Empieza hoy!";
  if (dias === 1) return "Empieza mañana";
  return `Faltan ${dias} días`;
}

export default async function BookingsPage() {
  const user = await requireUser("/reservas");
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, caregiver_id, pet_id, fecha_inicio, fecha_fin, estado, monto")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const bookingIds = (bookings ?? []).map((b) => b.id);
  const caregiverIds = [
    ...new Set((bookings ?? []).map((b) => b.caregiver_id)),
  ];
  const petIds = [...new Set((bookings ?? []).map((b) => b.pet_id))];

  const [{ data: caregivers }, { data: pets }, { data: payments }] =
    await Promise.all([
      caregiverIds.length
        ? supabase
            .from("caregiver_public_profiles")
            .select("id, nombre")
            .in("id", caregiverIds)
        : Promise.resolve({ data: [] as { id: string; nombre: string | null }[] }),
      petIds.length
        ? supabase.from("pets").select("id, nombre").in("id", petIds)
        : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
      bookingIds.length
        ? supabase
            .from("payments")
            .select("booking_id, estado")
            .in("booking_id", bookingIds)
        : Promise.resolve({ data: [] as { booking_id: string; estado: string }[] }),
    ]);

  const caregiverMap = new Map(
    (caregivers ?? []).map((c) => [c.id, c.nombre]),
  );
  const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));
  const paymentMap = new Map((payments ?? []).map((p) => [p.booking_id, p.estado]));

  const confirmadaYPagada = (bookingId: string, estado: string) =>
    (estado === "aceptado" || estado === "en_curso") &&
    (paymentMap.get(bookingId) === "retenido" ||
      paymentMap.get(bookingId) === "liberado");

  const sorted = [...(bookings ?? [])].sort((a, b) => {
    const aTop = confirmadaYPagada(a.id, a.estado) ? 1 : 0;
    const bTop = confirmadaYPagada(b.id, b.estado) ? 1 : 0;
    return bTop - aTop;
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reservas</h1>
        <a
          href="/buscar-cuidador"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Buscar cuidador
        </a>
      </div>

      {sorted.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          {sorted.map((b) => {
            const destacada = confirmadaYPagada(b.id, b.estado);
            const dias = diasParaEmpezar(b.fecha_inicio);
            const faltan = b.estado === "aceptado" ? faltanLabel(dias) : null;

            return (
              <li key={b.id}>
                <a
                  href={`/reservas/${b.id}`}
                  className={`flex flex-col gap-2 rounded-2xl p-5 transition sm:flex-row sm:items-center sm:justify-between ${
                    destacada
                      ? "border-2 border-accent/40 bg-accent/5 shadow-sm hover:border-accent/60"
                      : "border border-foreground/10 hover:border-brand/40"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {petMap.get(b.pet_id) ?? "Mascota"} con{" "}
                        {caregiverMap.get(b.caregiver_id) ?? "cuidador"}
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
                    {faltan && (
                      <p className="mt-1 text-sm font-semibold text-accent">
                        {faltan}
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
        <div className="mt-6 rounded-2xl border border-dashed border-foreground/20 p-6">
          <p className="font-semibold">Todavía no tenés reservas</p>
          <p className="mt-1 text-sm text-foreground/60">
            Buscá un cuidador para tu mascota y hacé tu primera reserva.
          </p>
          <a
            href="/buscar-cuidador"
            className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Buscar cuidador
          </a>
        </div>
      )}
    </div>
  );
}
