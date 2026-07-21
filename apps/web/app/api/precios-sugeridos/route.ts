import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Stats = { promedio: number; minimo: number; maximo: number; cantidad: number };

const SERVICIOS = ["paseo", "hospedaje"] as const;

function calcularStats(valores: number[]): Stats | null {
  if (valores.length === 0) return null;
  const suma = valores.reduce((acc, v) => acc + v, 0);
  return {
    promedio: Math.round(suma / valores.length),
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
    cantidad: valores.length,
  };
}

/**
 * Precio sugerido para el modal "¿no sabés cuánto cobrar?" en el form de
 * editar perfil de cuidador. Se calcula en vivo a partir de lo que ya
 * cobran los demás cuidadores VERIFICADOS con precio cargado (tarifa_base
 * > 0) — no es un número fijo, así que no queda desactualizado con la
 * inflación como pasaría con una tabla de precios hardcodeada.
 *
 * Usa la vista pública (caregiver_public_profiles), no una tabla privada:
 * mismos datos que ya son visibles en la búsqueda, nada nuevo se expone.
 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("caregiver_public_profiles")
    .select("tarifa_base, tipos_de_servicio")
    .gt("tarifa_base", 0);

  if (error) {
    return NextResponse.json(
      { error: "No pudimos calcular el precio sugerido." },
      { status: 500 },
    );
  }

  const rows = data ?? [];
  const porServicio: Record<string, Stats | null> = {};

  for (const servicio of SERVICIOS) {
    const valores = rows
      .filter((r) => (r.tipos_de_servicio as string[])?.includes(servicio))
      .map((r) => Number(r.tarifa_base));
    porServicio[servicio] = calcularStats(valores);
  }

  const general = calcularStats(rows.map((r) => Number(r.tarifa_base)));

  return NextResponse.json({ general, porServicio });
}
