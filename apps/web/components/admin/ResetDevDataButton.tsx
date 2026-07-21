"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FRASE_CONFIRMACION = "BORRAR TODO";

/**
 * Botón para vaciar todos los datos de prueba. Solo se renderiza (ver
 * /admin/page.tsx) cuando NODE_ENV !== "production", y la ruta que
 * llama vuelve a chequear eso server-side — así que aunque este
 * componente quedara en el bundle por error, tocarlo en producción no
 * hace nada.
 *
 * Pide escribir una frase exacta antes de habilitar el botón real, para
 * que no se dispare con un click accidental.
 */
export function ResetDevDataButton() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  const habilitado = confirmText.trim() === FRASE_CONFIRMACION;

  async function handleClick() {
    if (!habilitado) return;
    setLoading(true);
    setError(null);
    setResultado(null);

    const res = await fetch("/api/admin/reset-db", { method: "POST" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? "No pudimos vaciar los datos.");
      setLoading(false);
      return;
    }

    setResultado(
      `Listo — se borraron ${data.usuariosBorrados} usuarios (se conservaron las cuentas admin) y todos sus datos.`,
    );
    setConfirmText("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
      <p className="font-semibold text-red-400">Vaciar datos de prueba</p>
      <p className="mt-1 text-xs text-background/50">
        Borra todos los usuarios (dueños y cuidadores, no admins), sus
        mascotas, reservas, chats, pagos y reviews. Solo funciona en
        desarrollo — esta ruta se bloquea sola si la app corre en
        producción. No se puede deshacer.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={`Escribí "${FRASE_CONFIRMACION}" para habilitar`}
          className="w-full rounded-lg border border-background/20 bg-transparent px-3 py-2 text-sm placeholder:text-background/40 focus:border-red-400 focus:outline-none sm:max-w-xs"
        />
        <button
          onClick={handleClick}
          disabled={!habilitado || loading}
          className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Vaciando..." : "Vaciar todo"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {resultado && (
        <p className="mt-2 text-xs text-emerald-400">{resultado}</p>
      )}
    </div>
  );
}
