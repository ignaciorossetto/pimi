"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function AddPetForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("foto") as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("La foto de la mascota es obligatoria.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("El archivo tiene que ser una imagen.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("La imagen no puede pesar más de 5MB.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró, volvé a iniciar sesión.");
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

    const edadRaw = String(formData.get("edad") ?? "").trim();

    const { error: insertError } = await supabase.from("pets").insert({
      owner_id: user.id,
      nombre: String(formData.get("nombre") ?? "").trim(),
      especie: String(formData.get("especie") ?? "perro"),
      raza: String(formData.get("raza") ?? "").trim() || null,
      tamano: String(formData.get("tamano") ?? "") || null,
      edad: edadRaw ? Number(edadRaw) : null,
      temperamento: String(formData.get("temperamento") ?? "").trim() || null,
      necesidades_medicas:
        String(formData.get("necesidades_medicas") ?? "").trim() || null,
      fotos: [publicUrl],
    });

    if (insertError) {
      setError("No pudimos guardar la mascota. Probá de nuevo.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Agregar mascota
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-foreground/10 p-5"
    >
      <div>
        <label className="text-sm font-medium" htmlFor="foto">
          Foto de la mascota
        </label>
        <input
          id="foto"
          name="foto"
          type="file"
          accept="image/*"
          required
          className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
        />
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
          placeholder="Tranquilo, juguetón..."
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
          placeholder="Medicación, alergias..."
          className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar mascota"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-semibold transition hover:bg-foreground/5"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
