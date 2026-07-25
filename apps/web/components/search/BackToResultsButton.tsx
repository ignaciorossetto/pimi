"use client";

import { useRouter } from "next/navigation";

/**
 * Vuelve a la página anterior (los resultados de /buscar-cuidador) usando
 * el historial del navegador — así se conserva exactamente la búsqueda
 * que se había hecho (mascota, fechas, servicio, radio, ubicación), sin
 * tener que reconstruir esos filtros a mano en un link fijo.
 */
export function BackToResultsButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex items-center gap-1 text-sm font-medium text-foreground/60 transition hover:text-foreground"
    >
      ← Volver a los resultados
    </button>
  );
}
