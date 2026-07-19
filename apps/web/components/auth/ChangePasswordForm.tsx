"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const password2 = String(formData.get("password2") ?? "");

    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);
    if (updateError) {
      setError("No pudimos actualizar la contraseña. Probá de nuevo.");
      return;
    }
    setSuccess(true);
    (event.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium" htmlFor="password">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          className="mt-1 w-full rounded-lg border border-foreground/20 px-4 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="password2">
          Repetir contraseña
        </label>
        <input
          id="password2"
          name="password2"
          type="password"
          required
          minLength={6}
          className="mt-1 w-full rounded-lg border border-foreground/20 px-4 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-accent">Contraseña actualizada.</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Actualizar contraseña"}
      </button>
    </form>
  );
}
