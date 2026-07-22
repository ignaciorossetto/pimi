import type { User } from "@supabase/supabase-js";

/**
 * Foto de perfil desde los metadatos de auth. Hoy la única fuente
 * posible es Google (manda "avatar_url" o "picture" según la versión
 * de la integración) — el alta con contraseña no pide ni guarda foto de
 * perfil. Si no hay nada, el header muestra la inicial del nombre como
 * viene haciendo hasta ahora.
 */
export function getAvatarUrl(user: User): string | null {
  const metadata = user.user_metadata as
    | { avatar_url?: string; picture?: string }
    | null;
  return metadata?.avatar_url || metadata?.picture || null;
}
