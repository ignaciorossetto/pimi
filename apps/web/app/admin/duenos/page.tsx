import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminDuenosPage() {
  await requireUser("/admin/duenos"); // el layout ya validó rol admin

  const supabase = createAdminClient();

  const [{ data: duenos }, { data: pets }, { data: bookings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nombre, email, telefono, created_at")
      .contains("roles", ["dueño"])
      .order("created_at", { ascending: false }),
    supabase.from("pets").select("id, owner_id"),
    supabase.from("bookings").select("id, owner_id"),
  ]);

  const petCountByOwner = new Map<string, number>();
  (pets ?? []).forEach((p) => {
    petCountByOwner.set(p.owner_id, (petCountByOwner.get(p.owner_id) ?? 0) + 1);
  });

  const bookingCountByOwner = new Map<string, number>();
  (bookings ?? []).forEach((b) => {
    bookingCountByOwner.set(
      b.owner_id,
      (bookingCountByOwner.get(b.owner_id) ?? 0) + 1,
    );
  });

  const rows = duenos ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dueños</h1>
      <p className="mt-1 text-background/60">
        {rows.length} dueño{rows.length === 1 ? "" : "s"} registrado
        {rows.length === 1 ? "" : "s"} en Pimi.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-background/15">
        {rows.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-background/5 text-background/60">
              <tr>
                <th className="px-4 py-2">Dueño</th>
                <th className="px-4 py-2">Contacto</th>
                <th className="px-4 py-2">Mascotas</th>
                <th className="px-4 py-2">Reservas</th>
                <th className="px-4 py-2">Alta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-background/10 hover:bg-background/5"
                >
                  <td className="px-4 py-2">
                    <a
                      href={`/admin/duenos/${row.id}`}
                      className="text-brand hover:underline"
                    >
                      {row.nombre || row.email}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-background/70">
                    {row.email}
                    {row.telefono ? ` · ${row.telefono}` : ""}
                  </td>
                  <td className="px-4 py-2 text-background/70">
                    {petCountByOwner.get(row.id) ?? 0}
                  </td>
                  <td className="px-4 py-2 text-background/70">
                    {bookingCountByOwner.get(row.id) ?? 0}
                  </td>
                  <td className="px-4 py-2 text-background/60">
                    {new Date(row.created_at).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-sm text-background/60">
            Todavía no hay dueños registrados.
          </p>
        )}
      </div>
    </div>
  );
}
