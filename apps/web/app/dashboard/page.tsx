import { AddPetForm } from "@/components/dashboard/AddPetForm";
import { PetCard } from "@/components/dashboard/PetCard";
import { getDisplayName } from "@/lib/auth/display-name";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardHomePage() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const [{ data: pets }, { count: bookingsCount }] = await Promise.all([
    supabase
      .from("pets")
      .select("id, nombre, fotos")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id),
  ]);

  const name = getDisplayName(user);
  const hasPets = !!pets && pets.length > 0;

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
        <a
          href="/reservas"
          className="mt-4 block max-w-xs rounded-2xl border border-foreground/10 p-6 transition hover:border-brand/40"
        >
          <p className="text-sm text-foreground/60">Reservas totales</p>
          <p className="mt-1 text-3xl font-bold">{bookingsCount ?? 0}</p>
        </a>
      </section>
    </div>
  );
}
