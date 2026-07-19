import { AddPetForm } from "@/components/dashboard/AddPetForm";
import { PetCard } from "@/components/dashboard/PetCard";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

export default async function PetsPage() {
  const user = await requireUser("/mascotas");
  const supabase = await createClient();

  const { data: pets } = await supabase
    .from("pets")
    .select("id, nombre, fotos")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold">Mis mascotas</h1>

      <div className="mt-6">
        <AddPetForm />
      </div>

      {pets && pets.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-4">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-foreground/60">
          Todavía no tenés mascotas registradas.
        </p>
      )}
    </div>
  );
}
