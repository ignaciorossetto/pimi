import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

/**
 * Callback de OAuth (Google, PKCE). Supabase redirige acá con `?code=...`
 * después de que el usuario confirma en Google. Acá se intercambia ese
 * code por una sesión real (cookies) y se decide a dónde mandar al
 * usuario:
 *
 * - Si es un login que ya tenía perfil con rol asignado -> directo a su
 *   panel (o a `next`, si vino de una página protegida).
 * - Si es la PRIMERA vez que entra por Google, el trigger de la base
 *   (handle_new_user, migración 0003) ya le creó una fila en `profiles`
 *   pero con `roles: []` — Google no manda "dueño"/"cuidador", eso no
 *   existe en su perfil. En ese caso lo mandamos a /completar-perfil
 *   para que elija el rol y cargue lo mínimo (igual que el registro
 *   con contraseña, pero después del login en vez de antes).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rol = url.searchParams.get("rol"); // intención: "cuidador" | "dueño" | null
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth", url.origin),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/login?error=oauth", url.origin),
    );
  }

  const appRole = (data.user.app_metadata as { role?: string } | null)?.role;
  if (appRole === "admin") {
    return NextResponse.redirect(new URL("/admin", url.origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", data.user.id)
    .maybeSingle();

  const tieneRol = Boolean(profile?.roles && profile.roles.length > 0);

  if (!tieneRol) {
    const params = new URLSearchParams();
    if (rol) params.set("rol", rol);
    if (next) params.set("next", next);
    const qs = params.toString();
    return NextResponse.redirect(
      new URL(`/completar-perfil${qs ? `?${qs}` : ""}`, url.origin),
    );
  }

  const destino =
    next ?? (profile?.roles?.includes("cuidador") ? "/cuidador" : "/dashboard");
  return NextResponse.redirect(new URL(destino, url.origin));
}
