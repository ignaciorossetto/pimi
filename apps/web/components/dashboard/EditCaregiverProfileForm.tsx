"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AddressMapPicker } from "@/components/ui/AddressMapPicker";
import { SuggestedPriceModal } from "@/components/dashboard/SuggestedPriceModal";
import { AddressChangeRequestForm } from "@/components/dashboard/AddressChangeRequestForm";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TARIFA_MINIMA = 8000;

// "visita_a_domicilio" se sacó de la app: solo quedan paseo y hospedaje en
// la casa del cuidador (decisión de producto explícita).
const TIPOS_SERVICIO = [
  { value: "hospedaje", label: "Hospedaje en mi casa" },
  { value: "paseo", label: "Paseos" },
];

const TAMANOS = [
  { value: "chico", label: "Chico" },
  { value: "mediano", label: "Mediano" },
  { value: "grande", label: "Grande" },
];

const ESPECIES = [
  { value: "perro", label: "Perros" },
  { value: "gato", label: "Gatos" },
  { value: "otro", label: "Otros" },
];

const ETAPAS = [
  { value: "cachorro", label: "Cachorros (menos de 1 año)" },
  { value: "adulto", label: "Adultos (1 a 7 años)" },
  { value: "senior", label: "Senior (8 años o más)" },
];

type CaregiverProfile = {
  zona: string;
  bio: string | null;
  tarifa_base: number;
  tipos_de_servicio: string[];
  foto: string | null;
  verificado?: boolean;
  domicilio_calle?: string | null;
  domicilio_numero?: string | null;
  domicilio_piso_depto?: string | null;
  domicilio_barrio?: string | null;
  domicilio_ciudad?: string | null;
  tipo_vivienda?: string | null;
  tiene_patio?: boolean | null;
  domicilio_lat?: number | null;
  domicilio_lng?: number | null;
  tiene_mascotas_propias?: boolean | null;
  tamanos_aceptados?: string[] | null;
  especies_aceptadas?: string[] | null;
  etapas_aceptadas?: string[] | null;
};

const TIPO_VIVIENDA_LABEL: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  ph: "PH",
  otro: "Otro",
};

const ESTADO_SOLICITUD_LABEL: Record<string, string> = {
  pendiente: "En revisión",
  aprobado: "Aprobada",
  rechazado: "Rechazada",
};

export function EditCaregiverProfileForm({
  profile,
  addressChangeRequest,
  onSaved,
}: {
  profile: CaregiverProfile;
  addressChangeRequest?: {
    estado: string;
    notas_admin: string | null;
    created_at: string;
  } | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(profile.foto);
  const [showPrecioSugerido, setShowPrecioSugerido] = useState(false);
  const [showAddressChangeForm, setShowAddressChangeForm] = useState(false);
  const domicilioVerificado = Boolean(profile.verificado);

  // Controlados solo para poder armar el texto de dirección que usa el
  // mapa — el resto de los campos del form siguen leyéndose por FormData.
  const [calle, setCalle] = useState(profile.domicilio_calle ?? "");
  const [numero, setNumero] = useState(profile.domicilio_numero ?? "");
  const [barrio, setBarrio] = useState(profile.domicilio_barrio ?? "");
  const [ciudad, setCiudad] = useState(profile.domicilio_ciudad ?? "Córdoba");
  const [lat, setLat] = useState<number | null>(profile.domicilio_lat ?? null);
  const [lng, setLng] = useState<number | null>(profile.domicilio_lng ?? null);

  const direccionTexto = [calle && numero ? `${calle} ${numero}` : calle, barrio, ciudad]
    .filter(Boolean)
    .join(", ");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const tarifaBase = Number(formData.get("tarifa_base") ?? 0);
    if (tarifaBase > 0 && tarifaBase < TARIFA_MINIMA) {
      setError(`La tarifa mínima es $${TARIFA_MINIMA} por día.`);
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
    const tamanosAceptados = formData.getAll("tamanos_aceptados") as string[];
    const especiesAceptadas = formData.getAll("especies_aceptadas") as string[];
    const etapasAceptadas = formData.getAll("etapas_aceptadas") as string[];

    if (
      tamanosAceptados.length === 0 ||
      especiesAceptadas.length === 0 ||
      etapasAceptadas.length === 0
    ) {
      setError(
        "Elegí al menos un tamaño, una especie y una edad que aceptes cuidar.",
      );
      setLoading(false);
      return;
    }

    // La "zona" que se muestra en la búsqueda/perfil ya no se pide como
    // campo aparte — sale sola del domicilio (barrio + ciudad) para no
    // pedir el mismo dato dos veces.
    const zona = [barrio.trim(), ciudad.trim()].filter(Boolean).join(", ");

    const { error: updateError } = await supabase
      .from("caregiver_profiles")
      .update({
        zona: zona || profile.zona,
        bio: String(formData.get("bio") ?? "").trim() || null,
        tarifa_base: tarifaBase,
        tipos_de_servicio: tiposDeServicio,
        foto,
        domicilio_calle: calle.trim() || null,
        domicilio_numero: numero.trim() || null,
        domicilio_piso_depto:
          String(formData.get("domicilio_piso_depto") ?? "").trim() || null,
        domicilio_barrio: barrio.trim() || null,
        domicilio_ciudad: ciudad.trim() || null,
        tipo_vivienda: String(formData.get("tipo_vivienda") ?? "") || null,
        tiene_patio: formData.get("tiene_patio") === "on",
        tiene_mascotas_propias: formData.get("tiene_mascotas_propias") === "on",
        domicilio_lat: lat,
        domicilio_lng: lng,
        tamanos_aceptados: tamanosAceptados,
        especies_aceptadas: especiesAceptadas,
        etapas_aceptadas: etapasAceptadas,
      })
      .eq("user_id", user.id);

    setLoading(false);
    if (updateError) {
      setError(
        updateError.message.includes("caregiver_profiles_tarifa_minima")
          ? `La tarifa mínima es $${TARIFA_MINIMA} por día.`
          : "No pudimos guardar los cambios. Probá de nuevo.",
      );
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

      <div>
        <label className="text-sm font-medium" htmlFor="tarifa_base">
          Tarifa por día (ARS)
        </label>
        <input
          id="tarifa_base"
          name="tarifa_base"
          type="number"
          min={TARIFA_MINIMA}
          step={100}
          required
          defaultValue={profile.tarifa_base || ""}
          placeholder={`Mínimo $${TARIFA_MINIMA}`}
          className="mt-1 w-full max-w-xs rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-xs text-foreground/50">
          La tarifa mínima en Pimi es ${TARIFA_MINIMA} por día.
        </p>
        <button
          type="button"
          onClick={() => setShowPrecioSugerido(true)}
          className="mt-1 text-xs font-medium text-brand hover:underline"
        >
          ¿No sabés cuánto cobrar?
        </button>
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
        <span className="text-sm font-medium">Mascotas que aceptás cuidar</span>
        <p className="mt-1 text-xs text-foreground/50">
          Los dueños con mascotas fuera de esto ni siquiera te van a ver en
          la búsqueda — así no perdés tiempo rechazando solicitudes que no
          te sirven.
        </p>

        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Tamaño
            </span>
            <div className="mt-2 flex flex-col gap-2">
              {TAMANOS.map((t) => (
                <label
                  key={t.value}
                  className="flex items-center gap-2 text-sm text-foreground/80"
                >
                  <input
                    type="checkbox"
                    name="tamanos_aceptados"
                    value={t.value}
                    defaultChecked={
                      profile.tamanos_aceptados == null ||
                      profile.tamanos_aceptados.includes(t.value)
                    }
                    className="h-4 w-4 rounded border-foreground/30 text-brand focus:ring-brand"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Especie
            </span>
            <div className="mt-2 flex flex-col gap-2">
              {ESPECIES.map((e) => (
                <label
                  key={e.value}
                  className="flex items-center gap-2 text-sm text-foreground/80"
                >
                  <input
                    type="checkbox"
                    name="especies_aceptadas"
                    value={e.value}
                    defaultChecked={
                      profile.especies_aceptadas == null ||
                      profile.especies_aceptadas.includes(e.value)
                    }
                    className="h-4 w-4 rounded border-foreground/30 text-brand focus:ring-brand"
                  />
                  {e.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Edad
            </span>
            <div className="mt-2 flex flex-col gap-2">
              {ETAPAS.map((et) => (
                <label
                  key={et.value}
                  className="flex items-center gap-2 text-sm text-foreground/80"
                >
                  <input
                    type="checkbox"
                    name="etapas_aceptadas"
                    value={et.value}
                    defaultChecked={
                      profile.etapas_aceptadas == null ||
                      profile.etapas_aceptadas.includes(et.value)
                    }
                    className="h-4 w-4 rounded border-foreground/30 text-brand focus:ring-brand"
                  />
                  {et.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          name="tiene_mascotas_propias"
          defaultChecked={Boolean(profile.tiene_mascotas_propias)}
          className="h-4 w-4 rounded border-foreground/30 text-brand focus:ring-brand"
        />
        Tengo mascotas propias
      </label>
      <p className="-mt-2 text-xs text-foreground/50">
        Se lo mostramos a los dueños en tu perfil — es una señal de
        confianza más si vas a hospedar mascotas en tu casa.
      </p>

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

      <div>
        <p className="text-sm font-semibold">Domicilio</p>

        {domicilioVerificado ? (
          <>
            <p className="text-xs text-foreground/50">
              Tu domicilio ya está verificado con documentación, así que no
              se puede editar directamente acá. Si te mudaste, pedí un
              cambio de domicilio para que un admin revise el comprobante
              nuevo.
            </p>
            <div className="mt-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/80">
              <p>
                {[
                  calle && numero ? `${calle} ${numero}` : calle,
                  profile.domicilio_piso_depto,
                  barrio,
                  ciudad,
                ]
                  .filter(Boolean)
                  .join(", ") || "Sin domicilio cargado"}
              </p>
              {profile.tipo_vivienda && (
                <p className="mt-1 text-foreground/60">
                  {TIPO_VIVIENDA_LABEL[profile.tipo_vivienda] ??
                    profile.tipo_vivienda}
                  {profile.tiene_patio ? " · con patio" : ""}
                </p>
              )}
            </div>

            {addressChangeRequest?.estado === "pendiente" ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="font-semibold text-amber-700">
                  Solicitud de cambio de domicilio en revisión
                </p>
                <p className="mt-1 text-foreground/70">
                  Un admin está revisando el comprobante nuevo. Tu domicilio
                  actual sigue vigente mientras tanto.
                </p>
              </div>
            ) : (
              <>
                {addressChangeRequest?.estado === "rechazado" && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
                    <p className="font-semibold text-red-700">
                      Tu última solicitud de cambio fue rechazada
                    </p>
                    <p className="mt-1 text-foreground/70">
                      {addressChangeRequest.notas_admin ??
                        "No cumple con lo requerido, podés volver a intentar."}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddressChangeForm(true)}
                  className="mt-3 rounded-lg border border-foreground/20 px-3 py-1.5 text-sm font-semibold transition hover:bg-foreground/5"
                >
                  Solicitar cambio de domicilio
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-foreground/50">
              Tu zona pública (la que ven los dueños) se arma sola con el
              barrio y la ciudad de acá abajo.
            </p>
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
                  defaultValue={profile.domicilio_piso_depto ?? ""}
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
                  defaultValue={profile.tipo_vivienda ?? ""}
                  className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">—</option>
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
                defaultChecked={Boolean(profile.tiene_patio)}
                className="h-4 w-4 rounded border-foreground/30 text-brand focus:ring-brand"
              />
              Tiene patio
            </label>

            <div className="mt-4">
              <p className="text-sm font-medium">Ubicación en el mapa</p>
              <p className="text-xs text-foreground/50">
                A los dueños nunca les mostramos esta dirección exacta — solo
                un área aproximada, para que puedan encontrarte por zona.
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
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>

      {showPrecioSugerido && (
        <SuggestedPriceModal onClose={() => setShowPrecioSugerido(false)} />
      )}

      {showAddressChangeForm && (
        <AddressChangeRequestForm
          onClose={() => setShowAddressChangeForm(false)}
        />
      )}
    </form>
  );
}
