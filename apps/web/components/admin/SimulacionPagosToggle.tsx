"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SimulacionPagosToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/toggle-simulacion-pagos", {
      method: "POST",
    });

    if (!res.ok) {
      setError("No pudimos cambiar la configuración.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-background/15 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Modo de pago de prueba</p>
          <p className="mt-1 text-xs text-background/50">
            Cuando está activo, los dueños pueden "pagar" reservas sin ir a
            Mercado Pago — queda registrado como retenido igual, para poder
            probar todo el flujo (check-in, reseñas) sin credenciales
            reales. No tiene efecto si la app corre en producción, sin
            importar este toggle.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-60 ${
            enabled
              ? "bg-brand text-white hover:bg-brand-dark"
              : "border border-background/20 text-background/70 hover:bg-background/5"
          }`}
        >
          {loading ? "..." : enabled ? "Activado" : "Desactivado"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
