import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/lib/bookings/labels";

export default async function AdminDuenoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser(`/admin/duenos/${id}`); // el layout ya validó rol admin

  const supabase = createAdminClient();

  const [{ data: profile }, { data: pets }, { data: bookings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("nombre, email, telefono, roles, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("pets")
      .select("id, nombre, especie, raza, tamano, edad, fotos, created_at")
      .eq("owner_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, caregiver_id, pet_id, fecha_inicio, fecha_fin, estado, monto")
      .eq("owner_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!profile) {
    notFound();
  }

  const caregiverIds = [...new Set((bookings ?? []).map((b) => b.caregiver_id))];
  const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));

  const { data: caregivers } = caregiverIds.length
    ? await supabase.from("profiles").select("id, nombre, email").in("id", caregiverIds)
    : { data: [] as { id: string; nombre: string | null; email: string }[] };

  const caregiverMap = new Map(
    (caregivers ?? []).map((c) => [c.id, c.nombre || c.email]),
  );

  return (
    <div>
      <a href="/admin/duenos" className="text-sm text-brand hover:underline">
        ← Dueños
      </a>

      <div className="mt-3">
        <h1 className="text-2xl font-bold">{profile.nombre || profile.email}</h1>
        <p className="mt-1 text-sm text-background/60">{profile.email}</p>
        {profile.telefono && (
          <p className="text-sm text-background/60">{profile.telefono}</p>
        )}
        <p className="mt-1 text-xs text-background/50">
          Alta: {new Date(profile.created_at).toLocaleDateString("es-AR")}
        </p>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">
          Mascotas ({pets?.length ?? 0})
        </h2>
        {pets && pets.length > 0 ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet) => (
              <div
                key={pet.id}
                className="flex items-center gap-3 rounded-2xl border border-background/15 p-4"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-background/10">
                  {pet.fotos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pet.fotos[0]}
                      alt={pet.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold">{pet.nombre}</p>
                  <p className="text-xs text-background/60">
                    {pet.especie}
                    {pet.raza ? ` · ${pet.raza}` : ""}
                    {pet.tamano ? ` · ${pet.tamano}` : ""}
                    {pet.edad != null ? ` · ${pet.edad} años` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-background/60">
            Todavía no cargó mascotas.
          </p>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Últimas reservas</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {bookings && bookings.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Cuidador</th>
                  <th className="px-4 py-2">Mascota</th>
                  <th className="px-4 py-2">Fechas</th>
                  <th className="px-4 py-2">Monto</th>
                  <th className="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-background/10">
                    <td className="px-4 py-2">
                      <a
                        href={`/admin/cuidadores/${b.caregiver_id}`}
                        className="text-brand hover:underline"
                      >
                        {caregiverMap.get(b.caregiver_id) ?? "—"}
                      </a>
                    </td>
                    <td className="px-4 py-2">{petMap.get(b.pet_id) ?? "—"}</td>
                    <td className="px-4 py-2 text-background/70">
                      {b.fecha_inicio} → {b.fecha_fin}
                    </td>
                    <td className="px-4 py-2">${b.monto}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ESTADO_COLOR[b.estado] ?? "bg-background/10"
                        }`}
                      >
                        {ESTADO_LABEL[b.estado] ?? b.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-background/60">
              Todavía no hizo reservas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
