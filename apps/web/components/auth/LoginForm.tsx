"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function safeNext(next: string | null): string | null {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return null;
}

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

export function LoginForm({ next }: { next: string | null }) {
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
          className="mt-1 w-full rounded-lg border border-foreground/20 px-4 py-2 focus:border-brand focus:outline-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="mt-1 w-full rounded-lg border border-foreground/20 px-4 py-2 focus:border-brand focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 rounded-lg bg-brand px-4 py-2 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
