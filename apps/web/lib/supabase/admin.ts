import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role key: bypassea Row Level Security por
 * completo. SOLO debe usarse en código de servidor (Server Components,
 * Route Handlers) dentro del área /admin, y solo después de confirmar
 * explícitamente que el usuario autenticado tiene rol admin (ver
 * app/admin/layout.tsx). Nunca importar esto desde un componente
 * cliente ni desde código fuera de /admin.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
