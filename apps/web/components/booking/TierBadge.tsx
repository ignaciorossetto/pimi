// Umbrales/colores documentados en supabase/migrations/0011_caregiver_tiers.sql
// (esa migración es la fuente de verdad del cálculo; esto es solo la copy).
const TIER_STYLE: Record<string, { label: string; className: string }> = {
  bronce: {
    label: "Cuidador Bronce",
    className: "bg-amber-100 text-amber-800",
  },
  plata: {
    label: "Cuidador Plata",
    className: "bg-slate-200 text-slate-700",
  },
  oro: {
    label: "Cuidador Oro",
    className: "bg-yellow-100 text-yellow-800",
  },
};

export function TierBadge({
  tier,
  className = "",
}: {
  tier: string | null | undefined;
  className?: string;
}) {
  if (!tier || !TIER_STYLE[tier]) return null;
  const style = TIER_STYLE[tier];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${style.className} ${className}`}
    >
      {style.label}
    </span>
  );
}
