"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para uso en Client Components.
 * Usa la anon key: respeta RLS, seguro para exponer al navegador.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
