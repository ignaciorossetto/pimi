"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AddressMapPicker } from "@/components/ui/AddressMapPicker";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB, igual que el bucket 'verificaciones'

type FileFieldKey = "dni_frente" | "dni_dorso" | "selfie" | "comprobante_domicilio";

const FILE_FIELDS: { key: FileFieldKey; label: string; ayuda: string }[] = [
  { key: "dni_frente", label: "DNI — frente", ayuda: "Que se lean bien los datos." },
  { key: "dni_dorso", label: "DNI — dorso", ayuda: "El lado con el código." },
  {
    key: "selfie",
    label: "Selfie con tu DNI",
    ayuda: "Sacate una foto sosteniendo el DNI al lado de tu cara, bien iluminada.",
  },
  {
    key: "comprobante_domicilio",
    label: "Comprobante de domicilio",
    ayuda: "Factura de luz, gas, agua o similar, a tu nombre o de alguien de tu casa.",
  },
];

export function DniVerificationForm({
  rechazoAnterior,
}: {
  rechazoAnterior?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Controlados solo para poder armar el texto de dirección que usa el
  // mapa (el resto de los campos del form siguen leyéndose por FormData).
  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [barrio, setBarrio] = useState("");
  const [ciudad, setCiudad] = useState("Córdoba");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const direccionTexto = [calle && numero ? `${calle} ${numero}` : calle, barrio, ciudad]
    .filter(Boolean)
    .join(", ");

  function validateFile(file: File | undefined | null): string | null {
    if (!file) return "Este archivo es obligatorio.";
    if (!file.type.startsWith("image/")) return "Tiene que ser una imagen.";
    if (file.size > MAX_FILE_SIZE) return "No puede pesar más de 8MB.";
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const dniNumero = String(formData.get("dni_numero") ?? "").trim();
    if (!/^\d{7,8}$/.test(dniNumero)) {
      setError("Ingresá tu número de DNI sin puntos (7 u 8 dígitos).");
      return;
    }

    const files: Record<FileFieldKey, File> = {} as Record<FileFieldKey, File>;
    for (const { key, label } of FILE_FIELDS) {
      const input = form.elements.namedItem(key) as HTMLInputElement;
      const file = input?.files?.[0];
      const fileError = validateFile(file);
      if (fileError) {
        setError(`${label}: ${fileError}`);
        return;
      }
      files[key] = file!;
    }

    const tipoVivienda = String(formData.get("tipo_vivienda") ?? "");

    if (!calle.trim() || !numero.trim() || !barrio.trim() || !tipoVivienda) {
      setError("Completá los datos de domicilio.");
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

    const uploaded: Record<FileFieldKey, string> = {} as Record<FileFieldKey, string>;

    for (const { key } of FILE_FIELDS) {
      const file = files[key];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${key}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("verificaciones")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError(`No pudimos subir "${key}". Probá de nuevo.`);
        setLoading(false);
        return;
      }

      uploaded[key] = path;
    }

    const { error: insertError } = await supabase.from("identity_verifications").insert({
      user_id: user.id,
      tipo_documento: "dni",
      dni_numero: dniNumero,
      dni_frente: uploaded.dni_frente,
      dni_dorso: uploaded.dni_dorso,
      selfie: uploaded.selfie,
      comprobante_domicilio: uploaded.comprobante_domicilio,
    });

    if (insertError) {
      setError("No pudimos enviar la verificación. Probá de nuevo.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("caregiver_profiles")
      .update({
        domicilio_calle: calle.trim(),
        domicilio_numero: numero.trim(),
        domicilio_piso_depto:
          String(formData.get("domicilio_piso_depto") ?? "").trim() || null,
        domicilio_barrio: barrio.trim(),
        domicilio_ciudad: ciudad.trim() || "Córdoba",
        tipo_vivienda: tipoVivienda,
        tiene_patio: formData.get("tiene_patio") === "on",
        domicilio_lat: lat,
        domicilio_lng: lng,
        // La "zona" pública (la que ven los dueños en la búsqueda) ya no
        // se pide como campo aparte en ningún formulario — se arma sola
        // acá, con el barrio y la ciudad que el cuidador ya cargó arriba.
        zona: [barrio.trim(), ciudad.trim() || "Córdoba"].filter(Boolean).join(", "),
      })
      .eq("user_id", user.id);

    setLoading(false);
    if (profileError) {
      setError(
        "La verificación se envió, pero no pudimos guardar el domicilio. Volvé a intentar.",
      );
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
      {rechazoAnterior && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">Tu verificación anterior fue rechazada</p>
          <p className="mt-1">{rechazoAnterior}</p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium" htmlFor="dni_numero">
          Número de DNI
        </label>
        <input
          id="dni_numero"
          name="dni_numero"
          inputMode="numeric"
          placeholder="Sin puntos, ej. 30123456"
          required
          className="mt-1 w-full max-w-xs rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        {FILE_FIELDS.map(({ key, label, ayuda }) => (
          <div key={key}>
            <label className="text-sm font-medium" htmlFor={key}>
              {label}
            </label>
            <p className="text-xs text-foreground/50">{ayuda}</p>
            <input
              id={key}
              name={key}
              type="file"
              accept="image/*"
              capture="environment"
              required
              className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
            />
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold">Domicilio</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="domicilio_calle">
              Calle
            </label>
            <input
              id="domicilio_calle"
              name="domicilio_calle"
              value={calle}
              onChange={(event) => setCalle(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="domicilio_numero">
              Número
            </label>
            <input
              id="domicilio_numero"
              name="domicilio_numero"
              value={numero}
              onChange={(event) => setNumero(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="domicilio_piso_depto">
              Piso / depto (opcional)
            </label>
            <input
              id="domicilio_piso_depto"
              name="domicilio_piso_depto"
              className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="domicilio_barrio">
              Barrio
            </label>
            <input
              id="domicilio_barrio"
              name="domicilio_barrio"
              value={barrio}
              onChange={(event) => setBarrio(event.target.value)}
              placeholder="Ej. Nueva Córdoba"
              required
              className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="domicilio_ciudad">
              Ciudad
            </label>
            <input
              id="domicilio_ciudad"
              name="domicilio_ciudad"
              value={ciudad}
              onChange={(event) => setCiudad(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="tipo_vivienda">
              Tipo de vivienda
            </label>
            <select
              id="tipo_vivienda"
              name="tipo_vivienda"
              required
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            >
              <option value="" disabled>
                Elegí una opción
              </option>
              <option value="casa">Casa</option>
              <option value="departamento">Departamento</option>
              <option value="ph">PH</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            name="tiene_patio"
            className="h-4 w-4 rounded border-foreground/30 text-brand focus:ring-brand"
          />
          Tiene patio
        </label>

        <div className="mt-4">
          <p className="text-sm font-medium">Ubicación en el mapa</p>
          <p className="text-xs text-foreground/50">
            A los dueños nunca les mostramos esta dirección exacta — solo un
            área aproximada, para que puedan encontrarte por zona.
          </p>
          <AddressMapPicker
            direccionTexto={direccionTexto}
            lat={lat}
            lng={lng}
            onChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar verificación"}
      </button>
    </form>
  );
}
