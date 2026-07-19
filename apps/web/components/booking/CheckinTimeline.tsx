type Checkin = {
  id: string;
  tipo: string;
  foto: string;
  lat: number;
  lng: number;
  comentario: string | null;
  created_at: string;
};

const TIPO_LABEL: Record<string, string> = {
  llegada: "Llegada",
  diario: "Foto del día",
  salida: "Salida",
};

export function CheckinTimeline({ checkins }: { checkins: Checkin[] }) {
  if (checkins.length === 0) {
    return (
      <p className="mt-3 text-sm text-foreground/60">
        Todavía no hay check-ins cargados para este cuidado.
      </p>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {checkins.map((c) => (
        <li
          key={c.id}
          className="flex gap-3 rounded-2xl border border-foreground/10 p-4"
        >
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.foto}
              alt={TIPO_LABEL[c.tipo] ?? c.tipo}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">
                {TIPO_LABEL[c.tipo] ?? c.tipo}
              </span>
              <span className="text-xs text-foreground/50">
                {new Date(c.created_at).toLocaleString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {c.comentario && (
              <p className="mt-1 text-foreground/70">{c.comentario}</p>
            )}
            <a
              href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-medium text-brand hover:underline"
            >
              📍 Ver ubicación
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
