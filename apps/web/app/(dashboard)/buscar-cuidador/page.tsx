import { TierBadge } from "@/components/booking/TierBadge";
import { LocationPickerFields } from "@/components/search/LocationPickerFields";
import { CaregiverResultsMap } from "@/components/search/CaregiverResultsMap";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    mascota?: string;
    desde?: string;
    hasta?: string;
    zona?: string;
    servicio?: string;
    lat?: string;
    lng?: string;
    radio?: string;
  }>;
};

const SERVICIOS = [
  { value: "", label: "Cualquiera" },
  { value: "hospedaje", label: "Hospedaje en su casa" },
  { value: "paseo", label: "Paseos" },
];

const RADIOS_KM = [2, 5, 10, 15, 25];

type CaregiverResult = {
  id: string;
  nombre: string | null;
  zona: string;
  bio: string | null;
  tarifa_base: number;
  tipos_de_servicio: string[];
  verificado: boolean;
  foto: string | null;
  tier: string | null;
  reviews_count: number | null;
  rating_promedio: number | null;
  zona_lat: number | null;
  zona_lng: number | null;
  distancia_km: number | null;
};

export default async function BuscarCuidadorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await requireUser("/buscar-cuidador");
  const supabase = await createClient();

  const { data: pets } = await supabase
    .from("pets")
    .select("id, nombre")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const hasSearched = Boolean(params.desde && params.hasta);
  let results: CaregiverResult[] = [];
  let searchError: string | null = null;
  let reservaConfirmada: {
    id: string;
    fecha_inicio: string;
    fecha_fin: string;
    caregiverNombre: string | null;
  } | null = null;

  const lat = params.lat ? Number(params.lat) : null;
  const lng = params.lng ? Number(params.lng) : null;
  const radio = params.radio ? Number(params.radio) : null;

  // Si la mascota elegida ya tiene una reserva CONFIRMADA que se superpone
  // con estas fechas, ni siquiera corremos la búsqueda — a pedido
  // explícito, para no mostrar cuidadores disponibles cuando en realidad
  // ya no hace falta (y la base ya bloquearía la solicitud de todos
  // modos, ver migración 0023).
  if (hasSearched && params.mascota) {
    const { data: superpuesta } = await supabase
      .from("bookings")
      .select("id, caregiver_id, fecha_inicio, fecha_fin")
      .eq("pet_id", params.mascota)
      .in("estado", ["aceptado", "en_curso"])
      .lte("fecha_inicio", params.hasta as string)
      .gte("fecha_fin", params.desde as string)
      .maybeSingle();

    if (superpuesta) {
      const { data: caregiverProfile } = await supabase
        .from("profiles")
        .select("nombre")
        .eq("id", superpuesta.caregiver_id)
        .maybeSingle();

      reservaConfirmada = {
        id: superpuesta.id,
        fecha_inicio: superpuesta.fecha_inicio,
        fecha_fin: superpuesta.fecha_fin,
        caregiverNombre: caregiverProfile?.nombre ?? null,
      };
    }
  }

  // Datos de la mascota elegida, para filtrar en la búsqueda a los
  // cuidadores que no aceptan su especie/tamaño/edad (migración 0027) —
  // así no se le muestran al dueño cuidadores que después le van a
  // rechazar la solicitud.
  let mascotaSeleccionada: {
    especie: string;
    tamano: string | null;
    edad: number | null;
  } | null = null;
  if (hasSearched && params.mascota) {
    const { data } = await supabase
      .from("pets")
      .select("especie, tamano, edad")
      .eq("id", params.mascota)
      .maybeSingle();
    mascotaSeleccionada = data;
  }

  if (hasSearched && !reservaConfirmada) {
    // Antes esto era un simple .ilike sobre "zona" contra la vista
    // pública. Ahora es una función (RPC) porque necesita comparar contra
    // la coordenada REAL del cuidador para filtrar por radio sin nunca
    // exponerla — ver migración 0018_caregiver_geolocation_search.sql.
    const { data, error } = await supabase.rpc("buscar_cuidadores", {
      p_lat: lat && !Number.isNaN(lat) ? lat : null,
      p_lng: lng && !Number.isNaN(lng) ? lng : null,
      p_radio_km: radio && !Number.isNaN(radio) ? radio : null,
      p_zona: params.zona || null,
      p_servicio: params.servicio || null,
      p_especie: mascotaSeleccionada?.especie ?? null,
      p_tamano: mascotaSeleccionada?.tamano ?? null,
      p_edad: mascotaSeleccionada?.edad ?? null,
    });

    if (error) {
      // Antes esto se tragaba en silencio y la página mostraba "Sin
      // resultados" sin distinguir un error real (ej. falta correr la
      // migración 0018, o el RPC no tiene permiso) de que simplemente no
      // hay cuidadores que matcheen. Se loguea server-side para que quede
      // en los logs de Vercel/Supabase, y se le muestra algo útil al
      // dueño en vez de un silencio confuso.
      console.error("[Pimi] Error en buscar_cuidadores:", error);
      searchError =
        "Tuvimos un problema buscando cuidadores. Si el error persiste, avisale a soporte.";
    } else {
      results = (data as CaregiverResult[] | null) ?? [];
    }
  }

  const linkParams = `mascota=${params.mascota ?? ""}&desde=${params.desde ?? ""}&hasta=${params.hasta ?? ""}`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Buscar cuidador</h1>
      <p className="mt-1 text-foreground/60">
        Contanos cuándo viajás y qué necesitás — te mostramos los
        cuidadores cerca tuyo en el mapa, con su zona aproximada (nunca la
        dirección exacta).
      </p>

      <form
        method="get"
        className="mt-6 grid gap-4 rounded-2xl border border-foreground/10 p-5 sm:grid-cols-2"
      >
        <div>
          <label className="text-sm font-medium" htmlFor="mascota">
            Mascota
          </label>
          <select
            id="mascota"
            name="mascota"
            defaultValue={params.mascota ?? ""}
            required
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="" disabled>
              Elegí una mascota
            </option>
            {(pets ?? []).map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="zona">
            Zona (opcional)
          </label>
          <input
            id="zona"
            name="zona"
            defaultValue={params.zona ?? ""}
            placeholder="Ej. Nueva Córdoba"
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="desde">
            Desde
          </label>
          <input
            id="desde"
            name="desde"
            type="date"
            defaultValue={params.desde ?? ""}
            required
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="hasta">
            Hasta
          </label>
          <input
            id="hasta"
            name="hasta"
            type="date"
            defaultValue={params.hasta ?? ""}
            required
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="servicio">
            Tipo de servicio
          </label>
          <select
            id="servicio"
            name="servicio"
            defaultValue={params.servicio ?? ""}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            {SERVICIOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="radio">
            Radio de búsqueda
          </label>
          <select
            id="radio"
            name="radio"
            defaultValue={params.radio ?? "10"}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            {RADIOS_KM.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        </div>

        <LocationPickerFields defaultLat={params.lat} defaultLng={params.lng} />

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Buscar cuidadores
          </button>
        </div>
      </form>

      {hasSearched && reservaConfirmada && (
        <div className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <p className="font-semibold text-accent">
            Esta mascota ya tiene un cuidado confirmado para esas fechas
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            {reservaConfirmada.fecha_inicio} → {reservaConfirmada.fecha_fin}
            {reservaConfirmada.caregiverNombre &&
              ` con ${reservaConfirmada.caregiverNombre}`}
            . No hace falta buscar otro cuidador para ese rango.
          </p>
          <a
            href={`/reservas/${reservaConfirmada.id}`}
            className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Ver reserva confirmada
          </a>
        </div>
      )}

      {hasSearched && !reservaConfirmada && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">
            {searchError
              ? "No pudimos buscar"
              : results.length > 0
                ? `${results.length} cuidadores encontrados`
                : "Sin resultados"}
          </h2>

          {searchError && (
            <p className="mt-4 text-sm text-red-600">{searchError}</p>
          )}

          {!searchError && results.length > 0 ? (
            <>
              <div className="mt-4">
                <CaregiverResultsMap
                  results={results.map((c) => ({
                    id: c.id,
                    nombre: c.nombre,
                    zona_lat: c.zona_lat,
                    zona_lng: c.zona_lng,
                    tarifa_base: c.tarifa_base,
                    verificado: c.verificado,
                    perfilHref: `/cuidadores/${c.id}?${linkParams}`,
                  }))}
                  centerLat={lat}
                  centerLng={lng}
                  radioKm={radio}
                />
                <p className="mt-2 text-xs text-foreground/50">
                  Los círculos muestran una zona aproximada, no la
                  dirección exacta del cuidador — eso solo se comparte
                  después de confirmar una reserva.
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((c) => (
                  <a
                    key={c.id}
                    href={`/cuidadores/${c.id}?${linkParams}`}
                    className="flex gap-3 rounded-2xl border border-foreground/10 p-5 transition hover:border-brand/40 hover:shadow-sm"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-foreground/5">
                      {c.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.foto}
                          alt={c.nombre ?? "Cuidador"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl">
                          🙂
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold">
                          {c.nombre ?? "Cuidador Pimi"}
                        </p>
                        {c.verificado && (
                          <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                            Verificado
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-foreground/60">
                        {c.zona}
                        {c.distancia_km != null &&
                          ` · a ${c.distancia_km.toFixed(1)} km`}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <TierBadge tier={c.tier} />
                        {c.reviews_count && c.reviews_count > 0 && (
                          <span className="text-xs text-foreground/60">
                            ★ {Number(c.rating_promedio).toFixed(1)} (
                            {c.reviews_count})
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm">
                        <span className="font-semibold">${c.tarifa_base}</span>{" "}
                        / día
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : (
            !searchError && (
              <p className="mt-4 text-sm text-foreground/60">
                No encontramos cuidadores para esa búsqueda todavía. Probá
                ampliando el radio, sacando el filtro de zona, o puede ser
                que los cuidadores cerca tuyo no acepten el tamaño/edad de
                tu mascota.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
