import { AddPetForm } from "@/components/dashboard/AddPetForm";
import { PetCard } from "@/components/dashboard/PetCard";
import { UnreadMessagesBanner } from "@/components/dashboard/UnreadMessagesBanner";
import { getDisplayName } from "@/lib/auth/display-name";
import { requireUser } from "@/lib/auth/require-user";
import { getUnreadSummary } from "@/lib/messages/unread";
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

export default async function DashboardHomePage() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const [{ data: pets }, { data: bookings }] = await Promise.all([
    supabase
      .from("pets")
      .select("id, nombre, fotos")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, caregiver_id, pet_id, fecha_inicio, estado")
      .eq("owner_id", user.id)
      .in("estado", ["solicitado", "aceptado", "en_curso"])
      .order("fecha_inicio", { ascending: true }),
  ]);

  const name = getDisplayName(user);
  const hasPets = !!pets && pets.length > 0;
  const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));

  const caregiverIds = [
    ...new Set((bookings ?? []).map((b) => b.caregiver_id)),
  ];
  const bookingIds = (bookings ?? []).map((b) => b.id);

  const [{ data: caregivers }, unread] = await Promise.all([
    caregiverIds.length
      ? supabase
          .from("caregiver_public_profiles")
          .select("id, nombre")
          .in("id", caregiverIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string | null }[] }),
    getUnreadSummary(supabase, user.id, bookingIds),
  ]);

  const caregiverMap = new Map((caregivers ?? []).map((c) => [c.id, c.nombre]));

  const reservasActivas = (bookings ?? []).filter(
    (b) =>
      b.estado === "solicitado" ||
      b.estado === "aceptado" ||
      b.estado === "en_curso",
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Hola, {name}</h1>
      <p className="mt-1 text-foreground/60">Este es tu panel como dueño.</p>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mis mascotas</h2>
          {hasPets && (
            <a
              href="/mascotas"
              className="text-sm font-medium text-brand hover:underline"
            >
              Ver todas
            </a>
          )}
        </div>

        {hasPets ? (
          <div className="mt-4 flex flex-wrap gap-4">
            {pets!.map((pet) => (
              <PetCard key={pet.id} pet={pet} size="lg" />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-foreground/20 p-6">
            <p className="font-semibold">No tenés mascotas registradas</p>
            <div className="mt-3">
              <AddPetForm />
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Reservas</h2>

        <div className="mt-4">
          <UnreadMessagesBanner
            count={unread.count}
            href={unread.latestBookingId ? `/reservas/${unread.latestBookingId}` : null}
          />

          {reservasActivas.length > 0 ? (
            <div className="flex flex-col gap-3">
              {reservasActivas.map((b) => {
                const cuidadorNombre = caregiverMap.get(b.caregiver_id) ?? "el cuidador";
                const mascotaNombre = petMap.get(b.pet_id) ?? "tu mascota";

                if (b.estado === "en_curso") {
                  return (
                    <a
                      key={b.id}
                      href={`/reservas/${b.id}`}
                      className="block rounded-2xl border-2 border-accent/40 bg-accent/5 p-6 transition hover:border-accent/60"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                        ● Cuidado en curso
                      </p>
                      <p className="mt-2 text-base text-foreground/80">
                        {cuidadorNombre} está cuidando a {mascotaNombre} en
                        este momento.
                      </p>
                    </a>
                  );
                }

                if (b.estado === "aceptado") {
                  const dias = diasParaEmpezar(b.fecha_inicio);
                  const big = dias <= 0 ? "¡Hoy!" : dias === 1 ? "Mañana" : `${dias} días`;
                  const sub =
                    dias <= 0
                      ? `${cuidadorNombre} empieza a cuidar a ${mascotaNombre}`
                      : dias === 1
                        ? `empieza el cuidado de ${mascotaNombre} con ${cuidadorNombre}`
                        : `faltan para que ${cuidadorNombre} cuide a ${mascotaNombre}`;

                  return (
                    <a
                      key={b.id}
                      href={`/reservas/${b.id}`}
                      className="block rounded-2xl border-2 border-accent/40 bg-accent/5 p-6 transition hover:border-accent/60"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                        Reserva confirmada
                      </p>
                      <p className="mt-2 text-4xl font-extrabold text-accent">
                        {big}
                      </p>
                      <p className="mt-1 text-base text-foreground/80">{sub}</p>
                    </a>
                  );
                }

                return (
                  <a
                    key={b.id}
                    href={`/reservas/${b.id}`}
                    className="block rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 transition hover:border-amber-400"
                  >
                    <p className="text-sm font-semibold text-amber-700">
                      Esperando confirmación
                    </p>
                    <p className="mt-1 text-sm text-foreground/70">
                      {cuidadorNombre} todavía no confirmó el cuidado de{" "}
                      {mascotaNombre}
                    </p>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-foreground/20 p-6">
              <p className="font-semibold">No tenés reservas activas</p>
              <p className="mt-1 text-sm text-foreground/60">
                Buscá un cuidador para tu mascota.
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
      </section>
    </div>
  );
}
