import { BookingWidget } from "@/components/booking/BookingWidget";
import { TierBadge } from "@/components/booking/TierBadge";
import { CaregiverResultsMap } from "@/components/search/CaregiverResultsMap";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mascota?: string; desde?: string; hasta?: string }>;
};

const SERVICIO_LABEL: Record<string, string> = {
  hospedaje: "Hospedaje en su casa",
  visita_a_domicilio: "Visitas a domicilio",
  paseo: "Paseos",
};

export default async function CaregiverProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const search = await searchParams;
  const supabase = await createClient();

  const [{ data: caregiver }, { data: reviews }, { data: userData }] =
    await Promise.all([
      supabase
        .from("caregiver_public_profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("reviews")
        .select("puntaje, comentario, created_at")
        .eq("destinatario_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.auth.getUser(),
    ]);

  if (!caregiver) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-foreground/60">
          No encontramos este perfil de cuidador.
        </p>
      </main>
    );
  }

  const user = userData.user;
  let pets: Array<{ id: string; nombre: string }> = [];
  if (user) {
    const { data } = await supabase
      .from("pets")
      .select("id, nombre")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    pets = data ?? [];
  }

  const hasReviews = Boolean(caregiver.reviews_count && caregiver.reviews_count > 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-foreground/5">
          {caregiver.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={caregiver.foto}
              alt={caregiver.nombre ?? "Cuidador"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">
              🙂
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">
              {caregiver.nombre ?? "Cuidador Pimi"}
            </h1>
            {caregiver.verificado && (
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                Identidad verificada
              </span>
            )}
            <TierBadge tier={caregiver.tier} />
            {!hasReviews && (
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                Cuidador nuevo
              </span>
            )}
          </div>
          <p className="mt-1 text-foreground/60">{caregiver.zona}</p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-foreground/70">
            <span className="font-semibold text-foreground">
              ${caregiver.tarifa_base}
              <span className="font-normal text-foreground/50"> / día</span>
            </span>
            {hasReviews && (
              <span>
                ★ {Number(caregiver.rating_promedio).toFixed(1)} (
                {caregiver.reviews_count} reseñas)
              </span>
            )}
          </div>
        </div>
      </div>

      {caregiver.tipos_de_servicio?.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {caregiver.tipos_de_servicio.map((tipo: string) => (
            <span
              key={tipo}
              className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium"
            >
              {SERVICIO_LABEL[tipo] ?? tipo}
            </span>
          ))}
        </div>
      )}

      {caregiver.bio && (
        <p className="mt-6 text-sm leading-relaxed text-foreground/80">
          {caregiver.bio}
        </p>
      )}

      {caregiver.zona_lat != null && caregiver.zona_lng != null && (
        <div className="mt-6">
          <p className="text-sm font-medium">Zona aproximada</p>
          <div className="mt-2">
            <CaregiverResultsMap
              results={[
                {
                  id: caregiver.id,
                  nombre: caregiver.nombre,
                  zona_lat: caregiver.zona_lat,
                  zona_lng: caregiver.zona_lng,
                  tarifa_base: caregiver.tarifa_base,
                  verificado: caregiver.verificado,
                  perfilHref: `/cuidadores/${caregiver.id}`,
                },
              ]}
            />
          </div>
          <p className="mt-2 text-xs text-foreground/50">
            No es la dirección exacta — eso se comparte recién después de
            confirmar una reserva.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-foreground/10 p-6">
        <h2 className="font-semibold">Reservar</h2>
        {user ? (
          <BookingWidget
            caregiverId={caregiver.id}
            tarifaBase={caregiver.tarifa_base}
            pets={pets}
            defaultMascota={search.mascota}
            defaultDesde={search.desde}
            defaultHasta={search.hasta}
          />
        ) : (
          <div className="mt-4">
            <p className="text-sm text-foreground/60">
              Iniciá sesión para reservar con este cuidador.
            </p>
            <a
              href={`/login?next=/cuidadores/${id}`}
              className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Iniciar sesión
            </a>
          </div>
        )}
      </div>

      {hasReviews && reviews && reviews.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold">Reseñas</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {reviews.map((r, i) => (
              <li
                key={i}
                className="rounded-xl border border-foreground/10 p-4 text-sm"
              >
                <p className="font-medium">★ {r.puntaje}</p>
                {r.comentario && (
                  <p className="mt-1 text-foreground/70">{r.comentario}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
