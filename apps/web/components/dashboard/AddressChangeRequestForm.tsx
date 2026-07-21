"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AddressMapPicker } from "@/components/ui/AddressMapPicker";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB, igual que el bucket 'verificaciones'

/**
 * Modal para pedir un cambio de domicilio una vez que el cuidador ya está
 * verificado (ver migración 0022 — el domicilio verificado no se puede
 * editar directamente). Pide el domicilio nuevo completo + un comprobante
 * nuevo, y lo manda como una fila 'pendiente' a
 * caregiver_address_change_requests para que un admin lo revise — el
 * domicilio actual del cuidador no cambia hasta que se apruebe.
 */
export function AddressChangeRequestForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [barrio, setBarrio] = useState("");
  const [ciudad, setCiudad] = useState("Córdoba");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const direccionTexto = [calle && numero ? `${calle} ${numero}` : calle, barrio, ciudad]
    .filter(Boolean)
    .join(", ");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const tipoVivienda = String(formData.get("tipo_vivienda") ?? "");

    if (!calle.trim() || !numero.trim() || !barrio.trim() || !tipoVivienda) {
      setError("Completá los datos de domicilio.");
      return;
    }

    const fileInput = form.elements.namedItem(
      "comprobante_domicilio",
    ) as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("El comprobante de domicilio es obligatorio.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("El comprobante tiene que ser una imagen.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("El comprobante no puede pesar más de 8MB.");
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
    const path = `${user.id}/cambio-domicilio-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("verificaciones")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError("No pudimos subir el comprobante. Probá de nuevo.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("caregiver_address_change_requests")
      .insert({
        user_id: user.id,
        domicilio_calle: calle.trim(),
        domicilio_numero: numero.trim(),
        domicilio_piso_depto:
          String(formData.get("domicilio_piso_depto") ?? "").trim() || null,
        domicilio_barrio: barrio.trim(),
        domicilio_ciudad: ciudad.trim() || "Córdoba",
        tipo_vivienda: tipoVivienda,
        domicilio_lat: lat,
        domicilio_lng: lng,
        comprobante_domicilio: path,
      });

    setLoading(false);
    if (insertError) {
      setError("No pudimos enviar la solicitud. Probá de nuevo.");
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">Solicitar cambio de domicilio</p>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-foreground/50">
          Un admin revisa el comprobante antes de aplicar el cambio. Hasta
          que se apruebe, seguís apareciendo con tu domicilio actual.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="calle_nueva">
                Calle
              </label>
              <input
                id="calle_nueva"
                value={calle}
                onChange={(event) => setCalle(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="numero_nuevo">
                Número
              </label>
              <input
                id="numero_nuevo"
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
              <label className="text-sm font-medium" htmlFor="barrio_nuevo">
                Barrio
              </label>
              <input
                id="barrio_nuevo"
                value={barrio}
                onChange={(event) => setBarrio(event.target.value)}
                placeholder="Ej. Nueva Córdoba"
                required
                className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="ciudad_nueva">
                Ciudad
              </label>
              <input
                id="ciudad_nueva"
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

          <div>
            <label className="text-sm font-medium" htmlFor="comprobante_domicilio">
              Comprobante de domicilio nuevo
            </label>
            <p className="text-xs text-foreground/50">
              Factura de luz, gas, agua o similar de la dirección nueva.
            </p>
            <input
              id="comprobante_domicilio"
              name="comprobante_domicilio"
              type="file"
              accept="image/*"
              capture="environment"
              required
              className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
            />
          </div>

          <div>
            <p className="text-sm font-medium">Ubicación en el mapa</p>
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="self-start rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      </div>
    </div>
  );
}
