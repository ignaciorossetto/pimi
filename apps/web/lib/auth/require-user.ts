import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Exige una sesión activa de Supabase. Si no hay usuario logueado,
 * redirige a /login con un parámetro `next` para volver acá después de
 * iniciar sesión. Usar en el layout (o page) de cada área protegida.
 */
export async function requireUser(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return user;
}
