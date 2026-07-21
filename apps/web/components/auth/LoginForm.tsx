"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "@/components/auth/PasswordField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { safeNext } from "@/lib/auth/safe-next";

async function resolveDestination(user: User): Promise<string> {
  const role = (user.app_metadata as { role?: string } | null)?.role;
  if (role === "admin") return "/admin";

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.roles?.includes("cuidador")) return "/cuidador";
  return "/dashboard";
}

export function LoginForm({
  next,
  isCaregiver = false,
}: {
  next: string | null;
  isCaregiver?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const destination = safeNext(next) ?? (await resolveDestination(data.user));
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="vos@email.com"
          className={`mt-1 w-full rounded-lg border border-foreground/20 px-4 py-2 focus:outline-none ${
            isCaregiver ? "focus:border-accent" : "focus:border-brand"
          }`}
        />
      </div>
      <PasswordField
        id="password"
        label="Contraseña"
        required
        placeholder="••••••••"
        autoComplete="current-password"
        accent={isCaregiver}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className={`mt-1 rounded-lg px-4 py-2 font-semibold text-white transition disabled:opacity-60 ${
          isCaregiver ? "bg-accent hover:opacity-90" : "bg-brand hover:bg-brand-dark"
        }`}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <div className="my-1 flex items-center gap-3 text-xs text-foreground/40">
        <div className="h-px flex-1 bg-foreground/10" />
        o
        <div className="h-px flex-1 bg-foreground/10" />
      </div>

      <GoogleButton isCaregiver={isCaregiver} next={next} />
    </form>
  );
}
