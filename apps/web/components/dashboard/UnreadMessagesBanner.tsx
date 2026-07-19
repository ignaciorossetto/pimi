export function UnreadMessagesBanner({
  count,
  href,
}: {
  count: number;
  href: string | null;
}) {
  if (count === 0 || !href) return null;

  return (
    <a
      href={href}
      className="mb-4 flex items-center justify-between rounded-2xl border border-brand/30 bg-brand/5 px-5 py-3 transition hover:border-brand/50"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-brand">
        💬 Tenés {count} mensaje{count === 1 ? "" : "s"} nuevo
        {count === 1 ? "" : "s"} para leer
      </span>
      <span className="text-xs font-medium text-brand/70">Ver →</span>
    </a>
  );
}
