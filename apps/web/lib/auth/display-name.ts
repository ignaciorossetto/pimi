import type { User } from "@supabase/supabase-js";

/**
 * Nombre para mostrar en la UI. Usa el "nombre" que se guardó en los
 * metadatos del usuario al registrarse con contraseña (ver RegisterForm);
 * si entró con Google no hay "nombre" propio, pero Google sí manda
 * "full_name"/"name" en el user_metadata, así que se usa eso. Si no hay
 * nada de lo anterior (ej. usuarios creados a mano desde el dashboard de
 * Supabase), cae en la parte del email antes de la @ — nunca muestra el
 * email completo como saludo.
 */
export function getDisplayName(user: User): string {
  const metadata = user.user_metadata as
    | { nombre?: string; full_name?: string; name?: string }
    | null;
  const nombre = metadata?.nombre || metadata?.full_name || metadata?.name;
  if (nombre && nombre.trim()) return nombre.trim();
  return user.email?.split("@")[0] ?? "Cuenta";
}
