import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminCaregiverMap } from "@/components/admin/AdminCaregiverMap";

export default async function AdminMapaPage() {
  await requireUser("/admin/mapa"); // el layout ya validó rol admin

  const supabase = createAdminClient();

  const { data: cuidadores } = await supabase
    .from("caregiver_profiles")
    .select(
      "user_id, zona, tarifa_base, tier, verificado, domicilio_lat, domicilio_lng, profiles(nombre)",
    );

  const rows = cuidadores ?? [];
  const conUbicacion = rows.filter(
    (c) => c.domicilio_lat != null && c.domicilio_lng != null,
  );
  const sinUbicacion = rows.length - conUbicacion.length;

  const puntos = conUbicacion.map((c) => ({
    id: c.user_id,
    nombre:
      (c.profiles as { nombre: string | null }[] | null)?.[0]?.nombre ?? null,
    lat: c.domicilio_lat as number,
    lng: c.domicilio_lng as number,
    zona: c.zona,
    tarifa_base: c.tarifa_base,
    verificado: c.verificado,
    tier: c.tier,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Mapa de cuidadores</h1>
      <p className="mt-1 text-background/60">
        Ubicación real de cada cuidador (no difuminada) — solo para uso
        interno, pensado para evaluar dónde hay densidad y dónde faltan
        cuidadores a la hora de planear campañas de marketing/reclutamiento.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-background/60">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
          Verificado ({conUbicacion.filter((c) => c.verificado).length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
          Sin verificar ({conUbicacion.filter((c) => !c.verificado).length})
        </span>
        {sinUbicacion > 0 && (
          <span>
            {sinUbicacion} cuidador{sinUbicacion === 1 ? "" : "es"} sin
            ubicación cargada (no aparece{sinUbicacion === 1 ? "" : "n"} en
            el mapa)
          </span>
        )}
      </div>

      <div className="mt-4">
        {puntos.length > 0 ? (
          <AdminCaregiverMap cuidadores={puntos} />
        ) : (
          <p className="rounded-2xl border border-background/15 p-6 text-sm text-background/60">
            Todavía no hay cuidadores con ubicación cargada.
          </p>
        )}
      </div>
    </div>
  );
}
