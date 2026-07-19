import { TierBadge } from "@/components/booking/TierBadge";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    mascota?: string;
    desde?: string;
    hasta?: string;
    zona?: string;
    servicio?: string;
  }>;
};

const SERVICIOS = [
  { value: "", label: "Cualquiera" },
  { value: "hospedaje", label: "Hospedaje en su casa" },
  { value: "visita_a_domicilio", label: "Visitas a domicilio" },
  { value: "paseo", label: "Paseos" },
];

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

  if (hasSearched) {
    let query = supabase.from("caregiver_public_profiles").select("*");

    if (params.zona) {
      query = query.ilike("zona", `%${params.zona}%`);
    }
    if (params.servicio) {
      query = query.contains("tipos_de_servicio", [params.servicio]);
    }

    const { data } = await query.order("verificado", { ascending: false });
    results = data ?? [];
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Buscar cuidador</h1>
      <p className="mt-1 text-foreground/60">
        Contanos cuándo viajás y qué necesitás — te mostramos los
        cuidadores de tu zona.
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
            Zona
          </label>
          <input
            id="zona"
            name="zona"
            defaultValue={params.zona ?? ""}
            placeholder="Ej. Nueva Córdoba, Córdoba"
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
        <div className="sm:col-span-2">
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
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Buscar cuidadores
          </button>
        </div>
      </form>

      {hasSearched && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">
            {results.length > 0
              ? `${results.length} cuidadores encontrados`
              : "Sin resultados"}
          </h2>

          {results.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((c) => (
                <a
                  key={c.id}
                  href={`/cuidadores/${c.id}?mascota=${params.mascota ?? ""}&desde=${params.desde ?? ""}&hasta=${params.hasta ?? ""}`}
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
                    <p className="mt-1 text-sm text-foreground/60">{c.zona}</p>
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
                      <span className="font-semibold">${c.tarifa_base}</span> /
                      día
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-foreground/60">
              No encontramos cuidadores para esa zona todavía. Probá
              ampliando la búsqueda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
