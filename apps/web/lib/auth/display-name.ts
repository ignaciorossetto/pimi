import type { User } from "@supabase/supabase-js";

/**
 * Nombre para mostrar en la UI. Usa el "nombre" que se guardó en los
 * metadatos del usuario al registrarse (ver RegisterForm); si no existe
 * (por ejemplo, usuarios creados a mano desde el dashboard de Supabase),
 * cae en la parte del email antes de la @ — nunca muestra el email
 * completo como saludo.
 */
export function getDisplayName(user: User): string {
  const nombre = (user.user_metadata as { nombre?: string } | null)?.nombre;
  if (nombre && nombre.trim()) return nombre.trim();
  return user.email?.split("@")[0] ?? "Cuenta";
}
