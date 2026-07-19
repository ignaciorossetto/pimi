"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Payment = {
  estado: string;
  comision_pimi: number;
  fecha_liberacion: string | null;
  liberado_at: string | null;
} | null;

type Props = {
  bookingId: string;
  bookingEstado: string;
  monto: number;
  isOwner: boolean;
  payment: Payment;
  simulationMode: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const REDIRECT_BANNER: Record<string, { text: string; className: string }> = {
  exito: {
    text: "Pago iniciado. Puede tardar unos segundos en confirmarse.",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  pendiente: {
    text: "Tu pago está pendiente de confirmación en Mercado Pago.",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  error: {
    text: "El pago no se pudo completar. Podés intentar de nuevo.",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export function PaymentPanel({
  bookingId,
  bookingEstado,
  monto,
  isOwner,
  payment,
  simulationMode,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectFlag = searchParams.get("pago");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePagar() {
    setLoading(true);
    setError(null);

    try {
      const endpoint = simulationMode
        ? "/api/mercadopago/simular-pago"
        : "/api/mercadopago/create-preference";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No pudimos iniciar el pago.");
        setLoading(false);
        return;
      }

      if (simulationMode) {
        router.refresh();
        return;
      }

      if (!data.initPoint) {
        setError("No pudimos iniciar el pago.");
        setLoading(false);
        return;
      }

      window.location.href = data.initPoint;
    } catch {
      setError("No pudimos conectar con Mercado Pago.");
      setLoading(false);
    }
  }

  // Todavía no corresponde mostrar nada de pago (el cuidador no aceptó).
  if (bookingEstado !== "aceptado" && !payment) {
    return null;
  }

  const comisionPimi = payment?.comision_pimi ?? Math.round(monto * 0.2 * 100) / 100;
  const partesCuidador = monto - comisionPimi;

  return (
    <div className="mt-6 rounded-2xl border border-foreground/10 p-5">
      <p className="font-semibold">Pago</p>

      {simulationMode && (!payment || payment.estado === "pendiente") && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Modo de pago de prueba activo (activado desde /admin) — no se va
          a cobrar nada real.
        </div>
      )}

      {redirectFlag && REDIRECT_BANNER[redirectFlag] && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${REDIRECT_BANNER[redirectFlag].className}`}
        >
          {REDIRECT_BANNER[redirectFlag].text}
        </div>
      )}

      {isOwner ? (
        <>
          {(!payment || payment.estado === "pendiente") && (
            <>
              <p className="mt-2 text-sm text-foreground/70">
                {simulationMode
                  ? "Simulá el pago para seguir probando el flujo (check-in, reseñas) sin ir a Mercado Pago."
                  : "Pagás ahora con Mercado Pago. Pimi retiene el dinero y lo libera al cuidador recién 48hs después de terminado el cuidado — así tenés margen para reportar cualquier problema."}
              </p>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button
                onClick={handlePagar}
                disabled={loading}
                className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {loading
                  ? "Procesando..."
                  : simulationMode
                    ? `Simular pago de $${monto}`
                    : `Pagar $${monto} con Mercado Pago`}
              </button>
            </>
          )}

          {payment?.estado === "retenido" && (
            <p className="mt-2 text-sm text-foreground/70">
              <span className="font-medium text-accent">
                Pago retenido por Pimi.
              </span>{" "}
              Se libera al cuidador el {formatDate(payment.fecha_liberacion)}{" "}
              (48hs después de terminado el cuidado), salvo que reportes un
              problema antes.
            </p>
          )}

          {payment?.estado === "liberado" && (
            <p className="mt-2 text-sm text-foreground/70">
              <span className="font-medium text-green-700">
                Pago liberado
              </span>{" "}
              al cuidador el {formatDate(payment.liberado_at)}.
            </p>
          )}
        </>
      ) : (
        <>
          {!payment && (
            <p className="mt-2 text-sm text-foreground/70">
              Esperando a que el dueño complete el pago para arrancar el
              cuidado.
            </p>
          )}
          {payment?.estado === "pendiente" && (
            <p className="mt-2 text-sm text-foreground/70">
              El dueño inició el pago, todavía no se confirma.
            </p>
          )}
          {payment?.estado === "retenido" && (
            <p className="mt-2 text-sm text-foreground/70">
              Vas a cobrar{" "}
              <span className="font-semibold text-foreground">
                ${partesCuidador}
              </span>{" "}
              (comisión de Pimi: ${comisionPimi}) el{" "}
              {formatDate(payment.fecha_liberacion)}.
            </p>
          )}
          {payment?.estado === "liberado" && (
            <p className="mt-2 text-sm text-foreground/70">
              <span className="font-medium text-green-700">Cobrado.</span>{" "}
              ${partesCuidador} liberados el {formatDate(payment.liberado_at)}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
