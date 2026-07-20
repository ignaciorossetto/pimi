"use client";

import { useState } from "react";
import { CheckinForm } from "@/components/booking/CheckinForm";

/**
 * El check-in de "salida" no debería poder marcarse el mismo día que el
 * de "llegada" — antes ambos formularios (diario y salida) se mostraban
 * juntos apenas arrancaba el cuidado, así que un cuidador podía cerrar la
 * reserva (y liberar el pago) el mismo día que la recibía.
 *
 * Regla: la salida se habilita sola el día de `fecha_fin`. Si por algún
 * motivo la entrega se adelanta (el dueño pasa a buscar antes), se deja
 * un botón explícito para destrabarla manualmente — no queremos bloquear
 * un caso real solo por la fecha.
 */
export function CheckinSalidaGate({
  bookingId,
  fechaFin,
  puedeMarcarHoy,
}: {
  bookingId: string;
  fechaFin: string;
  puedeMarcarHoy: boolean;
}) {
  const [adelantar, setAdelantar] = useState(false);

  if (puedeMarcarHoy || adelantar) {
    return <CheckinForm bookingId={bookingId} tipo="salida" />;
  }

  const fechaFormateada = new Date(`${fechaFin}T00:00:00`).toLocaleDateString(
    "es-AR",
    { day: "numeric", month: "long" },
  );

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-foreground/20 p-4">
      <p className="text-sm font-medium">Marcar salida</p>
      <p className="mt-1 text-xs text-foreground/50">
        Se habilita sola el {fechaFormateada}, el último día del cuidado.
      </p>
      <button
        type="button"
        onClick={() => setAdelantar(true)}
        className="mt-3 text-xs font-semibold text-brand hover:underline"
      >
        ¿Se adelantó la entrega? Marcar salida ahora
      </button>
    </div>
  );
}
