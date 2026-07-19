/**
 * Copia (solo para mostrar progreso en la UI) de los umbrales de tier de
 * cuidador. La fuente de verdad real es
 * supabase/migrations/0011_caregiver_tiers.sql — si se cambian los
 * umbrales ahí, hay que actualizar esto a mano también.
 */
export const TIERS = [
  { tier: "nuevo", minReviews: 0, minRating: 0, comisionPct: 0.2 },
  { tier: "bronce", minReviews: 5, minRating: 4.0, comisionPct: 0.195 },
  { tier: "plata", minReviews: 20, minRating: 4.3, comisionPct: 0.19 },
  { tier: "oro", minReviews: 50, minRating: 4.5, comisionPct: 0.18 },
] as const;

export function proximoTier(tier: string | null | undefined) {
  const idx = TIERS.findIndex((t) => t.tier === (tier ?? "nuevo"));
  if (idx === -1 || idx === TIERS.length - 1) return null;
  return TIERS[idx + 1];
}
