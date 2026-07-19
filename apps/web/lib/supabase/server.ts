import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para uso en Server Components / Route Handlers.
 * Usa la anon key + cookies de sesión: respeta RLS igual que el cliente.
 * Nunca usar la service role key acá salvo en tareas administrativas
 * explícitas y aisladas (ej. aprobar verificación de identidad).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se puede ignorar si se llama desde un Server Component:
            // el middleware se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
