"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type Tipo = "llegada" | "diario" | "salida";

const COPY: Record<Tipo, { titulo: string; boton: string; ayuda: string }> = {
  llegada: {
    titulo: "Marcar llegada",
    boton: "Confirmar llegada",
    ayuda:
      "Sacá una foto de la mascota al llegar. Esto arranca oficialmente el cuidado.",
  },
  diario: {
    titulo: "Foto del día",
    boton: "Subir foto del día",
    ayuda: "Una foto obligatoria por día mientras dure el cuidado.",
  },
  salida: {
    titulo: "Marcar salida",
    boton: "Confirmar salida y finalizar",
    ayuda:
      "Sacá una foto al entregar la mascota. Esto cierra el cuidado y habilita el pago.",
  },
};

export function CheckinForm({
  bookingId,
  tipo,
}: {
  bookingId: string;
  tipo: Tipo;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  function handleUbicacion() {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setError(
          "No pudimos obtener tu ubicación. Activá el permiso de ubicación e intentá de nuevo.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("foto") as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("La foto es obligatoria.");
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
    if (!coords) {
      setError(
        "La ubicación es obligatoria. Tocá \"Usar mi ubicación\" antes de enviar.",
      );
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
      .from("checkins")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError("No pudimos subir la foto. Probá de nuevo.");
      setLoading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("checkins").getPublicUrl(path);

    const comentario = String(formData.get("comentario") ?? "").trim();

    const { error: insertError } = await supabase
      .from("booking_checkins")
      .insert({
        booking_id: bookingId,
        autor_id: user.id,
        tipo,
        foto: publicUrl,
        lat: coords.lat,
        lng: coords.lng,
        comentario: comentario || null,
      });

    if (insertError) {
      setError("No pudimos guardar el check-in. Probá de nuevo.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  const copy = COPY[tipo];

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-col gap-3 rounded-2xl border border-foreground/10 p-5"
    >
      <p className="font-semibold">{copy.titulo}</p>
      <p className="text-xs text-foreground/50">{copy.ayuda}</p>

      <div>
        <label className="text-sm font-medium" htmlFor={`foto-${tipo}`}>
          Foto
        </label>
        <input
          id={`foto-${tipo}`}
          name="foto"
          type="file"
          accept="image/*"
          capture="environment"
          required
          className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={handleUbicacion}
          disabled={locating}
          className="rounded-lg border border-foreground/20 px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:opacity-60"
        >
          {locating
            ? "Obteniendo ubicación..."
            : coords
              ? "📍 Ubicación capturada — volver a tomar"
              : "📍 Usar mi ubicación"}
        </button>
        {coords && (
          <p className="mt-1 text-xs text-foreground/50">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor={`comentario-${tipo}`}>
          Comentario (opcional)
        </label>
        <textarea
          id={`comentario-${tipo}`}
          name="comentario"
          rows={2}
          placeholder="Todo tranquilo, comió bien..."
          className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Enviando..." : copy.boton}
      </button>
    </form>
  );
}
