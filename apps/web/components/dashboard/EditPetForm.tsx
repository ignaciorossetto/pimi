"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

export function EditPetForm({ pet }: { pet: Pet }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(pet.fotos?.[0] ?? null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró, volvé a iniciar sesión.");
      setLoading(false);
      return;
    }

    let fotos = pet.fotos ?? [];
    const fileInput = form.elements.namedItem("foto") as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("El archivo tiene que ser una imagen.");
        setLoading(false);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("La imagen no puede pesar más de 5MB.");
        setLoading(false);
        return;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("mascotas")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError("No pudimos subir la foto. Probá de nuevo.");
        setLoading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("mascotas").getPublicUrl(path);
      fotos = [publicUrl];
    }

    const edadRaw = String(formData.get("edad") ?? "").trim();

    const { error: updateError } = await supabase
      .from("pets")
      .update({
        nombre: String(formData.get("nombre") ?? "").trim(),
        especie: String(formData.get("especie") ?? "perro"),
        raza: String(formData.get("raza") ?? "").trim() || null,
        tamano: String(formData.get("tamano") ?? "") || null,
        edad: edadRaw ? Number(edadRaw) : null,
        temperamento:
          String(formData.get("temperamento") ?? "").trim() || null,
        necesidades_medicas:
          String(formData.get("necesidades_medicas") ?? "").trim() || null,
        fotos,
      })
      .eq("id", pet.id);

    setLoading(false);
    if (updateError) {
      setError("No pudimos guardar los cambios. Probá de nuevo.");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <span className="text-sm font-medium">Foto</span>
        <div className="mt-2 flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={pet.nombre}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">
                🐾
              </div>
            )}
          </div>
          <input
            id="foto"
            name="foto"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="nombre">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            defaultValue={pet.nombre}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="especie">
            Especie
          </label>
          <select
            id="especie"
            name="especie"
            defaultValue={pet.especie}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="perro">Perro</option>
            <option value="gato">Gato</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium" htmlFor="raza">
            Raza
          </label>
          <input
            id="raza"
            name="raza"
            defaultValue={pet.raza ?? ""}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="tamano">
            Tamaño
          </label>
          <select
            id="tamano"
            name="tamano"
            defaultValue={pet.tamano ?? ""}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">—</option>
            <option value="chico">Chico</option>
            <option value="mediano">Mediano</option>
            <option value="grande">Grande</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="edad">
            Edad
          </label>
          <input
            id="edad"
            name="edad"
            type="number"
            min={0}
            defaultValue={pet.edad ?? ""}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="temperamento">
          Temperamento
        </label>
        <input
          id="temperamento"
          name="temperamento"
          defaultValue={pet.temperamento ?? ""}
          className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="necesidades_medicas">
          Necesidades médicas
        </label>
        <textarea
          id="necesidades_medicas"
          name="necesidades_medicas"
          rows={2}
          defaultValue={pet.necesidades_medicas ?? ""}
          className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-accent">Cambios guardados.</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
