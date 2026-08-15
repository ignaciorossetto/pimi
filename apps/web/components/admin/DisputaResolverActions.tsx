"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Acciones de resolución de una disputa en el panel admin. Las dos
 * salidas mueven plata (registran reembolso o liberan el pago), así que
 * ambas piden confirmación y aceptan una nota interna.
 */
export function DisputaResolverActions({ disputaId }: { disputaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolver(resolucion: "reembolso" | "liberar") {
    const confirmMsg =
      resolucion === "reembolso"
        ? "¿Confirmás el REEMBOLSO al dueño? Recordá que la devolución real por Mercado Pago la tenés que hacer a mano — esto la registra en Pimi."
        : "¿Confirmás LIBERAR el pago al cuidador? La disputa se cierra a favor del cuidador.";
    if (!window.confirm(confirmMsg)) return;

    const notas = window.prompt(
      "Nota interna sobre la resolución (opcional):",
      "",
    );

    setLoading(resolucion);
    setError(null);

    const res = await fetch("/api/admin/disputas/resolver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disputaId, resolucion, notas: notas || undefined }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? "No pudimos resolver la disputa.");
      setLoading(null);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => resolver("reembolso")}
          disabled={loading !== null}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {loading === "reembolso" ? "..." : "Reembolsar al dueño"}
        </button>
        <button
          onClick={() => resolver("liberar")}
          disabled={loading !== null}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading === "liberar" ? "..." : "Liberar al cuidador"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
