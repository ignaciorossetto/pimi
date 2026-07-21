"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StarIcon } from "@/components/icons";

/**
 * Formulario de reseña post-cuidado. Solo se muestra cuando la reserva ya
 * está 'completado' y el usuario actual todavía no calificó esta reserva
 * (chequeado desde la página que lo usa). El destinatario NO se manda
 * desde acá — lo calcula el trigger forzar_destinatario_review()
 * (migración 0025) a partir de la reserva, así no hay forma de apuntar
 * la reseña a otra persona manipulando el request.
 *
 * La reseña queda oculta para todos menos el propio autor hasta que la
 * otra parte también califique (o pasen 14 días) — "doble ciego", ver
 * la vista reviews_publicas en la misma migración. Por eso el mensaje de
 * éxito no dice "ya se publicó", aclara cuándo se va a ver.
 */
export function ReviewForm({
  bookingId,
  nombreDestinatario,
}: {
  bookingId: string;
  nombreDestinatario: string | null;
}) {
  const router = useRouter();
  const [puntaje, setPuntaje] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enviada, setEnviada] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (puntaje < 1) {
      setError("Elegí un puntaje de 1 a 5 estrellas.");
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

    const { error: insertError } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      autor_id: user.id,
      puntaje,
      comentario: comentario.trim() || null,
    });

    setLoading(false);
    if (insertError) {
      setError(
        insertError.message.includes("duplicate key")
          ? "Ya calificaste esta reserva."
          : "No pudimos guardar tu reseña. Probá de nuevo.",
      );
      return;
    }

    setEnviada(true);
    router.refresh();
  }

  if (enviada) {
    return (
      <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
        <p className="font-semibold text-accent">¡Gracias por tu reseña!</p>
        <p className="mt-1 text-sm text-foreground/70">
          Se va a mostrar cuando {nombreDestinatario ?? "la otra parte"}{" "}
          también deje la suya, o en un par de semanas — así ninguna de las
          dos se escribe pensando en la otra.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-2xl border border-foreground/10 p-5"
    >
      <p className="font-semibold">
        ¿Cómo estuvo tu experiencia{" "}
        {nombreDestinatario ? `con ${nombreDestinatario}` : ""}?
      </p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setPuntaje(valor)}
            onMouseEnter={() => setHover(valor)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${valor} estrella${valor > 1 ? "s" : ""}`}
            className="p-0.5"
          >
            <StarIcon
              className={`h-7 w-7 ${
                valor <= (hover || puntaje)
                  ? "text-brand"
                  : "text-foreground/15"
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comentario}
        onChange={(event) => setComentario(event.target.value)}
        rows={3}
        placeholder="Contanos cómo fue (opcional)"
        className="mt-3 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar reseña"}
      </button>
    </form>
  );
}
