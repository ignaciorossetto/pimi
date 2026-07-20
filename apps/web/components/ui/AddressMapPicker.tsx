"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Map as LeafletMapType,
  Marker as LeafletMarkerType,
  LeafletMouseEvent,
} from "leaflet";
import "leaflet/dist/leaflet.css";

const CORDOBA_CENTER: [number, number] = [-31.4201, -64.1888];

/**
 * Mapa para que el cuidador confirme (o corrija a mano) su ubicación
 * aproximada. Flujo: escribe la dirección en el form de arriba, toca
 * "Ubicar esta dirección", el pin se centra ahí solo (vía /api/geocode,
 * que pega a Nominatim/OSM); si el resultado está mal o la dirección es
 * informal y no la encuentra, puede arrastrar el pin o tocar el mapa para
 * corregirlo a mano.
 *
 * Ojo: esto es la ubicación REAL que después se difumina en el servidor
 * (ver migración 0018) antes de mostrarse a ningún dueño — nunca se
 * expone tal cual.
 *
 * Leaflet se importa dinámicamente adentro de useEffect porque toca
 * `window`/`document` al cargarse, lo cual rompe el server-side rendering
 * de Next si se importa de forma estática.
 */
export function AddressMapPicker({
  direccionTexto,
  lat: latInicial,
  lng: lngInicial,
  onChange,
}: {
  direccionTexto: string;
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapType | null>(null);
  const markerRef = useRef<LeafletMarkerType | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ubicado, setUbicado] = useState(Boolean(latInicial && lngInicial));

  useEffect(() => {
    let cancelado = false;

    async function initMap() {
      const L = (await import("leaflet")).default;
      if (cancelado || !mapDivRef.current || mapRef.current) return;

      // Fix conocido de Leaflet + bundlers (webpack/Next): las rutas
      // relativas a los íconos del marker por defecto no resuelven bien.
      // Se reemplazan por los mismos assets servidos desde un CDN.
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const centro: [number, number] =
        latInicial && lngInicial ? [latInicial, lngInicial] : CORDOBA_CENTER;

      const map = L.map(mapDivRef.current).setView(centro, latInicial ? 16 : 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(centro, { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange(pos.lat, pos.lng);
        setUbicado(true);
      });

      map.on("click", (event: LeafletMouseEvent) => {
        marker.setLatLng(event.latlng);
        onChange(event.latlng.lat, event.latlng.lng);
        setUbicado(true);
      });

      mapRef.current = map;
      markerRef.current = marker;
    }

    initMap();

    return () => {
      cancelado = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Solo se inicializa una vez — mover el pin después es manual (drag /
    // click) o vía buscarDireccion, no queremos reinicializar el mapa
    // cada vez que cambia el texto de la dirección mientras se tipea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buscarDireccion() {
    if (!direccionTexto.trim()) {
      setError("Completá calle, número y barrio primero.");
      return;
    }
    setBuscando(true);
    setError(null);

    const res = await fetch(`/api/geocode?q=${encodeURIComponent(direccionTexto)}`);
    const data = (await res.json().catch(() => null)) as
      | { lat: number; lng: number; error?: string }
      | null;

    setBuscando(false);

    if (!res.ok || !data || typeof data.lat !== "number") {
      setError(
        data?.error ?? "No pudimos encontrar esa dirección. Ubicá el pin a mano.",
      );
      return;
    }

    if (mapRef.current && markerRef.current) {
      const L = (await import("leaflet")).default;
      const pos = L.latLng(data.lat, data.lng);
      mapRef.current.setView(pos, 16);
      markerRef.current.setLatLng(pos);
    }
    onChange(data.lat, data.lng);
    setUbicado(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={buscarDireccion}
          disabled={buscando}
          className="rounded-lg border border-foreground/20 px-3 py-2 text-xs font-medium transition hover:bg-foreground/5 disabled:opacity-60"
        >
          {buscando ? "Buscando..." : "📍 Ubicar esta dirección en el mapa"}
        </button>
        {ubicado && (
          <span className="text-xs text-accent">
            Ubicación cargada — arrastrá el pin si no quedó exacta.
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-foreground/50">
        También podés tocar el mapa o arrastrar el pin directamente. No hace
        falta que sea exacto: a los dueños solo les mostramos un área
        aproximada, nunca tu dirección exacta.
      </p>
      <div
        ref={mapDivRef}
        className="mt-2 h-56 w-full overflow-hidden rounded-xl border border-foreground/15"
      />
    </div>
  );
}
