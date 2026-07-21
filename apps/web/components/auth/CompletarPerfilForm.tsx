"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Mismo set que RegisterForm — "visita_a_domicilio" no existe en la app.
const TIPOS_SERVICIO = [
  { value: "hospedaje", label: "Hospedaje en mi casa" },
  { value: "paseo", label: "Paseos" },
];

/**
 * Paso único post-login con Google para usuarios nuevos. El trigger de
 * la base (handle_new_user) ya creó la fila en `profiles` cuando se
 * creó el auth.users, pero con `roles: []` — Google no manda si la
 * persona es dueño o cuidador, así que se pregunta acá, después del
 * login en vez de antes (con contraseña se pregunta en el registro).
 */
export function CompletarPerfilForm({
  rolInicial,
  next,
}: {
  rolInicial: "dueño" | "cuidador";
  next: string | null;
}) {
  const router = useRouter();
  const [isCaregiver, setIsCaregiver] = useState(rolInicial === "cuidador");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const telefono = String(formData.get("telefono") ?? "").trim();
    const roles = [isCaregiver ? "cuidador" : "dueño"];

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró, volvé a iniciar sesión.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ telefono: telefono || null, roles })
      .eq("id", user.id);

    if (profileError) {
      setError("No pudimos guardar tu perfil. Probá de nuevo.");
      setLoading(false);
      return;
    }

    if (isCaregiver) {
      const bio = String(formData.get("bio") ?? "").trim();
      const tipos_de_servicio = formData.getAll("tipos_de_servicio");

      // Zona y tarifa quedan en blanco/0 como en el alta con contraseña:
      // la zona sale sola del domicilio cuando verifique identidad, y la
      // tarifa se carga después en "Editar perfil".
      const { error: caregiverError } = await supabase
        .from("caregiver_profiles")
        .upsert(
          { user_id: user.id, zona: "", bio, tipos_de_servicio, tarifa_base: 0 },
          { onConflict: "user_id", ignoreDuplicates: true },
        );

      if (caregiverError) {
        setError("No pudimos guardar tu perfil de cuidador. Probá de nuevo.");
        setLoading(false);
        return;
      }
    }

    const destino = next ?? (isCaregiver ? "/cuidador" : "/dashboard");
    router.push(destino);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <span className="text-sm font-medium">¿Qué querés hacer en Pimi?</span>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsCaregiver(false)}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
              !isCaregiver
                ? "border-brand bg-brand/10 text-brand"
                : "border-foreground/20 text-foreground/60"
            }`}
          >
            Busco cuidador
          </button>
          <button
            type="button"
            onClick={() => setIsCaregiver(true)}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
              isCaregiver
                ? "border-accent bg-accent/10 text-accent"
                : "border-foreground/20 text-foreground/60"
            }`}
          >
            Quiero ser cuidador
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="telefono">
          Teléfono
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          placeholder="11 5555-5555"
          autoComplete="tel"
          className={`mt-1 w-full rounded-lg border border-foreground/20 px-4 py-2 focus:outline-none ${
            isCaregiver ? "focus:border-accent" : "focus:border-brand"
          }`}
        />
      </div>

      {isCaregiver && (
        <>
          <div className="h-px bg-foreground/10" />
          <p className="text-sm font-semibold">Tu perfil de cuidador</p>
          <p className="text-xs text-foreground/50">
            La zona y la tarifa se completan más adelante: la zona sale
            sola de tu domicilio cuando verifiques tu identidad, y la
            tarifa la cargás en tu perfil cuando quieras.
          </p>

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
                    className="h-4 w-4 rounded border-foreground/30 text-accent focus:ring-accent"
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
              placeholder="Experiencia con mascotas, tu casa, disponibilidad..."
              className="mt-1 w-full rounded-lg border border-foreground/20 px-4 py-2 focus:border-accent focus:outline-none"
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className={`mt-1 rounded-lg px-4 py-2 font-semibold text-white transition disabled:opacity-60 ${
          isCaregiver ? "bg-accent hover:opacity-90" : "bg-brand hover:bg-brand-dark"
        }`}
      >
        {loading ? "Guardando..." : "Continuar"}
      </button>
    </form>
  );
}
