"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pingNotificacionBooking } from "@/lib/notifications/ping";

/**
 * "Reportar un problema" (solo dueño, mientras el pago está retenido).
 * Inserta directo en booking_disputas — la RLS + el trigger abrir_disputa
 * (migración 0031) validan todo del lado del servidor y pasan la reserva
 * a 'disputado' en la misma transacción, congelando la liberación del
 * pago hasta que un admin resuelva.
 */
export function ReportarProblemaForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (motivo.trim().length < 10) {
      setError("Contanos qué pasó con un poco más de detalle.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró, volvé a iniciar sesión.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("booking_disputas")
      .insert({
        booking_id: bookingId,
        autor_id: user.id,
        motivo: motivo.trim(),
      });

    setLoading(false);
    if (insertError) {
      // Los mensajes del trigger (P0001) son aptos para mostrar tal cual.
      setError(
        insertError.message.includes("problema") ||
          insertError.message.includes("disputa") ||
          insertError.message.includes("detalle")
          ? insertError.message
          : "No pudimos enviar el reporte. Probá de nuevo.",
      );
      return;
    }

    // Email al cuidador avisando de la disputa (fire-and-forget).
    pingNotificacionBooking(bookingId, "disputa_abierta");

    router.refresh();
  }

  if (!open) {
    return (
      <div className="mt-6 rounded-2xl border border-foreground/10 p-5">
        <p className="font-semibold">¿Hubo un problema con el cuidado?</p>
        <p className="mt-1 text-sm text-foreground/60">
          Mientras el pago esté retenido podés reportarlo — se congela la
          liberación de la plata al cuidador hasta que el equipo lo revise.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          Reportar un problema
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5"
    >
      <p className="font-semibold">Reportar un problema</p>
      <p className="mt-1 text-sm text-foreground/60">
        Contanos qué pasó. El pago queda congelado y el equipo de Pimi lo
        revisa — te podemos contactar por email para pedirte más detalles.
      </p>
      <textarea
        value={motivo}
        onChange={(event) => setMotivo(event.target.value)}
        rows={4}
        required
        placeholder="Qué pasó, cuándo, y cualquier evidencia que tengas (fotos del chat, etc.)"
        className="mt-3 w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar reporte"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-foreground/60 hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
