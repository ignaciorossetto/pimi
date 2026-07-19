"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EditPetForm } from "./EditPetForm";

type Pet = {
  id: string;
  nombre: string;
  especie: string;
  raza: string | null;
  tamano: string | null;
  edad: number | null;
  temperamento: string | null;
  necesidades_medicas: string | null;
  fotos: string[] | null;
};

const ESPECIE_LABEL: Record<string, string> = {
  perro: "Perro",
  gato: "Gato",
  otro: "Otro",
};

const TAMANO_LABEL: Record<string, string> = {
  chico: "Chico",
  mediano: "Mediano",
  grande: "Grande",
};

export function PetDetailView({ pet }: { pet: Pet }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photo = pet.fotos?.[0];

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Seguro que querés eliminar a ${pet.nombre}? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("pets")
      .delete()
      .eq("id", pet.id);

    if (deleteError) {
      setError("No pudimos eliminar la mascota. Probá de nuevo.");
      setDeleting(false);
      return;
    }

    router.push("/mascotas");
    router.refresh();
  }

  if (editing) {
    return (
      <div>
        <EditPetForm pet={pet} />
        <button
          onClick={() => setEditing(false)}
          className="mt-4 text-sm font-medium text-foreground/60 hover:text-foreground"
        >
          Cancelar edición
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="h-40 w-40 shrink-0 overflow-hidden rounded-2xl bg-foreground/5">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={pet.nombre}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              🐾
            </div>
          )}
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-foreground/50">Especie</dt>
            <dd className="font-medium">
              {ESPECIE_LABEL[pet.especie] ?? pet.especie}
            </dd>
          </div>
          <div>
            <dt className="text-foreground/50">Raza</dt>
            <dd className="font-medium">{pet.raza || "—"}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Tamaño</dt>
            <dd className="font-medium">
              {pet.tamano ? (TAMANO_LABEL[pet.tamano] ?? pet.tamano) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-foreground/50">Edad</dt>
            <dd className="font-medium">
              {pet.edad ? `${pet.edad} años` : "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-foreground/50">Temperamento</dt>
            <dd className="font-medium">{pet.temperamento || "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-foreground/50">Necesidades médicas</dt>
            <dd className="font-medium">{pet.necesidades_medicas || "—"}</dd>
          </div>
        </dl>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Editar
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? "Eliminando..." : "Eliminar mascota"}
        </button>
      </div>
    </div>
  );
}
