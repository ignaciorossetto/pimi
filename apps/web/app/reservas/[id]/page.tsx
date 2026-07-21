import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookingActions } from "@/components/booking/BookingActions";
import { CheckinForm } from "@/components/booking/CheckinForm";
import { CheckinSalidaGate } from "@/components/booking/CheckinSalidaGate";
import { CheckinTimeline } from "@/components/booking/CheckinTimeline";
import { ChatThread } from "@/components/booking/ChatThread";
import { PaymentPanel } from "@/components/booking/PaymentPanel";
import { ReviewForm } from "@/components/booking/ReviewForm";
import { StarIcon } from "@/components/icons";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/lib/bookings/labels";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

const TAMANO_LABEL: Record<string, string> = {
  chico: "Chico",
  mediano: "Mediano",
  grande: "Grande",
};

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser(`/reservas/${id}`);
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, owner_id, caregiver_id, pet_id, fecha_inicio, fecha_fin, estado, monto, motivo_cancelacion",
    )
    .eq("id", id)
    .maybeSingle();

  if (
    !booking ||
    (booking.owner_id !== user.id && booking.caregiver_id !== user.id)
  ) {
    notFound();
  }

  const isOwner = booking.owner_id === user.id;
  const isCaregiver = !isOwner;
  const otherPartyId = isOwner ? booking.caregiver_id : booking.owner_id;

  const [
    { data: pet },
    { data: otherParty },
    { data: payment },
    { data: checkins },
    { data: simulacionSetting },
    { data: miReview },
    { data: suReview },
  ] = await Promise.all([
    supabase
      .from("pets")
      .select(
        "nombre, especie, tamano, edad, temperamento, necesidades_medicas, fotos",
      )
      .eq("id", booking.pet_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("nombre, email")
      .eq("id", otherPartyId)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("estado, comision_pimi, fecha_liberacion, liberado_at")
      .eq("booking_id", booking.id)
      .maybeSingle(),
    supabase
      .from("booking_checkins")
      .select("id, tipo, foto, lat, lng, comentario, created_at")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "payments_simulation_mode")
      .maybeSingle(),
    // Mi propia reseña de esta reserva (si la dejé) — siempre visible para
    // mí, sin importar el doble-ciego (ver migración 0025).
    supabase
      .from("reviews")
      .select("puntaje, comentario")
      .eq("booking_id", booking.id)
      .eq("autor_id", user.id)
      .maybeSingle(),
    // La reseña de la otra parte — "reviews_publicas" solo la deja ver
    // acá si ya se reveló (ambos calificaron, o pasaron 14 días).
    supabase
      .from("reviews_publicas")
      .select("puntaje, comentario")
      .eq("booking_id", booking.id)
      .eq("autor_id", otherPartyId)
      .maybeSingle(),
  ]);

  const backHref = isOwner ? "/reservas" : "/cuidador";
  const otherPartyName = otherParty?.nombre || otherParty?.email || "—";
  const petPhoto = pet?.fotos?.[0];
  const simulationMode = Boolean(
    (simulacionSetting?.value as { enabled?: boolean } | null)?.enabled,
  );

  // Reputación del dueño como dueño (no como participante genérico), solo
  // hace falta calcularla cuando el cuidador todavía tiene que decidir si
  // acepta la solicitud — le da contexto antes de comprometerse, igual
  // que en Airbnb el anfitrión ve la reputación del huésped.
  let reputacionDueno: { promedio: number; cantidad: number } | null = null;
  if (isCaregiver && booking.estado === "solicitado") {
    const { data: reseñasDueno } = await supabase
      .from("reviews_publicas")
      .select("puntaje")
      .eq("destinatario_id", booking.owner_id);

    if (reseñasDueno && reseñasDueno.length > 0) {
      const suma = reseñasDueno.reduce((acc, r) => acc + r.puntaje, 0);
      reputacionDueno = {
        promedio: suma / reseñasDueno.length,
        cantidad: reseñasDueno.length,
      };
    }
  }

  // Fecha de hoy en Córdoba (no UTC del server) en formato YYYY-MM-DD, igual
  // que fecha_fin (columna "date" en la DB) — comparables como string porque
  // ambas son ISO. Esto es lo que evita que la salida se pueda marcar el
  // mismo día que la llegada.
  const hoyCordoba = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
  }).format(new Date());
  const puedeMarcarSalidaHoy = hoyCordoba >= booking.fecha_fin;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <a
        href={backHref}
        className="text-sm font-medium text-foreground/60 hover:text-foreground"
      >
        ← Volver
      </a>

      <h1 className="mt-4 text-2xl font-bold">
        {pet?.nombre ?? "Mascota"} · {isOwner ? "con" : "de"} {otherPartyName}
      </h1>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-foreground/60">
        <span>
          {booking.fecha_inicio} → {booking.fecha_fin} · ${booking.monto}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            ESTADO_COLOR[booking.estado] ?? "bg-foreground/10"
          }`}
        >
          {ESTADO_LABEL[booking.estado] ?? booking.estado}
        </span>
      </div>

      {isCaregiver &&
        booking.estado === "cancelado" &&
        booking.motivo_cancelacion === "otro_cuidador_elegido" && (
          <div className="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
            <p className="font-semibold">El dueño eligió a otro cuidador</p>
            <p className="mt-1 text-sm text-foreground/60">
              Para estas fechas avanzó con otra persona — no hiciste nada
              mal, a veces pasa. Seguí atento a nuevas solicitudes.
            </p>
          </div>
        )}

      {isCaregiver && booking.estado === "solicitado" && (
        <>
          <p className="mt-4 text-sm text-foreground/60">
            {reputacionDueno ? (
              <>
                {otherPartyName} tiene{" "}
                <span className="font-semibold text-foreground">
                  ★ {reputacionDueno.promedio.toFixed(1)}
                </span>{" "}
                ({reputacionDueno.cantidad} reseña
                {reputacionDueno.cantidad === 1 ? "" : "s"}) como dueño en
                Pimi.
              </>
            ) : (
              `${otherPartyName} todavía no tiene reseñas como dueño en Pimi.`
            )}
          </p>
          <BookingActions bookingId={booking.id} />
        </>
      )}

      <Suspense fallback={null}>
        <PaymentPanel
          bookingId={booking.id}
          bookingEstado={booking.estado}
          monto={Number(booking.monto)}
          isOwner={isOwner}
          payment={payment}
          simulationMode={simulationMode}
        />
      </Suspense>

      {pet && (
        <div className="mt-6 rounded-2xl border border-foreground/10 p-5">
          <p className="font-semibold">Sobre {pet.nombre}</p>

          <div className="mt-3 flex gap-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
              {petPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={petPhoto}
                  alt={pet.nombre}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">
                  🐾
                </div>
              )}
            </div>

            <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-foreground/50">Especie</dt>
                <dd className="font-medium capitalize">{pet.especie}</dd>
              </div>
              <div>
                <dt className="text-foreground/50">Tamaño</dt>
                <dd className="font-medium">
                  {pet.tamano ? (TAMANO_LABEL[pet.tamano] ?? pet.tamano) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-foreground/50">Edad</dt>
                <dd className="font-medium">
                  {pet.edad ? `${pet.edad} años` : "—"}
                </dd>
              </div>
              {pet.temperamento && (
                <div>
                  <dt className="text-foreground/50">Temperamento</dt>
                  <dd className="font-medium">{pet.temperamento}</dd>
                </div>
              )}
            </dl>
          </div>

          {pet.necesidades_medicas && (
            <p className="mt-3 text-sm text-foreground/70">
              <span className="font-medium">Necesidades médicas:</span>{" "}
              {pet.necesidades_medicas}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-foreground/10 p-5">
        <p className="font-semibold">Seguimiento del cuidado</p>
        <p className="mt-1 text-xs text-foreground/50">
          Foto y ubicación al llegar, fotos diarias durante la estadía, y
          foto al entregar la mascota — así el dueño puede seguir el cuidado
          de cerca.
        </p>

        {isCaregiver && booking.estado === "aceptado" && (
          <>
            {payment?.estado === "retenido" ? (
              <CheckinForm bookingId={booking.id} tipo="llegada" />
            ) : (
              <p className="mt-3 text-sm text-foreground/60">
                Esperando que se confirme el pago para poder marcar la
                llegada.
              </p>
            )}
          </>
        )}

        {isCaregiver && booking.estado === "en_curso" && (
          <>
            <CheckinForm bookingId={booking.id} tipo="diario" />
            <CheckinSalidaGate
              bookingId={booking.id}
              fechaFin={booking.fecha_fin}
              puedeMarcarHoy={puedeMarcarSalidaHoy}
            />
          </>
        )}

        <CheckinTimeline checkins={checkins ?? []} />
      </div>

      <div className="mt-6 rounded-2xl border border-foreground/10 p-5">
        <p className="font-semibold">Chat</p>
        <p className="mt-1 text-xs text-foreground/50">
          Coordiná los detalles del cuidado acá (comida, horarios, cuidados
          especiales). Por tu seguridad, evitá compartir datos de contacto o
          acordar pagos fuera de Pimi — el pago protegido y la garantía solo
          aplican dentro de la app.
        </p>
        <ChatThread bookingId={booking.id} currentUserId={user.id} />
      </div>

      {booking.estado === "completado" && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Reseña</h2>

          {miReview ? (
            <div className="mt-3 rounded-2xl border border-foreground/10 p-5">
              <p className="text-sm font-medium">Tu reseña</p>
              <div className="mt-1 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((v) => (
                  <StarIcon
                    key={v}
                    className={`h-4 w-4 ${
                      v <= miReview.puntaje
                        ? "text-brand"
                        : "text-foreground/15"
                    }`}
                  />
                ))}
              </div>
              {miReview.comentario && (
                <p className="mt-2 text-sm text-foreground/70">
                  {miReview.comentario}
                </p>
              )}

              {suReview ? (
                <div className="mt-4 border-t border-foreground/10 pt-4">
                  <p className="text-sm font-medium">
                    Reseña de {otherPartyName}
                  </p>
                  <div className="mt-1 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <StarIcon
                        key={v}
                        className={`h-4 w-4 ${
                          v <= suReview.puntaje
                            ? "text-brand"
                            : "text-foreground/15"
                        }`}
                      />
                    ))}
                  </div>
                  {suReview.comentario && (
                    <p className="mt-2 text-sm text-foreground/70">
                      {suReview.comentario}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-xs text-foreground/50">
                  Todavía no se reveló la reseña de {otherPartyName} — se
                  muestra cuando la deje, o en un par de semanas.
                </p>
              )}
            </div>
          ) : (
            <ReviewForm
              bookingId={booking.id}
              nombreDestinatario={otherPartyName}
            />
          )}
        </div>
      )}
    </div>
  );
}
