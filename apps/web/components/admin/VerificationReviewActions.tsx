"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerificationReviewActions({
  verificationId,
}: {
  verificationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"aprobar" | "rechazar" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decidir(decision: "aprobado" | "rechazado", notasEnviar?: string) {
    setLoading(decision === "aprobado" ? "aprobar" : "rechazar");
    setError(null);

    const res = await fetch("/api/admin/identity-verifications/decidir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationId, decision, notas: notasEnviar }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "No pudimos guardar la decisión.");
      setLoading(null);
      return;
    }

    router.refresh();
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={notas}
          onChange={(event) => setNotas(event.target.value)}
          placeholder="Motivo del rechazo (se lo mostramos al cuidador)"
          rows={2}
          className="w-full rounded-lg border border-background/20 bg-transparent px-2 py-1 text-xs focus:border-brand focus:outline-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => decidir("rechazado", notas)}
            disabled={loading !== null || !notas.trim()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading === "rechazar" ? "Enviando..." : "Confirmar rechazo"}
          </button>
          <button
            onClick={() => setRejecting(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-background/60 hover:bg-background/5"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => decidir("aprobado")}
          disabled={loading !== null}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading === "aprobar" ? "Aprobando..." : "Aprobar"}
        </button>
        <button
          onClick={() => setRejecting(true)}
          disabled={loading !== null}
          className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-400/10 disabled:opacity-60"
        >
          Rechazar
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
