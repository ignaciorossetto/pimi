"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LiberarPagoButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmed = window.confirm(
      "¿Confirmás que ya le pagaste al cuidador su parte por fuera de la app? Esto marca el pago como liberado.",
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/liberar-pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });

    if (!res.ok) {
      setError("No pudimos liberar el pago.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Liberando..." : "Liberar pago"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
