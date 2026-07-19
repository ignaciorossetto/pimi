import { notFound } from "next/navigation";
import { PetDetailView } from "@/components/dashboard/PetDetailView";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser(`/mascotas/${id}`);
  const supabase = await createClient();

  const { data: pet } = await supabase
    .from("pets")
    .select(
      "id, nombre, especie, raza, tamano, edad, temperamento, necesidades_medicas, fotos",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!pet) {
    notFound();
  }

  return (
    <div>
      <a
        href="/mascotas"
        className="text-sm font-medium text-foreground/60 hover:text-foreground"
      >
        ← Mis mascotas
      </a>

      <h1 className="mt-4 text-2xl font-bold">{pet.nombre}</h1>

      <div className="mt-6 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/10">
        <PetDetailView pet={pet} />
      </div>
    </div>
  );
}
