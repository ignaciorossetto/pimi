import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { TierBadge } from "@/components/booking/TierBadge";
import { AdminCaregiverMap } from "@/components/admin/AdminCaregiverMap";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/lib/bookings/labels";

const TIPO_VIVIENDA_LABEL: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  ph: "PH",
  otro: "Otro",
};

export default async function AdminCuidadorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser(`/admin/cuidadores/${id}`); // el layout ya validó rol admin

  const supabase = createAdminClient();

  const [{ data: profile }, { data: caregiverProfile }, { data: verification }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("nombre, email, telefono, roles, created_at")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("caregiver_profiles").select("*").eq("user_id", id).maybeSingle(),
      supabase
        .from("identity_verifications")
        .select("estado, created_at, reviewed_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!profile || !caregiverProfile) {
    notFound();
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, owner_id, pet_id, fecha_inicio, fecha_fin, estado, monto")
    .eq("caregiver_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const ownerIds = [...new Set((bookings ?? []).map((b) => b.owner_id))];
  const petIds = [...new Set((bookings ?? []).map((b) => b.pet_id))];

  const [{ data: owners }, { data: pets }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, nombre, email").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string | null; email: string }[] }),
    petIds.length
      ? supabase.from("pets").select("id, nombre").in("id", petIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);

  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.nombre || o.email]));
  const petMap = new Map((pets ?? []).map((p) => [p.id, p.nombre]));

  const domicilioCompleto = [
    caregiverProfile.domicilio_calle && caregiverProfile.domicilio_numero
      ? `${caregiverProfile.domicilio_calle} ${caregiverProfile.domicilio_numero}`
      : caregiverProfile.domicilio_calle,
    caregiverProfile.domicilio_piso_depto,
    caregiverProfile.domicilio_barrio,
    caregiverProfile.domicilio_ciudad,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <a href="/admin/cuidadores" className="text-sm text-brand hover:underline">
        ← Cuidadores
      </a>

      <div className="mt-3 flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-background/10">
          {caregiverProfile.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={caregiverProfile.foto}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">
              {profile.nombre || profile.email}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                caregiverProfile.verificado
                  ? "bg-accent/15 text-accent"
                  : "bg-background/10 text-background/60"
              }`}
            >
              {caregiverProfile.verificado ? "Verificado" : "Sin verificar"}
            </span>
            <TierBadge tier={caregiverProfile.tier} />
          </div>
          <p className="mt-1 text-sm text-background/60">{profile.email}</p>
          {profile.telefono && (
            <p className="text-sm text-background/60">{profile.telefono}</p>
          )}
          <p className="mt-1 text-xs text-background/50">
            Alta: {new Date(profile.created_at).toLocaleDateString("es-AR")}
            {verification?.estado &&
              ` · Verificación: ${verification.estado}${
                verification.reviewed_at
                  ? ` (${new Date(verification.reviewed_at).toLocaleDateString("es-AR")})`
                  : ""
              }`}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-background/15 p-5">
          <p className="text-sm text-background/60">Tarifa</p>
          <p className="mt-1 text-xl font-bold">
            ${caregiverProfile.tarifa_base || 0} / día
          </p>
        </div>
        <div className="rounded-2xl border border-background/15 p-5">
          <p className="text-sm text-background/60">Comisión</p>
          <p className="mt-1 text-xl font-bold">
            {caregiverProfile.comision_pct
              ? `${Number(caregiverProfile.comision_pct) * 100}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-background/15 p-5">
          <p className="text-sm text-background/60">Reputación</p>
          <p className="mt-1 text-xl font-bold">
            {caregiverProfile.reviews_count && caregiverProfile.reviews_count > 0
              ? `★ ${Number(caregiverProfile.rating_promedio ?? 0).toFixed(1)}`
              : "Sin reseñas"}
          </p>
          <p className="text-xs text-background/50">
            {caregiverProfile.reviews_count ?? 0} reseñas
          </p>
        </div>
        <div className="rounded-2xl border border-background/15 p-5">
          <p className="text-sm text-background/60">Mascotas propias</p>
          <p className="mt-1 text-xl font-bold">
            {caregiverProfile.tiene_mascotas_propias == null
              ? "—"
              : caregiverProfile.tiene_mascotas_propias
                ? "Sí"
                : "No"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Domicilio (dato interno)</h2>
          <p className="mt-1 text-xs text-background/50">
            Solo visible para admin — a los dueños se les muestra una
            ubicación difuminada, nunca esta dirección exacta.
          </p>
          <div className="mt-3 rounded-2xl border border-background/15 p-5 text-sm">
            <p>{domicilioCompleto || "Sin domicilio cargado"}</p>
            {caregiverProfile.tipo_vivienda && (
              <p className="mt-1 text-background/60">
                {TIPO_VIVIENDA_LABEL[caregiverProfile.tipo_vivienda] ??
                  caregiverProfile.tipo_vivienda}
                {caregiverProfile.tiene_patio ? " · con patio" : ""}
              </p>
            )}
          </div>
          {caregiverProfile.bio && (
            <>
              <h2 className="mt-6 text-lg font-semibold">Bio</h2>
              <p className="mt-2 text-sm text-background/70">
                {caregiverProfile.bio}
              </p>
            </>
          )}
          {caregiverProfile.tipos_de_servicio?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {caregiverProfile.tipos_de_servicio.map((tipo: string) => (
                <span
                  key={tipo}
                  className="rounded-full bg-background/10 px-3 py-1 text-xs font-medium"
                >
                  {tipo}
                </span>
              ))}
            </div>
          )}
        </div>

        {caregiverProfile.domicilio_lat != null &&
          caregiverProfile.domicilio_lng != null && (
            <div>
              <h2 className="text-lg font-semibold">Ubicación</h2>
              <div className="mt-3">
                <AdminCaregiverMap
                  cuidadores={[
                    {
                      id,
                      nombre: profile.nombre,
                      lat: caregiverProfile.domicilio_lat,
                      lng: caregiverProfile.domicilio_lng,
                      zona: caregiverProfile.zona,
                      tarifa_base: caregiverProfile.tarifa_base,
                      verificado: caregiverProfile.verificado,
                      tier: caregiverProfile.tier,
                    },
                  ]}
                />
              </div>
            </div>
          )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Últimas reservas</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-background/15">
          {bookings && bookings.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-background/5 text-background/60">
                <tr>
                  <th className="px-4 py-2">Dueño</th>
                  <th className="px-4 py-2">Mascota</th>
                  <th className="px-4 py-2">Fechas</th>
                  <th className="px-4 py-2">Monto</th>
                  <th className="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-background/10">
                    <td className="px-4 py-2">
                      {ownerMap.get(b.owner_id) ?? "—"}
                    </td>
                    <td className="px-4 py-2">{petMap.get(b.pet_id) ?? "—"}</td>
                    <td className="px-4 py-2 text-background/70">
                      {b.fecha_inicio} → {b.fecha_fin}
                    </td>
                    <td className="px-4 py-2">${b.monto}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ESTADO_COLOR[b.estado] ?? "bg-background/10"
                        }`}
                      >
                        {ESTADO_LABEL[b.estado] ?? b.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-background/60">
              Todavía no tiene reservas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
