"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  autor_id: string;
  contenido: string;
  created_at: string;
};

const SUSPICIOUS_PATTERN =
  /(@[a-z0-9.-]+\.[a-z]{2,})|(\b\d[\d\s-]{7,}\d\b)|(whatsapp|\bwsp\b|instagram|\btelegram\b|mercado ?pago|transferencia|efectivo|fuera de (la )?app|sin pimi)/i;

export function ChatThread({
  bookingId,
  currentUserId,
}: {
  bookingId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, autor_id, contenido, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(force = false) {
    const content = text.trim();
    if (!content) return;

    if (!force && SUSPICIOUS_PATTERN.test(content)) {
      setWarning(
        "Parece que estás por compartir un dato de contacto o hablar de un pago fuera de Pimi. Recordá que la garantía y el pago protegido solo aplican dentro de la app. ¿Querés enviarlo igual?",
      );
      return;
    }

    setWarning(null);
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("messages").insert({
      booking_id: bookingId,
      autor_id: currentUserId,
      contenido: content,
    });

    setLoading(false);
    if (insertError) {
      setError("No pudimos enviar el mensaje. Probá de nuevo.");
      return;
    }

    setText("");
    loadMessages();
  }

  return (
    <div className="mt-4">
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-xl bg-surface p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-foreground/50">
            Todavía no hay mensajes. Escribí el primero.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.autor_id === currentUserId;
            return (
              <div
                key={m.id}
                className={
                  isMine
                    ? "max-w-[80%] self-end rounded-2xl bg-brand px-3 py-2 text-sm text-white"
                    : "max-w-[80%] self-start rounded-2xl bg-background px-3 py-2 text-sm text-foreground"
                }
              >
                {m.contenido}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {warning && (
        <div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <p>{warning}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => sendMessage(true)}
              className="rounded-md border border-amber-300 px-2 py-1 font-medium hover:bg-amber-100"
            >
              Enviar igual
            </button>
            <button
              onClick={() => setWarning(null)}
              className="rounded-md px-2 py-1 font-medium hover:bg-amber-100"
            >
              Editar mensaje
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
