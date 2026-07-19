/**
 * Cálculo de comisión de Pimi sobre una reserva.
 *
 * v1: porcentaje fijo para todos los cuidadores. La fase de "sistema de
 * puntos" (bajar comisión por buena reputación) reemplaza este valor fijo
 * por uno calculado según el tier del cuidador — este archivo es el único
 * lugar que hay que tocar cuando eso se construya.
 */
export const COMISION_PIMI_PCT_DEFAULT = 0.2;

export function calcularComision(
  monto: number,
  pct: number = COMISION_PIMI_PCT_DEFAULT,
): number {
  return Math.round(monto * pct * 100) / 100;
}
