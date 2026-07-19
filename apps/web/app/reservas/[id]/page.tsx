import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookingActions } from "@/components/booking/BookingActions";
import { CheckinForm } from "@/components/booking/CheckinForm";
import { CheckinTimeline } from "@/components/booking/CheckinTimeline";
import { ChatThread } from "@/components/booking/ChatThread";
import { PaymentPanel } from "@/components/booking/PaymentPanel";
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
      "id, owner_id, caregiver_id, pet_id, fecha_inicio, fecha_fin, estado, monto",
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
  ]);

  const backHref = isOwner ? "/reservas" : "/cuidador";
  const otherPartyName = otherParty?.nombre || otherParty?.email || "—";
  const petPhoto = pet?.fotos?.[0];
  const simulationMode = Boolean(
    (simulacionSetting?.value as { enabled?: boolean } | null)?.enabled,
  );

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

      {isCaregiver && booking.estado === "solicitado" && (
        <BookingActions bookingId={booking.id} />
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
            <CheckinForm bookingId={booking.id} tipo="salida" />
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
    </div>
  );
}
