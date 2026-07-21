"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons";

/**
 * Botón "Continuar con Google". Queda siempre blanco/neutro (no sigue la
 * paleta brand/accent de dueño-vs-cuidador) porque Google pide respetar
 * su estilo de botón oficial.
 *
 * La intención de rol (dueño/cuidador) y el `next` (a dónde volver) se
 * mandan como query params dentro de `redirectTo` — Supabase los ignora,
 * pero se los devuelve tal cual a /auth/callback, que los usa para saber
 * si hay que mandar al usuario a /completar-perfil.
 */
export function GoogleButton({
  isCaregiver = false,
  next,
  label = "Continuar con Google",
}: {
  isCaregiver?: boolean;
  next?: string | null;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);

    const params = new URLSearchParams();
    params.set("rol", isCaregiver ? "cuidador" : "dueño");
    if (next) params.set("next", next);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?${params.toString()}`,
      },
    });

    if (oauthError) {
      setError("No pudimos conectar con Google. Probá de nuevo.");
      setLoading(false);
    }
    // Si no hubo error, el navegador ya está siendo redirigido a Google.
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-foreground/20 bg-white px-4 py-2 font-medium text-foreground/80 transition hover:bg-foreground/5 disabled:opacity-60"
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        {loading ? "Conectando..." : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
