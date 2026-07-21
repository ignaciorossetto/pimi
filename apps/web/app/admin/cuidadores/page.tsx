import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { TierBadge } from "@/components/booking/TierBadge";

export default async function AdminCuidadoresPage() {
  await requireUser("/admin/cuidadores"); // el layout ya validó rol admin

  const supabase = createAdminClient();

  const { data: cuidadores } = await supabase
    .from("caregiver_profiles")
    .select(
      "user_id, zona, tarifa_base, tier, verificado, foto, reviews_count, rating_promedio, tiene_mascotas_propias, created_at, profiles(nombre, email)",
    )
    .order("created_at", { ascending: false });

  const rows = cuidadores ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Cuidadores</h1>
      <p className="mt-1 text-background/60">
        {rows.length} cuidador{rows.length === 1 ? "" : "es"} registrado
        {rows.length === 1 ? "" : "s"} en Pimi.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-background/15">
        {rows.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-background/5 text-background/60">
              <tr>
                <th className="px-4 py-2">Cuidador</th>
                <th className="px-4 py-2">Zona</th>
                <th className="px-4 py-2">Tarifa</th>
                <th className="px-4 py-2">Nivel</th>
                <th className="px-4 py-2">Reputación</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Alta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const profile = (
                  row.profiles as { nombre: string | null; email: string }[] | null
                )?.[0];
                return (
                  <tr
                    key={row.user_id}
                    className="border-t border-background/10 hover:bg-background/5"
                  >
                    <td className="px-4 py-2">
                      <a
                        href={`/admin/cuidadores/${row.user_id}`}
                        className="flex items-center gap-3 text-brand hover:underline"
                      >
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-background/10">
                          {row.foto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.foto}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <span>
                          {profile?.nombre || profile?.email || "Sin nombre"}
                        </span>
                      </a>
                    </td>
                    <td className="px-4 py-2 text-background/70">
                      {row.zona || "—"}
                    </td>
                    <td className="px-4 py-2 text-background/70">
                      {row.tarifa_base ? `$${row.tarifa_base}` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <TierBadge tier={row.tier} />
                    </td>
                    <td className="px-4 py-2 text-background/70">
                      {row.reviews_count && row.reviews_count > 0
                        ? `★ ${Number(row.rating_promedio ?? 0).toFixed(1)} (${row.reviews_count})`
                        : "Sin reseñas"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          row.verificado
                            ? "bg-accent/15 text-accent"
                            : "bg-background/10 text-background/60"
                        }`}
                      >
                        {row.verificado ? "Verificado" : "Sin verificar"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-background/60">
                      {new Date(row.created_at).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-sm text-background/60">
            Todavía no hay cuidadores registrados.
          </p>
        )}
      </div>
    </div>
  );
}
