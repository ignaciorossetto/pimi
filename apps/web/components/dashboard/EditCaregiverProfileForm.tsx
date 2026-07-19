"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const TIPOS_SERVICIO = [
  { value: "hospedaje", label: "Hospedaje en mi casa" },
  { value: "visita_a_domicilio", label: "Visitas a domicilio" },
  { value: "paseo", label: "Paseos" },
];

type CaregiverProfile = {
  zona: string;
  bio: string | null;
  tarifa_base: number;
  tipos_de_servicio: string[];
  foto: string | null;
};

export function EditCaregiverProfileForm({
  profile,
  onSaved,
}: {
  profile: CaregiverProfile;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(profile.foto);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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

    let foto = profile.foto;
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
        .from("cuidadores")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError("No pudimos subir la foto. Probá de nuevo.");
        setLoading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("cuidadores").getPublicUrl(path);
      foto = publicUrl;
    }

    const tiposDeServicio = formData.getAll("tipos_de_servicio") as string[];

    const { error: updateError } = await supabase
      .from("caregiver_profiles")
      .update({
        zona: String(formData.get("zona") ?? "").trim(),
        bio: String(formData.get("bio") ?? "").trim() || null,
        tarifa_base: Number(formData.get("tarifa_base") ?? 0),
        tipos_de_servicio: tiposDeServicio,
        foto,
      })
      .eq("user_id", user.id);

    setLoading(false);
    if (updateError) {
      setError("No pudimos guardar los cambios. Probá de nuevo.");
      return;
    }

    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
      <div>
        <span className="text-sm font-medium">Foto de perfil</span>
        <div className="mt-2 flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-foreground/5">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Foto de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">
                🙂
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
          <label className="text-sm font-medium" htmlFor="zona">
            Zona
          </label>
          <input
            id="zona"
            name="zona"
            required
            defaultValue={profile.zona}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="tarifa_base">
            Tarifa por día (ARS)
          </label>
          <input
            id="tarifa_base"
            name="tarifa_base"
            type="number"
            min={0}
            required
            defaultValue={profile.tarifa_base}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div>
        <span className="text-sm font-medium">Tipo de servicio</span>
        <div className="mt-2 flex flex-col gap-2">
          {TIPOS_SERVICIO.map((tipo) => (
            <label
              key={tipo.value}
              className="flex items-center gap-2 text-sm text-foreground/80"
            >
              <input
                type="checkbox"
                name="tipos_de_servicio"
                value={tipo.value}
                defaultChecked={profile.tipos_de_servicio?.includes(
                  tipo.value,
                )}
                className="h-4 w-4 rounded border-foreground/30 text-brand focus:ring-brand"
              />
              {tipo.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="bio">
          Contanos sobre vos
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={profile.bio ?? ""}
          className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

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
