import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy de geocoding hacia Nominatim (OpenStreetMap) — convierte una
 * dirección de texto ("Belgrano 300, Nueva Córdoba, Córdoba") en
 * coordenadas aproximadas para poder centrar el mapa donde el cuidador va
 * a confirmar o corregir el pin a mano.
 *
 * Por qué Nominatim y no Google/Mapbox Geocoding: no pide API key ni
 * cuenta, coherente con el resto de las integraciones "sin credenciales"
 * de este proyecto. A cambio, hay que respetar su política de uso:
 * https://operations.osmfoundation.org/policies/nominatim/
 *   - Un request por segundo como máximo (acá alcanza de sobra, es un
 *     solo lookup por click de usuario, no un proceso en lote).
 *   - Mandar un User-Agent identificable (no el default de fetch).
 *   - No sirve para uso masivo/automático — solo búsquedas puntuales
 *     iniciadas por una persona, que es exactamente este caso de uso.
 *
 * Nota: esto no se puede probar en vivo en este entorno (sin acceso a
 * internet), igual que Mercado Pago y Resend — queda armado a la espera
 * de probarse en el deploy real.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json(
      { error: "Escribí una dirección más completa." },
      { status: 400 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  // Sesgamos los resultados a Córdoba Capital (bounding box aproximado)
  // sin descartar del todo otras zonas, por si alguien busca mal escrito.
  url.searchParams.set("countrycodes", "ar");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        // Nominatim exige un User-Agent que identifique la app — no el
        // default genérico de fetch/undici.
        "User-Agent": "Pimi-App/1.0 (contacto: soporte@pimi.com.ar)",
        "Accept-Language": "es-AR",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos conectar con el servicio de mapas." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "El servicio de mapas no respondió bien. Probá de nuevo." },
      { status: 502 },
    );
  }

  const results = (await response.json().catch(() => null)) as
    | { lat: string; lon: string; display_name: string }[]
    | null;

  if (!results || results.length === 0) {
    return NextResponse.json(
      {
        error:
          "No encontramos esa dirección. Podés ubicar el pin a mano en el mapa.",
      },
      { status: 404 },
    );
  }

  const [first] = results;
  return NextResponse.json({
    lat: Number(first.lat),
    lng: Number(first.lon),
    direccionEncontrada: first.display_name,
  });
}
