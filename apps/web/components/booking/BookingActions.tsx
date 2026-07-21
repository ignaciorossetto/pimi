"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  bookingId: string;
};

/**
 * Acciones del cuidador sobre una reserva "solicitada": aceptar o rechazar.
 * Solo se renderiza desde la página de detalle cuando corresponde (usuario
 * actual es el cuidador y la reserva sigue en estado 'solicitado'); la RLS
 * de bookings ("update participants") es la que realmente garantiza que
 * solo el dueño o el cuidador de esa reserva puedan modificarla.
 */
export function BookingActions({ bookingId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"aceptar" | "rechazar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateEstado(nuevoEstado: "aceptado" | "cancelado") {
    setLoading(nuevoEstado === "aceptado" ? "aceptar" : "rechazar");
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ estado: nuevoEstado })
      .eq("id", bookingId);

    if (updateError) {
      // El trigger "evitar_reservas_superpuestas" (migración 0020) tira un
      // mensaje en español ya pensado para mostrar tal cual — el resto de
      // los errores caen en el mensaje genérico de siempre.
      setError(
        updateError.message.includes("ya tiene otra reserva activa") ||
          updateError.message.includes("ya tiene otra mascota en una reserva activa")
          ? updateError.message
          : "No pudimos actualizar la reserva. Probá de nuevo.",
      );
      setLoading(null);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/5 p-5">
      <p className="font-semibold">Esta reserva está esperando tu respuesta</p>
      <p className="mt-1 text-sm text-foreground/70">
        Revisá los datos de la mascota y las fechas antes de decidir.
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => updateEstado("aceptado")}
          disabled={loading !== null}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading === "aceptar" ? "Aceptando..." : "Aceptar reserva"}
        </button>
        <button
          onClick={() => updateEstado("cancelado")}
          disabled={loading !== null}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {loading === "rechazar" ? "Rechazando..." : "Rechazar"}
        </button>
      </div>
    </div>
  );
}
