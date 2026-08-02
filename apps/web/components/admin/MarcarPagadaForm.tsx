"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MEDIOS_PAGO = [
  { value: "transferencia_bancaria", label: "Transferencia bancaria" },
  { value: "efectivo", label: "Efectivo" },
  { value: "otro", label: "Otro" },
];

export function MarcarPagadaForm({ liquidacionId }: { liquidacionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("comprobante") as HTMLInputElement;
    if (!fileInput.files?.[0]) {
      setError("Adjuntá el comprobante de la transferencia.");
      return;
    }

    setLoading(true);
    const formData = new FormData(form);
    formData.set("liquidacionId", liquidacionId);

    const res = await fetch("/api/admin/liquidaciones/marcar-pagada", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? "No pudimos marcar la liquidación como pagada.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium" htmlFor="medioPago">
          Medio de pago
        </label>
        <select
          id="medioPago"
          name="medioPago"
          required
          defaultValue="transferencia_bancaria"
          className="mt-1 w-full max-w-xs rounded-lg border border-background/20 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          {MEDIOS_PAGO.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="comprobante">
          Comprobante de la transferencia
        </label>
        <input
          id="comprobante"
          name="comprobante"
          type="file"
          accept="image/*,application/pdf"
          required
          className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="notas">
          Notas (opcional, solo para el equipo)
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          className="mt-1 w-full rounded-lg border border-background/20 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Marcar como pagada"}
      </button>
    </form>
  );
}
