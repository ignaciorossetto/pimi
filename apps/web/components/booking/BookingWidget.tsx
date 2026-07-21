"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Pet = { id: string; nombre: string };

function nightsBetween(desde: string, hasta: string): number {
  if (!desde || !hasta) return 0;
  const ms = new Date(hasta).getTime() - new Date(desde).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function BookingWidget({
  caregiverId,
  tarifaBase,
  pets,
  defaultMascota,
  defaultDesde,
  defaultHasta,
}: {
  caregiverId: string;
  tarifaBase: number;
  pets: Pet[];
  defaultMascota?: string;
  defaultDesde?: string;
  defaultHasta?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState(defaultDesde ?? "");
  const [hasta, setHasta] = useState(defaultHasta ?? "");

  if (pets.length === 0) {
    return (
      <div className="mt-4">
        <p className="text-sm text-foreground/60">
          Todavía no tenés mascotas cargadas.
        </p>
        <a
          href="/mascotas"
          className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Agregar mascota
        </a>
      </div>
    );
  }

  const nights = nightsBetween(desde, hasta);
  const estimatedTotal = nights * tarifaBase;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const petId = String(formData.get("mascota") ?? "");
    const fechaInicio = String(formData.get("desde") ?? "");
    const fechaFin = String(formData.get("hasta") ?? "");

    if (!petId || !fechaInicio || !fechaFin) {
      setError("Completá mascota y fechas.");
      return;
    }
    if (fechaFin < fechaInicio) {
      setError("La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró, volvé a iniciar sesión.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("bookings").insert({
      owner_id: user.id,
      caregiver_id: caregiverId,
      pet_id: petId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      monto: nightsBetween(fechaInicio, fechaFin) * tarifaBase,
    });

    if (insertError) {
      setError(
        insertError.message.includes("ya tiene un cuidado confirmado")
          ? insertError.message
          : "No pudimos crear la reserva. Probá de nuevo.",
      );
      setLoading(false);
      return;
    }

    router.push("/reservas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium" htmlFor="mascota">
            Mascota
          </label>
          <select
            id="mascota"
            name="mascota"
            defaultValue={defaultMascota || pets[0]?.id}
            required
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="desde">
            Desde
          </label>
          <input
            id="desde"
            name="desde"
            type="date"
            required
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
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
            required
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
            className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {nights > 0 && (
        <p className="text-sm text-foreground/60">
          {nights} noche{nights > 1 ? "s" : ""} · estimado{" "}
          <span className="font-semibold text-foreground">
            ${estimatedTotal}
          </span>{" "}
          (se confirma cuando el cuidador acepta)
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Solicitar reserva"}
      </button>
    </form>
  );
}
