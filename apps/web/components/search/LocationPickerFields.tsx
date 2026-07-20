"use client";

import { useState } from "react";

/**
 * Campos de "buscar cerca de..." para /buscar-cuidador. Es un componente
 * cliente porque necesita geolocalización del navegador y llamar a
 * /api/geocode, pero el resultado (lat/lng) viaja como inputs hidden
 * dentro del <form method="get"> del server component — así la búsqueda
 * en sí sigue siendo una navegación normal por query params, no fetch
 * desde el cliente.
 */
export function LocationPickerFields({
  defaultLat,
  defaultLng,
}: {
  defaultLat?: string;
  defaultLng?: string;
}) {
  const [lat, setLat] = useState(defaultLat ?? "");
  const [lng, setLng] = useState(defaultLng ?? "");
  const [direccion, setDireccion] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function buscarDireccion() {
    if (!direccion.trim()) {
      setStatus("Escribí una dirección primero.");
      return;
    }
    setBuscando(true);
    setStatus(null);

    const res = await fetch(`/api/geocode?q=${encodeURIComponent(direccion)}`);
    const data = (await res.json().catch(() => null)) as
      | { lat: number; lng: number; direccionEncontrada?: string; error?: string }
      | null;

    setBuscando(false);

    if (!res.ok || !data || typeof data.lat !== "number") {
      setStatus(data?.error ?? "No pudimos encontrar esa dirección.");
      return;
    }

    setLat(String(data.lat));
    setLng(String(data.lng));
    setStatus(`Ubicación cargada: ${data.direccionEncontrada ?? direccion}`);
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setStatus("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocating(true);
    setStatus(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setStatus("Usando tu ubicación actual.");
        setLocating(false);
      },
      () => {
        setStatus(
          "No pudimos obtener tu ubicación. Activá el permiso o buscá tu dirección arriba.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="sm:col-span-2">
      <label className="text-sm font-medium" htmlFor="direccion_busqueda">
        Buscar cerca de...
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        <input
          id="direccion_busqueda"
          type="text"
          value={direccion}
          onChange={(event) => setDireccion(event.target.value)}
          placeholder="Tu dirección, ej. Av. Colón 500"
          className="min-w-[200px] flex-1 rounded-lg border border-foreground/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={buscarDireccion}
          disabled={buscando}
          className="rounded-lg border border-foreground/20 px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:opacity-60"
        >
          {buscando ? "Buscando..." : "Buscar"}
        </button>
        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={locating}
          className="rounded-lg border border-foreground/20 px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:opacity-60"
        >
          {locating ? "Ubicando..." : "📍 Usar mi ubicación"}
        </button>
      </div>
      {status && <p className="mt-1 text-xs text-foreground/60">{status}</p>}
      {lat && lng && (
        <p className="mt-1 text-xs text-accent">
          Vamos a mostrar cuidadores dentro del radio elegido, centrado acá.
        </p>
      )}
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
    </div>
  );
}
