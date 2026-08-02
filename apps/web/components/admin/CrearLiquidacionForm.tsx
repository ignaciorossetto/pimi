"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type PagoParaLiquidar = {
  paymentId: string;
  monto: number;
  fechaInicio: string;
  fechaFin: string;
  mascota: string;
  dueño: string;
};

export function CrearLiquidacionForm({
  caregiverId,
  pagos,
}: {
  caregiverId: string;
  pagos: PagoParaLiquidar[];
}) {
  const router = useRouter();
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    new Set(pagos.map((p) => p.paymentId)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () =>
      pagos
        .filter((p) => seleccionados.has(p.paymentId))
        .reduce((sum, p) => sum + p.monto, 0),
    [pagos, seleccionados],
  );

  function toggle(paymentId: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  }

  async function handleSubmit() {
    if (seleccionados.size === 0) {
      setError("Elegí al menos un pago.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/liquidaciones/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caregiverId,
        paymentIds: [...seleccionados],
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? "No pudimos crear la liquidación.");
      setLoading(false);
      return;
    }

    router.push(`/admin/liquidaciones/${data.liquidacionId}`);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-background/15">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/5 text-background/60">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">Mascota / dueño</th>
              <th className="px-4 py-2">Fechas</th>
              <th className="px-4 py-2">A liquidar</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.paymentId} className="border-t border-background/10">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(p.paymentId)}
                    onChange={() => toggle(p.paymentId)}
                    className="h-4 w-4 rounded border-background/30 text-brand focus:ring-brand"
                  />
                </td>
                <td className="px-4 py-2">
                  {p.mascota} de {p.dueño}
                </td>
                <td className="px-4 py-2 text-background/70">
                  {p.fechaInicio} → {p.fechaFin}
                </td>
                <td className="px-4 py-2 font-medium">${p.monto.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-background/15 bg-background/5 px-5 py-4">
        <p className="text-sm text-background/70">
          {seleccionados.size} pago{seleccionados.size === 1 ? "" : "s"}{" "}
          seleccionado{seleccionados.size === 1 ? "" : "s"}
        </p>
        <p className="text-xl font-bold">${total.toFixed(0)}</p>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || seleccionados.size === 0}
        className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Creando..." : "Crear liquidación"}
      </button>
    </div>
  );
}
