"use client";

import { useEffect, useState } from "react";

type Stats = { promedio: number; minimo: number; maximo: number; cantidad: number };
type Respuesta = { general: Stats | null; porServicio: Record<string, Stats | null> };

const SERVICIO_LABEL: Record<string, string> = {
  paseo: "Paseos",
  hospedaje: "Hospedaje en tu casa",
};

/**
 * "¿No sabés cuánto cobrar?" — modal con el precio promedio/mínimo/máximo
 * que ya están cobrando otros cuidadores verificados, para orientar sin
 * imponer un número. Se calcula en vivo (ver /api/precios-sugeridos), no
 * es una tabla fija que se desactualiza.
 */
export function SuggestedPriceModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Respuesta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const res = await fetch("/api/precios-sugeridos");
        const json = await res.json();
        if (!cancelado) {
          if (!res.ok) setError(json?.error ?? "No pudimos calcular el precio sugerido.");
          else setData(json);
        }
      } catch {
        if (!cancelado) setError("No pudimos calcular el precio sugerido.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">¿No sabés cuánto cobrar?</p>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-foreground/50">
          Esto es lo que ya están cobrando otros cuidadores verificados en
          Córdoba. Es solo orientativo — vos elegís tu precio.
        </p>

        <div className="mt-4">
          {loading && (
            <p className="text-sm text-foreground/60">Calculando...</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && data && (
            <div className="flex flex-col gap-3">
              {(["paseo", "hospedaje"] as const).map((servicio) => {
                const stats = data.porServicio[servicio];
                return (
                  <div
                    key={servicio}
                    className="rounded-xl border border-foreground/10 p-3"
                  >
                    <p className="text-sm font-medium">
                      {SERVICIO_LABEL[servicio]}
                    </p>
                    {stats ? (
                      <p className="mt-1 text-sm text-foreground/70">
                        Promedio:{" "}
                        <span className="font-semibold text-foreground">
                          ${stats.promedio}
                        </span>{" "}
                        / día · rango ${stats.minimo}–${stats.maximo} (
                        {stats.cantidad} cuidadores)
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-foreground/50">
                        Todavía no hay suficientes cuidadores con este
                        servicio para calcular un promedio.
                      </p>
                    )}
                  </div>
                );
              })}

              {!data.general && (
                <p className="text-xs text-foreground/50">
                  Pimi es nuevo en tu zona — todavía no hay muchos precios
                  cargados. Elegí un valor con el que te sientas cómodo, lo
                  podés cambiar cuando quieras.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
